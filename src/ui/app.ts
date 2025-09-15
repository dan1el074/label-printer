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

function getTrashButtonList() {
    trashButtonList = document.querySelectorAll('.trash');
    if(!trashButtonList) return;

    trashButtonList.forEach(button => {
        button.addEventListener('click', () => {
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
    modelSelect.style.border = "1px solid #fff";
    printModelError.style.height = "0px";
    placeholder.style.display = 'inline';
    newPlaceholder.innerHTML = ""
    newPlaceholder.style.display = 'none';
});

inputSearch.addEventListener('click', () => {
    if (showDialog) {
        ipcRenderer.send('action/showDialog');
        showDialog = false;
    }
});

configPageBtn.addEventListener('click', async () => {
    const fileName = document.getElementById('new-placeholder').innerHTML;

    if(!fileName && modelSelect.value == "none") {
        printModelError.style.display = "inline";
        printModelError.style.height = "15px";
        modelSelect.style.border = "2px solid red";
        return;
    }

    configPageBtn.blur();

    if (fileName) {
        ipcRenderer.send('action/addNewModel') // roda getConfigInput depois que terminar
    } else {
        ipcRenderer.send('action/getConfigInput', modelSelect.value);
    }

    configPage.style.transform = 'translateX(-100%)';

    modelSelect.tabIndex = -1;
    searchBtn.tabIndex = -1;
    configPageBtn.tabIndex = -1;
    previousHomeBtn.tabIndex = 0;
    printPageBtn.tabIndex = 0;

    setTimeout(() => {
        newPlaceholder.innerHTML = "";
        newPlaceholder.style.display = 'none';
        placeholder.style.display = 'inline';
    }, 600);
});

previousHomeBtn.addEventListener('click', () => {
    ipcRenderer.send('action/reset');
    configPage.style.transform = 'translateX(100%)';
    previousHomeBtn.blur();

    modelSelect.tabIndex = 0;
    searchBtn.tabIndex = 0;
    configPageBtn.tabIndex = 0;
    previousHomeBtn.tabIndex = -1;
    printPageBtn.tabIndex = -1;

    setTimeout(() => {
        variablesContainer.innerHTML = "";
    }, 500);
})

printPageBtn.addEventListener('click', () => {
    printPage.style.transform = 'translateX(-100%)';

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
})

previousConfigBtn.addEventListener('click', () => {
    printPage.style.transform = 'translateX(100%)';

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
})

printBtn.addEventListener('click', () => {
    ipcRenderer.send('app/start', [printerSelect.value, copyInput.value]);
});
