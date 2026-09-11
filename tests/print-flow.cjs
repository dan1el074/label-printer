const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
function load(file, modules) {
    const exports = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist', file), 'utf8'), {
        exports, __dirname, require: name => { if (!(name in modules)) throw new Error('Unexpected dependency: ' + name); return modules[name]; },
        console, process, Error
    });
    return exports;
}
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
    const events = [], handlers = {}, jobs = [];
    const services = {
        createLabel: async (...args) => jobs.push(args), openFile: async () => {}, print: async () => 'OK',
        showOpenDialog: async () => ({ canceled: true, filePaths: [] }), readFile: async () => '{}'
    };
    const { Application } = load('core/Application.js', {
        electron: { app: { getPath: () => 'C:/teste' }, Menu: { buildFromTemplate() {}, setApplicationMenu() {} },
            ipcMain: { on: (route, handler) => handlers[route] = handler },
            dialog: { showOpenDialog: () => services.showOpenDialog() } },
        '../app/models/Window': {}, '../app/services/logService': { log() {}, getSpan: () => '' },
        '../app/services/printerService': {}, '../app/services/pdfService': {
            createLabel: (...args) => services.createLabel(...args), openFile: (...args) => services.openFile(...args)
        }, crypto, path, 'fs/promises': { readFile: (...args) => services.readFile(...args) }
    });
    const app = new Application();
    app.window = { mainWindow: { webContents: { send: (...args) => events.push(args) } } };
    app.data.selectModel = { title: 'Teste', width: 30, height: 20, collumn: 2, variables: [], body: [] };
    app.data.printerList = [{ name: 'Abrir arquivo' }, { name: 'HP', print: (...args) => services.print(...args) }];
    return { app, services, events, handlers, jobs };
}
test('bloqueia duplicatas e alterações até a impressão terminar', async () => {
    const { app, services, handlers, jobs, events } = setup();
    const pending = deferred(); services.print = () => pending.promise;
    const first = app.start('HP', 3); await flush();
    await app.start('HP', 1);
    handlers['action/reset'](); handlers['action/setModel']({}, { title: 'Outro' });
    assert.equal(app.data.selectModel.title, 'Teste'); assert.equal(jobs.length, 1); assert.equal(app.running, true);
    assert.deepEqual(events.filter(e => e[0] === 'app/setBusy'), [['app/setBusy', true]]);
    pending.resolve('OK'); await first;
    assert.equal(app.running, false); assert.deepEqual(events.at(-1), ['app/setBusy', false]);
    await app.start('HP', 1); assert.equal(jobs.length, 2);
    assert.notEqual(jobs[0][1], jobs[1][1]);
});
test('aguarda geração e abertura e usa uma cópia do modelo', async () => {
    const { app, services, jobs } = setup(); const generate = deferred(), open = deferred();
    services.createLabel = async (...args) => { jobs.push(args); await generate.promise; };
    services.openFile = () => open.promise;
    const operation = app.start('Abrir arquivo', 2);
    assert.equal(app.running, true); assert.notEqual(jobs[0][0], app.data.selectModel);
    generate.resolve(); await flush(); assert.equal(app.running, true);
    open.resolve(); await operation; assert.equal(app.running, false);
});
for (const stage of ['createLabel', 'openFile', 'print']) {
    test('libera controles após falha em ' + stage, async () => {
        const { app, services, events } = setup();
        services[stage] = async () => { throw new Error(stage); };
        await app.start(stage === 'print' ? 'HP' : 'Abrir arquivo', 1);
        assert.equal(app.running, false); assert.deepEqual(events.at(-1), ['app/setBusy', false]);
        assert.ok(events.some(e => e[0] === 'message/error' && e[1].includes(stage)));
    });
}
for (const copies of [0, -1, 1.5, NaN, 10000]) {
    test('rejeita quantidade inválida: ' + copies, async () => {
        const { app, jobs, events } = setup(); await app.start('HP', copies);
        assert.equal(jobs.length, 0); assert.equal(app.running, false);
        assert.ok(events.some(e => e[0] === 'message/error'));
    });
}
test('rejeita impressora inválida sem gerar PDF', async () => {
    const { app, jobs } = setup(); await app.start('Inexistente', 1);
    assert.equal(jobs.length, 0); assert.equal(app.running, false);
});
test('cancelamento de importar modelo e JSON inválido não deixam a aplicação travada', async () => {
    const { app, services, handlers, events } = setup();
    handlers['action/showDialog'](); await flush();
    assert.equal(app.running, false); assert.ok(events.some(e => e[0] === 'action/closeDialog'));
    services.readFile = async () => '{invalid'; handlers['action/addNewModel'](); await flush();
    assert.equal(app.running, false); assert.ok(events.some(e => e[0] === 'message/error'));
});
test('consulta nativa preserva nomes e impressão mantém paisagem e escala original', async () => {
    const calls = [];
    const { Printer } = load('app/models/Printer.js', {
        '../services/logService': { log() {} }, 'pdf-to-printer': { print: async (...args) => calls.push(args) }
    });
    const { getPrinters } = load('app/services/printerService.js', { '../models/Printer': { Printer } });
    const names = ["PCP d'Água & <Teste>", String.raw`\servidoretiquetas`];
    const list = await getPrinters({ getPrintersAsync: async () => names.map(name => ({ name, displayName: 'Diferente' })) });
    assert.deepEqual(Array.from(list, p => p.name), ['Abrir arquivo', ...names]);
    await list[1].print('label.pdf');
    assert.equal(calls[0][1].printer, names[0]); assert.equal(calls[0][1].orientation, 'landscape'); assert.equal(calls[0][1].scale, 'noscale');
    assert.equal((await getPrinters({ getPrintersAsync: async () => [] })).length, 1);
    await assert.rejects(getPrinters({ getPrintersAsync: async () => { throw new Error('spooler'); } }), /spooler/);
});
test('geração espera as fontes de todos os textos antes de salvar', async () => {
    let draws = 0, saved = false;
    const doc = {
        embedFont: async () => { await flush(); return { widthOfTextAtSize: () => 10 }; },
        addPage: () => ({ drawText() { assert.equal(saved, false); draws++; } }),
        save: async () => { assert.equal(draws, 3); saved = true; return Buffer.from('PDF'); }
    };
    const { createLabel, openFile } = load('app/services/pdfService.js', {
        'pdf-lib': { PDFDocument: { create: async () => doc }, StandardFonts: { HelveticaBold: 'bold' }, rgb() {} },
        fs: { writeFileSync() {} }, '../../app/services/logService': { log() {} },
        electron: { shell: { openPath: async () => 'Falha de abertura' } }
    });
    await createLabel({ width: 30, height: 20, collumn: 2, variables: [], body: [{ type: 'text', value: 'Teste', options: { bold: true } }] }, 'label.pdf', 3);
    assert.equal(saved, true);
    await assert.rejects(openFile('label.pdf'), /Falha de abertura/);
});

test('interface bloqueia clique duplo, navegação e campos e restaura controles', () => {
    const elements = new Map(), listeners = {}, sent = [];
    function element(id) {
        id = id.replace(/^#/, '');
        if (!elements.has(id)) elements.set(id, {
            value: id === 'copy-input' ? '1' : 'HP', style: {}, handlers: {}, disabled: false,
            innerHTML: '', children: [], label: { textContent: 'Imprimir' },
            addEventListener(event, handler) { this.handlers[event] = handler; },
            querySelector() { return this.label; }, reportValidity: () => true,
            appendChild(child) { this.children.push(child); }, blur() {}
        });
        return elements.get(id);
    }
    const context = vm.createContext({
        document: { getElementById: element, querySelector: element, createElement: () => ({}),
            querySelectorAll: () => Array.from(elements.values()), body: { setAttribute() {} } },
        ipcRenderer: { on: (route, handler) => listeners[route] = handler, send: (...args) => sent.push(args) }
    });
    for (const file of ['app', 'actions']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/ui/' + file + '.js'), 'utf8'), context);
    const button = element('print-btn');
    button.handlers.click(); button.handlers.click(); element('previous-config-btn').handlers.click();
    assert.equal(sent.length, 1); assert.equal(button.disabled, true);
    assert.equal(element('previous-config-btn').disabled, true); assert.equal(element('copy-input').disabled, true);
    assert.equal(element('printers-select').disabled, true); assert.equal(button.label.textContent, 'Processando...');
    assert.notEqual(element('.print-page').style.transform, 'translateX(100%)');
    listeners['app/setBusy']({}, false);
    assert.equal(button.disabled, false); assert.equal(button.label.textContent, 'Imprimir');
    button.handlers.click(); assert.equal(sent.length, 2);
    const name = "PCP d'Água & <Teste>";
    listeners['set/printers']({}, [name]);
    assert.equal(element('printers-select').children[0].value, name);
    assert.equal(element('printers-select').children[0].textContent, name);
});

test('gera PDFs com todos os modelos incluídos e a quantidade esperada de páginas', async () => {
    const pdfLib = require('pdf-lib');
    const { createLabel } = load('app/services/pdfService.js', {
        // As dimensões vêm de outro contexto do VM; normalize o Array para a biblioteca real.
        'pdf-lib': { ...pdfLib, PDFDocument: { create: async () => {
            const doc = await pdfLib.PDFDocument.create();
            const addPage = doc.addPage.bind(doc);
            doc.addPage = dimensions => addPage(Array.from(dimensions));
            return doc;
        } } }, fs, '../../app/services/logService': { log() {} }, electron: { shell: {} }
    });
    const modelsPath = path.join(__dirname, '../src/resources/models');
    const outputPath = path.join(__dirname, '../dist/test-output');
    fs.mkdirSync(outputPath, { recursive: true });
    for (const name of fs.readdirSync(modelsPath).filter(name => name.endsWith('.json'))) {
        const model = JSON.parse(fs.readFileSync(path.join(modelsPath, name), 'utf8'));
        model.variables.forEach(variable => variable.value = [variable.template || 'Teste']);
        const file = path.join(outputPath, name + '.pdf');
        await createLabel(model, file, 3);
        const pdf = await pdfLib.PDFDocument.load(fs.readFileSync(file));
        assert.equal(pdf.getPageCount(), Math.ceil(3 / model.collumn), name);
    }
});
