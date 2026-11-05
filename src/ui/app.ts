const modelSelect: HTMLSelectElement = document.getElementById('print-model-select') as HTMLSelectElement;
const placeholder: HTMLElement = document.getElementById('placeholder');
const newPlaceholder: HTMLElement = document.getElementById('new-placeholder');
const inputSearch: HTMLElement = document.querySelector('.input-search');
const searchBtn: HTMLElement = document.getElementById('search-btn');
const configPageBtn: HTMLElement = document.getElementById('config-page-btn');
const printModelError: HTMLElement = document.getElementById('print-model-error');
const configPage: HTMLElement = document.querySelector('.config-page');
const variablesContainer: HTMLElement = document.getElementById("variables");
const previousHomeBtn: HTMLElement = document.getElementById('previous-home-btn');
const printPageBtn: HTMLElement = document.getElementById('print-page-btn');
const printPage: HTMLElement = document.querySelector('.print-page');
const printerSelect: HTMLSelectElement = document.getElementById('printers-select') as HTMLSelectElement;
const copyInput: HTMLInputElement = document.getElementById("copy-input") as HTMLInputElement;
const previousConfigBtn: HTMLElement = document.getElementById('previous-config-btn');
const printBtn: HTMLElement = document.getElementById('print-btn');
let trashButtonList: NodeListOf<HTMLElement>;
let addButtonList: NodeListOf<HTMLElement>;
let printModel: PrintModel;
let isBusy = false;
let currentPage: 'home' | 'config' | 'print' = 'home';
let focusVariablesAfterBusy = false;
let isNavigating = false;
let navigationTimer: ReturnType<typeof setTimeout>;

function showPage(page: 'home' | 'config' | 'print'): void {
    if (currentPage === page) return;
    currentPage = page;
    isNavigating = true;
    clearTimeout(navigationTimer);
    navigationTimer = setTimeout(() => isNavigating = false, 350);
    configPage.style.transform = page === 'home' ? 'translateX(0)' : 'translateX(-100%)';
    printPage.style.transform = page === 'print' ? 'translateX(-100%)' : 'translateX(0)';
    document.querySelectorAll<HTMLElement>('section').forEach(section => {
        const active = section.classList.contains(page === 'config' ? 'config-page' : page === 'print' ? 'print-page' : 'home');
        section.toggleAttribute('inert', !active);
        section.setAttribute('aria-hidden', String(!active));
    });
}

function setBusy(busy: boolean): void {
    isBusy = busy;
    document.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
        'section button, section input, section select'
    ).forEach(control => control.disabled = busy);
    inputSearch.style.pointerEvents = busy ? 'none' : '';
    document.body.setAttribute('aria-busy', String(busy));
    printBtn.querySelector('span').textContent = busy ? 'Processando...' : 'Imprimir';
    if (!busy && focusVariablesAfterBusy) {
        focusVariablesAfterBusy = false;
        if (currentPage === 'config') focusVariableInput();
    }
}

function focusVariableInput(): void {
    const input = variablesContainer.querySelector<HTMLInputElement>('input');
    (input || printPageBtn).focus({ preventScroll: true });
}

// Capture shortcuts before focused controls can also trigger their native actions.
document.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (!['Enter', 'Escape'].includes(event.key) || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    if (currentPage === 'home') return;
    event.preventDefault();
    if (event.repeat || isBusy || isNavigating) return;
    if (event.key === 'Escape') {
        if (currentPage === 'print') previousConfigBtn.click();
        else previousHomeBtn.click();
        return;
    }
    if (currentPage === 'config') printPageBtn.click();
    else printBtn.click();
}, true);

function sendOperation(route: string, data?: any): void {
    if (isBusy) return;
    setBusy(true);
    ipcRenderer.send(route, data);
}

function getTrashButtonList() {
    trashButtonList = document.querySelectorAll('.trash');
    if(!trashButtonList) return;

    trashButtonList.forEach(button => {
        button.addEventListener('click', () => {
    if (isBusy) return;
            const itemIndex = button.attributes[0].value;
            const inputIndex = button.attributes[1].value;
            const itemContent =  document.querySelector(`[data-item="${itemIndex}"] [data-input="${inputIndex}"]`);

            if (!itemContent) return;
            itemContent.remove();

            const inputList = document.querySelectorAll(`[data-item="${itemIndex}"] .input-container`);
            const itemMax = document.querySelector(`[data-item="${itemIndex}"]`).attributes[1].value;

            if (inputList.length < parseInt(itemMax)) {
                const addBtn: HTMLElement = document.querySelector(`[data-item="${itemIndex}"] .add`);
                addBtn.style.display = "initial";
            }
        })
    });
}

function getAddButtonList() {
    addButtonList = document.querySelectorAll('.add');
    if(!addButtonList) return;

    addButtonList.forEach(button => {
        button.addEventListener('click', () => {
    if (isBusy) return;
            const itemIndex = button.attributes[0].value;
            const inputList = document.querySelectorAll(`[data-item="${itemIndex}"] .input-container`);
            const template = (button.parentNode.parentNode as HTMLElement).attributes[2].value || "";
            let highestInputIndex = 0;

            inputList.forEach(input => {
                if (parseInt(input.attributes[0].value) > highestInputIndex) {
                    highestInputIndex = parseInt(input.attributes[0].value);
                }
            })

            let inputContent = `
                <div data-input="${highestInputIndex + 1}" class="input-container">
                    <input type="text" value="${template}" placeholder="...valor" />

                    <div class="buttons">
                        <button data-item-index="${itemIndex}" data-input-index="${highestInputIndex + 1}" tabindex="-1" class="icon trash">
                            <img src="../images/trash.svg" />
                        </button>
                    </div>
                </div>
            `;

            (button.parentNode as HTMLElement).insertAdjacentHTML('beforebegin', inputContent);
            getTrashButtonList();

            if (inputList.length + 1 >= parseInt((button.parentNode.parentNode as HTMLElement).attributes[1].value)) {
                button.style.display = "none";
            }
        })
    })
}

function verifyInputs() {
    for (let i=0; i<printModel.variables.length; i++) {
        const inputList: NodeListOf<HTMLInputElement> = document.querySelectorAll(`[data-item="${i}"] input`);
        printModel.variables[i].value = [];

        inputList.forEach(input => {
            printModel.variables[i].value.push(input.value);
        });
    }
    ipcRenderer.send('action/setModel', printModel);
}

modelSelect.addEventListener('change', () => {
    if (isBusy) return;
    modelSelect.style.border = "1px solid #fff";
    printModelError.style.height = "0px";
    placeholder.style.display = 'inline';
    newPlaceholder.innerHTML = ""
    newPlaceholder.style.display = 'none';
});

inputSearch.addEventListener('click', () => {
    if (isBusy) return;
    if (showDialog) {
        sendOperation('action/showDialog');
        showDialog = false;
    }
});

configPageBtn.addEventListener('click', async () => {
    if (isBusy || isNavigating || currentPage !== 'home') return;
    const fileName = document.getElementById('new-placeholder').innerHTML;

    if(!fileName && modelSelect.value == "none") {
        printModelError.style.display = "inline";
        printModelError.style.height = "15px";
        modelSelect.style.border = "2px solid red";
        return;
    }

    printModel = undefined;
    configPageBtn.blur();

    if (fileName) {
        sendOperation('action/addNewModel') // roda getConfigInput depois que terminar
    } else {
        sendOperation('action/getConfigInput', modelSelect.value);
    }

    showPage('config');

    modelSelect.tabIndex = -1;
    searchBtn.tabIndex = -1;
    configPageBtn.tabIndex = -1;
    previousHomeBtn.tabIndex = 0;
    printPageBtn.tabIndex = 0;

    newPlaceholder.innerHTML = "";
    newPlaceholder.style.display = 'none';
    placeholder.style.display = 'inline';
});

previousHomeBtn.addEventListener('click', () => {
    if (isBusy || isNavigating || currentPage !== 'config') return;
    ipcRenderer.send('action/reset');
    showPage('home');
    previousHomeBtn.blur();

    modelSelect.tabIndex = 0;
    searchBtn.tabIndex = 0;
    configPageBtn.tabIndex = 0;
    previousHomeBtn.tabIndex = -1;
    printPageBtn.tabIndex = -1;

    printModel = undefined;
    variablesContainer.innerHTML = "";
    modelSelect.focus({ preventScroll: true });
})

printPageBtn.addEventListener('click', () => {
    if (isBusy || isNavigating || currentPage !== 'config' || !printModel) return;
    showPage('print');

    const inputList: NodeListOf<HTMLInputElement> = document.querySelectorAll(`.config-container input`);
    const addButton: HTMLElement = document.querySelector('.add');

    inputList.forEach(input => {
        input.tabIndex = -1;
    })

    if (addButton) addButton.tabIndex = -1;
    previousHomeBtn.tabIndex = -1;
    printPageBtn.tabIndex = -1;
    previousConfigBtn.tabIndex = 0;
    printerSelect.tabIndex = 0;
    copyInput.tabIndex = 0;
    printBtn.tabIndex = 0;

    verifyInputs();
    printerSelect.focus({ preventScroll: true });
})

previousConfigBtn.addEventListener('click', () => {
    if (isBusy || isNavigating || currentPage !== 'print') return;
    showVariablesPage();
})

function showVariablesPage(): void {
    showPage('config');

    const inputList: NodeListOf<HTMLInputElement> = document.querySelectorAll(`.config-container input`);
    const addButton: HTMLElement = document.querySelector('.add');

    inputList.forEach(input => {
        input.tabIndex = 0;
    })

    if (addButton) addButton.tabIndex = 0;
    previousHomeBtn.tabIndex = 0;
    printPageBtn.tabIndex = 0;
    previousConfigBtn.tabIndex = -1;
    printerSelect.tabIndex = -1;
    copyInput.tabIndex = -1;
    printBtn.tabIndex = -1;
    if (isBusy) focusVariablesAfterBusy = true;
    else focusVariableInput();
}

printBtn.addEventListener('click', () => {
    if (isBusy || isNavigating || currentPage !== 'print') return;
    if (!printerSelect.value || !copyInput.reportValidity()) return;
    sendOperation('app/start', [printerSelect.value, copyInput.value]);
});
