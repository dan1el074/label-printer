const nextBtn: HTMLElement = document.getElementById('next-btn');
const actionPage: HTMLElement = document.querySelector('.action-page');
const previousBtn: HTMLElement = document.getElementById('previous-btn');
const detPreviousBtn: HTMLElement = document.getElementById('det-previous-btn');
let firstAccess = true;

inputOrder.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        nextBtn.click();
    }
});

document.addEventListener('keypress', (event) => {
    if(actionPage.style.transform === 'translateX(-100%)' || detPage.style.transform !== 'translateX(-100%)') {
        if (event.key === 'Enter') {
            if(firstAccess) {
                firstAccess = false;
                return;
            }

            printBtn.click();
        }
    }
});

nextBtn.addEventListener('click', () => {
    const fileSpan: HTMLElement = document.getElementById('new-placeholder');
    let validatedOrder = false;
    let validatedFile = false;

    if (!fileSpan.innerHTML) {
        inputSearch.style.border = '2px solid red';
        error.style.display = 'block';
        error.innerHTML = 'Selecione um arquivo!';
        return
    }

    if (fileSpan.innerHTML) {
        inputSearch.style.border = '2px solid #fff';
        error.style.display = 'none';
        validatedFile = true;
    }

    if (!inputOrder.value) {
        inputOrder.style.border = '2px solid red';
        error2.innerHTML = 'Digite o número do pedido!';
        return
    }

    if (inputOrder.value) {
        validatedOrder = true;
    }

    if (validatedOrder && validatedFile) {
        inputOrder.style.border = '2px solid #fff';
        error2.innerHTML = '';
        actionPage.style.transform = 'translateX(-100%)';
        ipcRenderer.send('action/getCodes', inputOrder.value.toUpperCase());
        setTimeout(() => {
            printersSelect.focus();
        }, 300)
    }
});

printersSelect.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        printBtn.click();
        return
    }
});

previousBtn.addEventListener('click', () => {
    printBtn.style.backgroundColor = '#1689fc';
    actionPage.style.transform = 'translateX(100%)';
    alertContainer.innerHTML = '';
    firstAccess = true;
});

printBtn.addEventListener('blur', () => {
    printBtn.style.backgroundColor = '#1689fc';
    printBtn.style.transition = '1s';
});

detPreviousBtn.addEventListener('click', () => {
    printBtn.style.backgroundColor = '#1689fc';
    detPage.style.transform = 'translateX(100%)';
    actionPage.style.transform = 'translateX(100%)';
    alertContainer.innerHTML = '';
    firstAccess = true;

    setTimeout(() => {
        detInput.value = '';
    }, 300)
})

detPage.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        saveDetAndPrint.click();
        return
    }
});
