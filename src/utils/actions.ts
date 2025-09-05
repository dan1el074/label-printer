const appTitle: HTMLElement = document.getElementById("app-title");
const printersSelect: HTMLElement = document.getElementById("printers-select");
const windowTitle: HTMLElement = document.getElementById("window-title");
const variablesContainer: HTMLElement = document.getElementById("variables");
let showDialog: boolean = true;

ipcRenderer.on('app/setTitle', (_event: any, version: string): void => {
    appTitle.innerHTML += " v" + version;
    windowTitle.innerHTML += " v" + version;
});

ipcRenderer.on('action/closeDialog', (): void => {
    showDialog = true;
});

ipcRenderer.on('action/reset', (_event: any, version: string): void => {
    configPage.style.transform = 'translateX(100%)';
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

ipcRenderer.on('set/modelConfig', (_event: any, data: PrintModel): void => {
    variablesContainer.innerHTML = ""

    if(!data.variables.length) {
        variablesContainer.innerHTML = '<div class="item empty">Nenhuma variável encontrada</div>';
        return;
    }

    for (let i=0; i<data.variables.length; i++) {
        let labelContent = data.variables[i].name;
        let trashContent = "";
        let addContent = "";

        labelContent = labelContent.charAt(0).toUpperCase() + labelContent.slice(1);

        if (data.variables[i].max > 1) {
            trashContent = `
                <div class="buttons">
                <button data-item-index="${i}" data-input-index="${0}" class="icon trash">
                <img src="../images/trash.svg" />
                </button>
                </div>
            `;
            addContent = `
                <div class="buttons">
                <button data-item-index="${i}" class="icon add">
                <img src="../images/add.svg" />
                </button>
                </div>
            `;
        }

        const max = data.variables[i].max ? data.variables[i].max : "1";

        variablesContainer.innerHTML += `
            <div data-item="${i}" data-item-max=${max} class="item">
                <label>${labelContent}:</label>
                <div data-input="0" class="input-container">
                    <input type="text" placeholder="...valor" />
                    ${trashContent}
                </div>
                ${addContent}
            </div>
        `;
    }

    getTrashButtonList();
    getAddButtonList();
});

ipcRenderer.on('set/printers', (_event: any, data: Array<string>): void => {
    data.forEach((printer: string): void => {
        printersSelect.innerHTML += `<option value='${printer}'>${printer}</option>`;
    });
});
