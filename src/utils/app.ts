const modelSelect: HTMLSelectElement = document.getElementById('print-model-select') as HTMLSelectElement;
const placeholder: HTMLElement = document.getElementById('placeholder');
const newPlaceholder: HTMLElement = document.getElementById('new-placeholder');
const inputSearch: HTMLElement = document.querySelector('.input-search');
const configPageBtn: HTMLElement = document.getElementById('config-page-btn');
const printModelError: HTMLElement = document.getElementById('print-model-error');
const configPage: HTMLElement = document.querySelector('.config-page');
const previousHomeBtn: HTMLElement = document.getElementById('previous-home-btn');
const printPageBtn: HTMLElement = document.getElementById('print-page-btn');
const printPage: HTMLElement = document.querySelector('.print-page');
const printerSelect: HTMLSelectElement = document.getElementById('printers-select') as HTMLSelectElement;
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
            let highestInputIndex = 0

            inputList.forEach(input => {
                if (parseInt(input.attributes[0].value) > highestInputIndex) {
                    highestInputIndex = parseInt(input.attributes[0].value);
                }
            })

            let inputContent = `
                <div data-input="${highestInputIndex + 1}" class="input-container">
                    <input type="text" placeholder="...valor" />

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

    console.log(printModel);
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

    if (fileName) {
        // addNewModel roda getConfigInput depois que terminar
        ipcRenderer.send('action/addNewModel')
    } else {
        ipcRenderer.send('action/getConfigInput', modelSelect.value);
    }

    configPage.style.transform = 'translateX(-100%)';
    setTimeout(() => {
        newPlaceholder.innerHTML = "";
        newPlaceholder.style.display = 'none';
        placeholder.style.display = 'inline';
    }, 600);
});

previousHomeBtn.addEventListener('click', () => {
    ipcRenderer.send('action/reset');
    configPage.style.transform = 'translateX(100%)';
})

printPageBtn.addEventListener('click', () => {
    printPage.style.transform = 'translateX(-100%)';
    verifyInputs();
})

previousConfigBtn.addEventListener('click', () => {
    printPage.style.transform = 'translateX(100%)';
})

printBtn.addEventListener('click', () => {
    ipcRenderer.send('app/start', printerSelect.value);
});
