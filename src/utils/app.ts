let modelSelect: HTMLSelectElement = document.getElementById('print-model-select') as HTMLSelectElement;
const placeholder: HTMLElement = document.getElementById('placeholder');
const newPlaceholder: HTMLElement = document.getElementById('new-placeholder');
const inputSearch: HTMLElement = document.querySelector('.input-search');
const configPageBtn: HTMLElement = document.getElementById('config-page-btn');
const printModelError: HTMLElement = document.getElementById('print-model-error');
const configPage: HTMLElement = document.querySelector('.config-page');
const previousHomeBtn: HTMLElement = document.getElementById('previous-home-btn');
let trashButtonList: NodeListOf<HTMLElement>;
let addButtonList: NodeListOf<HTMLElement>;

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

// printBtn.addEventListener('click', () => {
//     const chosenPrinter: HTMLSelectElement = document.querySelector('#printers-select');
//     ipcRenderer.send('app/start', chosenPrinter.value);
//     printBtn.style.backgroundColor = '#00E500';
//     printBtn.style.transition = '1s';
// });

// inputOrder.addEventListener('keypress', (event) => {
//     if (event.key === 'Enter') {
//         configPageBtn.click();
//     }
// });

// document.addEventListener('keypress', (event) => {
//     if(actionPage.style.transform === 'translateX(-100%)' || detPage.style.transform !== 'translateX(-100%)') {
//         if (event.key === 'Enter') {
//             if(firstAccess) {
//                 firstAccess = false;
//                 return;
//             }

//             printBtn.click();
//         }
//     }
// });

// printersSelect.addEventListener('keypress', (event) => {
//     if (event.key === 'Enter') {
//         event.preventDefault();
//         printBtn.click();
//         return
//     }
// });

// previousBtn.addEventListener('click', () => {
//     printBtn.style.backgroundColor = '#1689fc';
//     actionPage.style.transform = 'translateX(100%)';
//     alertContainer.innerHTML = '';
//     firstAccess = true;
// });

// printBtn.addEventListener('blur', () => {
//     printBtn.style.backgroundColor = '#1689fc';
//     printBtn.style.transition = '1s';
// });

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
                        <button data-item-index="${itemIndex}" data-input-index="${highestInputIndex + 1}" class="icon trash">
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
