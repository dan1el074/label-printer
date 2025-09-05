const alertContainer: HTMLElement = document.querySelector('.alert-container');
let alertCounter: number  = 0;

ipcRenderer.on('message/success', (event: any, data: string) => {
    alertCounter += 1;
    let contador = alertCounter;
    let div = document.createElement('div');
    div.setAttribute('id', `alert${contador}`);
    div.classList.add('alert', 'success');
    div.innerHTML = `<span>${data}</span>`;

    alertContainer.appendChild(div);

    try {
        let currentAlert: HTMLElement = document.getElementById(`alert${contador}`);
        if(currentAlert) {
            setTimeout(() => {
                currentAlert.remove();
            }, 5000);
        }
    } catch (e) {}
});

ipcRenderer.on('message/error', (event: any, data: string) => {
    alertCounter += 1;
    let counter = alertCounter;
    let div = document.createElement('div');
    div.setAttribute('id', `alert${counter}`);
    div.classList.add('alert', 'simple-erro');
    div.innerHTML = `<span>${data}</span>`;

    alertContainer.appendChild(div);

    setTimeout(() => {
        document.getElementById(`alert${counter}`).remove();
    }, 5000);
});

ipcRenderer.on('message/breakError', (event: any, data: string) => {
    alertCounter += 1;
    let contador = alertCounter;
    let div = document.createElement('div');
    div.setAttribute('id', `alert${contador}`);
    div.classList.add('alert', 'erro');
    div.innerHTML = `<span>${data}</span>`;

    alertContainer.appendChild(div);
});
