const windowTitle: HTMLElement = document.getElementById("window-title");
const appTitle: HTMLElement = document.getElementById("app-title");
const inputSearch: HTMLElement = document.querySelector('.input-search');
const placeholder: HTMLElement = document.getElementById('placeholder');
const newPlaceholder: HTMLElement = document.getElementById('new-placeholder');
const printModelError: HTMLElement = document.getElementById('print-model-error');
const printModelSelect: HTMLSelectElement = document.getElementById('print-model-select') as HTMLSelectElement;
// const printersSelect: HTMLElement = document.getElementById('printers-select');
// const alertContainer: HTMLElement = document.querySelector('.alert-container');
// const printBtn: HTMLElement = document.getElementById('print-btn');
let showDialog: boolean = false;

function sendToBackend(route: string, data?: any) {
    if(data) {
        ipcRenderer.send(route, data);
        return
    }
    ipcRenderer.send(route);
}

// mandando att para o backend
inputSearch.addEventListener('click', () => {
    if (!showDialog) {
        sendToBackend('action/showDialog');
        showDialog = true;
    }
});

// printBtn.addEventListener('click', () => {
//     const chosenPrinter: HTMLSelectElement = document.querySelector('#printers-select');
//     sendToBackend('app/start', chosenPrinter.value);
//     printBtn.style.backgroundColor = '#00E500';
//     printBtn.style.transition = '1s';
// });

// saveDetAndPrint.addEventListener('click', () => {
//     const detValue: HTMLSelectElement = document.querySelector('#input-det')
//     const printer: HTMLSelectElement = document.querySelector('#printers-select');
//     sendToBackend('action/saveDETs', [detValue.value, printer.value]);
//     detValue.value = '';
// })

// recebendo att do backend
ipcRenderer.on('app/setTitle', (_event: any, version: string): void => {
    appTitle.innerHTML += " " + version;
    windowTitle.innerHTML += " " + version;
});

ipcRenderer.on('action/closeDialog', (): void => {
    showDialog = false;
});

ipcRenderer.on('set/fileName', (_event: any, data: string): void => {
    placeholder.style.display = 'none';
    newPlaceholder.style.display = 'inline';
    newPlaceholder.innerHTML = data;
    printModelSelect.value = "none";
    printModelError.style.display = 'none';
    showDialog = false;
});

// ipcRenderer.on('set/printers', (_event: any, data: Array<string>): void => {
//     data.forEach((printer: string): void => {
//         printersSelect.innerHTML += `<option value='${printer}'>${printer}</option>`;
//     });
// });

ipcRenderer.on('set/models', (_event: any, data: Array<string>): void => {
    printModelSelect.innerHTML = "<option class='hidden' value='none' disabled selected>Selecione</option>";
    data.forEach((modelName: string): void => {
        printModelSelect.innerHTML += `<option value='${modelName}'>${modelName}</option>`;
    });
});

// ipcRenderer.on('action/showDetPage', (_event: any, fileDET: string): void => {
//     const detValue = document.getElementById('detValue');
//     detValue.innerText = fileDET.split('.')[0];
//     detPage.style.transform = 'translateX(-100%)';
//     detInput.focus();
// });

// ipcRenderer.on('action/restart', (_event: any, fileDET: string): void => {
//     alertContainer.innerHTML = '';
//     detPage.style.transform = 'translateX(100%)';
// });
