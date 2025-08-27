const inputSearch: HTMLElement = document.querySelector('.input-search');
const windowTitle: HTMLElement = document.getElementById("windowTitle");
const appTitle: HTMLElement = document.getElementById("appTitle");
const inputOrder: HTMLInputElement = <HTMLInputElement>document.getElementById('input-order');
const printBtn: HTMLElement = document.getElementById('print-btn');
const placeholder: HTMLElement = document.getElementById('placeholder');
const newPlaceholder: HTMLElement = document.getElementById('new-placeholder');
const error: HTMLElement = document.querySelector('.error');
const error2: HTMLElement = document.querySelector('.error2');
const printersSelect: HTMLElement = document.getElementById('printers-select');
const detPage: HTMLElement = document.querySelector('.det-page');
const detInput: HTMLInputElement = <HTMLInputElement>document.querySelector('#input-det');
const alertContainer: HTMLElement = document.querySelector('.alert-container');
const saveDetAndPrint: HTMLElement = document.getElementById('det-btn');
let showDialog: boolean = false;

function sendToBackend(route: string, data?: any) {
    if(data) {
        ipcRenderer.send(route, data);
        return
    }
    ipcRenderer.send(route);
}

// mandando att pro backend
inputSearch.addEventListener('click', () => {
    if (!showDialog) {
        sendToBackend('action/showDialog');
        showDialog = true;
    }
});

printBtn.addEventListener('click', () => {
    const chosenPrinter: HTMLSelectElement = document.querySelector('#printers-select');
    sendToBackend('app/start', chosenPrinter.value);
    printBtn.style.backgroundColor = '#00E500';
    printBtn.style.transition = '1s';
});

saveDetAndPrint.addEventListener('click', () => {
    const detValue: HTMLSelectElement = document.querySelector('#input-det')
    const printer: HTMLSelectElement = document.querySelector('#printers-select');
    sendToBackend('action/saveDETs', [detValue.value, printer.value]);
    detValue.value = '';
})

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
    inputSearch.style.border = '2px solid #fff';
    newPlaceholder.style.display = 'inline';
    newPlaceholder.innerHTML = data;
    error.style.display = 'none';
    inputOrder.focus();
    showDialog = false;
});

ipcRenderer.on('set/printers', (_event: any, data: Array<string>): void => {
    data.forEach((printer: string): void => {
        printersSelect.innerHTML += `<option value='${printer}'>${printer}</option>`;
    });
});

ipcRenderer.on('action/showDetPage', (_event: any, fileDET: string): void => {
    const detValue = document.getElementById('detValue');
    detValue.innerText = fileDET.split('.')[0];
    detPage.style.transform = 'translateX(-100%)';
    detInput.focus();
});

ipcRenderer.on('action/restart', (_event: any, fileDET: string): void => {
    alertContainer.innerHTML = '';
    detPage.style.transform = 'translateX(100%)';
});
