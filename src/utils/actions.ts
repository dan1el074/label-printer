const appTitle: HTMLElement = document.getElementById("app-title");
const windowTitle: HTMLElement = document.getElementById("window-title");
let showDialog: boolean = true;

// recebendo att do backend
ipcRenderer.on('app/setTitle', (_event: any, version: string): void => {
    appTitle.innerHTML += " v" + version;
    windowTitle.innerHTML += " v" + version;
});

ipcRenderer.on('action/closeDialog', (): void => {
    showDialog = true;
});

ipcRenderer.on('set/fileName', (_event: any, data: string): void => {
    placeholder.style.display = 'none';
    newPlaceholder.style.display = 'inline';
    newPlaceholder.innerHTML = data;

    modelSelect.value = "none";
    printModelError.style.height = "0px";
    modelSelect.style.border = "1px solid #fff";

    showDialog = true;
});

ipcRenderer.on('set/models', (_event: any, data: Array<string>): void => {
    modelSelect.innerHTML = "<option class='hidden' value='none' disabled selected>Selecione</option>";
    data.forEach((modelName: string): void => {
        modelSelect.innerHTML += `<option value='${modelName}'>${modelName}</option>`;
    });
});

ipcRenderer.on('set/printModel', (_event: any, data: string): void => {
    setTimeout(() => modelSelect.value = data, 600);
});

ipcRenderer.on('set/modelConfig', (_event: any, data: Array<string>): void => {
    // code...
});




















// ipcRenderer.on('set/printers', (_event: any, data: Array<string>): void => {
//     data.forEach((printer: string): void => {
//         printersSelect.innerHTML += `<option value='${printer}'>${printer}</option>`;
//     });
// });

// ipcRenderer.on('action/restart', (_event: any, fileDET: string): void => {
//     alertContainer.innerHTML = '';
//     detPage.style.transform = 'translateX(100%)';
// });
