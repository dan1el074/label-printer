import { app, Menu, ipcMain, dialog } from 'electron';
import { Window } from '../app/models/Window';
import { log, getSpan } from '../app/services/logService';
import { getPrinters } from '../app/services/printerService';
import { createLabel, openFile } from '../app/services/pdfService';
import { getFoccoItem, getFoccoSale } from '../app/services/foccoService';
import { randomUUID } from 'crypto';
import * as path from 'path';
import fs = require('fs/promises');

export class Application {
    private data: Data;
    private configData: ConfigData;
    private window: Window;
    private running: boolean = false;

    constructor() {
        this.data = {
            printerList: [],
            modelList: [],
            temporaryPath: path.join(__dirname, "../resources/temp/"),
            selectModel: null
        };

        let options: Array<string> = [
            'app/minimize',
            'app/close',
            'action/showDialog',
            'action/addNewModel',
            'action/reset',
            'action/getConfigInput',
            'action/setModel',
            'app/start'
        ];

        options.forEach((option: string): void => {
            this.actionFromFrontend(option);
        });

        this.hideMenu();
    }

    public async init() {
        await this.copyFileIfNotExists();
        await this.readConfigFile();
        await this.createResultPath();
        await app.whenReady().then(async () => {
            this.window = new Window(this.configData.dev);
            await this.window.loadIndex();
            this.actionFromBackend('app/setTitle', this.configData.version);
        });

        await this.getPrintModels();
        await this.getPrinters();
    }

    private async copyFileIfNotExists(): Promise<void> {
        const appPath = path.join(process.env.APPDATA, 'ImprimeEtiqueta');
        await fs.mkdir(path.join(appPath, 'temp'), { recursive: true });
        await fs.mkdir(path.join(appPath, 'logs'), { recursive: true });
    }

    private async readConfigFile(): Promise<void> {
        try {
            const configPath = path.join(__dirname, '../config.json');
            const data = await fs.readFile(configPath, 'utf8');
            const configData = JSON.parse(data);
            this.configData = {
                dev: configData.dev,
                version: configData.version,
                tmpPath: configData.tmpPath,
                foccoErpKey: configData.foccoErpKey,
                foccoErpBearerToken: configData.foccoErpBearerToken,
            };

            let message = `Arquivo de configuração: {${getSpan()}    dev: ${configData.dev},${getSpan()}    version: ${configData.version},${getSpan()}}`;
            log(message);
        } catch (error) {
            console.error('Erro ao ler o arquivo de configuração:', error);
            throw error;
        }
    }

    private async createResultPath(): Promise<void> {
        this.data.temporaryPath = this.configData.tmpPath || path.join(process.env.APPDATA, 'ImprimeEtiqueta', 'temp');
        await fs.mkdir(this.data.temporaryPath, { recursive: true });
    }

    private async getPrintModels(): Promise<void> {
        try {
            const modelsPath = path.join(__dirname, '../resources/models');
            const files = await fs.readdir(modelsPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            log(`Modelos de impressão encontrados:${jsonFiles}`);

            this.data.modelList = await Promise.all(
                jsonFiles.map(async file => {
                    const filePath = path.join(modelsPath, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    return JSON.parse(content);
                })
            );

            this.data.modelList.sort((first, second) => first.title.localeCompare(second.title, 'pt-BR', {
                sensitivity: 'base',
                numeric: true
            }));
            const modelsName = this.data.modelList.map(currentModel => currentModel.title);

            this.actionFromBackend('set/models', modelsName);
        } catch (error) {
            console.error('Erro ao encontrar a pasta de modelos:', error);
        }
    }

    private async getPrinters(): Promise<void> {
        try {
            const printers = await getPrinters(this.window.mainWindow.webContents);

            this.data.printerList = printers;
            const NameOfPrinters = this.data.printerList.map(
                (printer) => ' ' + printer.name,
            );
            log(`Impressoras encontradas:${NameOfPrinters}`);

            let printerNames: Array<string> = [];
            this.data.printerList.forEach((printer: Printable): void => {
                printerNames.push(printer.name);
            });

            this.actionFromBackend('set/printers', printerNames);
        } catch (error) {
            log(error);
            this.actionFromBackend('message/breakError', 'Não foi possível consultar as impressoras disponíveis.');
        }
    }

    private resetApplication(): void {
        this.data.selectModel = null;
        this.actionFromBackend('action/reset');
    }

    private actionFromFrontend(route: string) {
        switch (route) {
            case 'app/minimize': {
                ipcMain.on(route, () => {
                    this.window.mainWindow.minimize();
                });
                break;
            }
            case 'app/close': {
                ipcMain.on(route, () => {
                    app.quit();
                });
                break;
            }
            case 'action/showDialog': {
                ipcMain.on(route, () => {
                    void this.runOperation(async () => {
                        try {
                            const result = await this.getPath();
                            if (result) {
                                this.data.newModelPath = result[0];
                                this.data.newModelFileName = result[1];
                                this.actionFromBackend('set/fileName', result[1]);
                            }
                        } finally {
                            this.actionFromBackend('action/closeDialog');
                        }
                    });
                });
                break;
            }
            case 'action/addNewModel': {
                ipcMain.on(route, () => {
                    void this.runOperation(async () => {
                        if (!await this.verifyNewModel(this.data.newModelPath)) {
                            this.resetApplication();
                            return;
                        }
                        const newFile = path.join(__dirname, '../resources/models', 'custom-model-' + randomUUID() + '.json');
                        await fs.copyFile(this.data.newModelPath, newFile);
                        await this.getPrintModels();
                        await this.setModelPrintByFilePath(newFile);
                        this.actionFromBackend('set/printModel', this.data.selectModel.title);
                        await this.getConfigInput(this.data.selectModel.title);
                        this.actionFromBackend('message/success', 'Modelo adicionado com sucesso!');
                    });
                });
                break;
            }
            case 'action/getConfigInput': {
                ipcMain.on(route, (_event, modelTitle: string) => {
                    void this.runOperation(() => this.getConfigInput(modelTitle));
                });
                break;
            }
            case 'action/reset': {
                ipcMain.on(route, () => {
                    if (this.running) return;
                    this.resetApplication();
                });
                break;
            }
            case 'action/setModel': {
                ipcMain.on(route, (_event, newModel: PrintModel) => {
                    if (this.running) return;
                    this.data.selectModel = newModel;
                });
                break;
            }
            case 'app/start': {
                ipcMain.on(route, (_event, data: Array<string>) => {
                    void this.start(data[0], Number(data[1]));
                });
                break;
            }
        }
    }

    private async runOperation(operation: () => Promise<void>): Promise<void> {
        if (this.running) return;
        this.running = true;
        this.actionFromBackend('app/setBusy', true);
        try {
            await operation();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log(message);
            this.actionFromBackend('message/error', message);
        } finally {
            this.running = false;
            this.actionFromBackend('app/setBusy', false);
        }
    }

    private async verifyNewModel(newFile: string): Promise<boolean> {
        const content: PrintModel = JSON.parse(await fs.readFile(newFile, 'utf-8'));
        if (!content.title || !Array.isArray(content.variables) || !Array.isArray(content.body)) {
            throw new Error('Modelo de impressão inválido.');
        }
        if (this.data.modelList.some(model => model.title === content.title)) {
            this.actionFromBackend('message/error', 'Já existe um modelo com esse mesmo título!');
            return false;
        }
        return true;
    }

    private async setModelPrintByFilePath(filePath: string): Promise<void> {
        this.data.selectModel = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    }

    private async getConfigInput(modelTitle: string): Promise<void> {
        const model = this.data.modelList.find(item => item.title === modelTitle);
        if (!model) throw new Error('Selecione um modelo de impressão válido.');
        this.data.selectModel = JSON.parse(JSON.stringify(model));
        this.actionFromBackend('set/modelConfig', this.data.selectModel);
    }

    private actionFromBackend(route: string, message?: string | PrintModel | Array<string> | boolean): void {
        if (message !== undefined) {
            this.window.mainWindow.webContents.send(route, message);
            return;
        }
        this.window.mainWindow.webContents.send(route);
    }

    private hideMenu() {
        const menuTemplate: any = [];
        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);
    }

    private async getPath(): Promise<Array<string> | undefined> {
        const result = await dialog.showOpenDialog({
            defaultPath: app.getPath('desktop'),
            title: 'Selecione o arquivo:',
            buttonLabel: 'Selecionar',
            filters: [{ name: 'Modelo JSON', extensions: ['json'] }]
        });
        if (result.canceled || !result.filePaths.length) return;
        return [result.filePaths[0], path.basename(result.filePaths[0])];
    }

    private async start(printer: string, copyNumber: number): Promise<void> {
        await this.runOperation(async () => {
            const selectedPrinter = this.data.printerList.find(item => item.name === printer);
            if (!selectedPrinter) throw new Error('Selecione uma impressora válida.');
            if (!this.data.selectModel) throw new Error('Selecione um modelo de impressão.');
            if (!Number.isInteger(copyNumber) || copyNumber < 1 || copyNumber > 9999) {
                throw new Error('Informe uma quantidade de cópias entre 1 e 9999.');
            }
            const model: PrintModel = JSON.parse(JSON.stringify(this.data.selectModel));
            try {
                if (model.source === 'foccoerp-venda') {
                    const orderNumber = model.variables.find(variable => variable.name === 'pedido')?.value?.[0];
                    const sale = await getFoccoSale(orderNumber, this.configData.foccoErpKey, this.configData.foccoErpBearerToken);
                    model.variables = model.variables.filter(variable => !['cliente', 'destino'].includes(variable.name));
                    model.variables.push(
                        { name: 'cliente', value: [sale.cliente] },
                        { name: 'destino', value: [sale.cidade] }
                    );
                }
                if (model.source === 'foccoerp') {
                    const itemCode = model.variables.find(variable => variable.name === 'cod_item')?.value?.[0];
                    const item = await getFoccoItem(itemCode, this.configData.foccoErpKey, this.configData.foccoErpBearerToken);
                    model.variables.push(
                        { name: 'desc_tecnica', value: [item.desc_tecnica] },
                        { name: 'cod_barra', value: [item.cod_barra] }
                    );
                }
            } catch (error) {
                // Preserve the entered variables so the user can correct them and retry.
                this.actionFromBackend('action/showConfig');
                throw error;
            }
            const filePath = path.join(this.data.temporaryPath, 'temp_' + randomUUID() + '.pdf');
            await createLabel(model, filePath, copyNumber);
            if (printer === 'Abrir arquivo') {
                await openFile(filePath);
                this.actionFromBackend('message/success', 'Arquivo gerado e aberto com sucesso!');
            } else {
                const orientation = model.options?.rotation === 90 && model.width * model.collumn <= model.height
                    ? 'portrait' : 'landscape';
                const result = await selectedPrinter.print(filePath, orientation);
                this.actionFromBackend('message/success', result);
            }
        });
    }
}
