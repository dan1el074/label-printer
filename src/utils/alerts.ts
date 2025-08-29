// let contadorAlert: number  = 0;

// ipcRenderer.on('message/success', (event: any, data: string) => {
//     contadorAlert += 1;
//     let contador = contadorAlert;
//     let div = document.createElement('div');
//     div.setAttribute('id', `alert${contador}`);
//     div.classList.add('alert', 'success');
//     div.innerHTML = `<span>${data}</span>`;

//     alertContainer.appendChild(div);

//     try {
//         let currentAlert: HTMLElement = document.getElementById(`alert${contador}`);
//         if(currentAlert) {
//             setTimeout(() => {
//                 currentAlert.remove();
//             }, 5000);
//         }
//     } catch (e) {}
// });

// ipcRenderer.on('message/error', (event: any, data: string) => {
//     contadorAlert += 1;
//     let contador = contadorAlert;
//     let div = document.createElement('div');
//     div.setAttribute('id', `alert${contador}`);
//     div.classList.add('alert', 'erro');
//     div.innerHTML = `<span>${data}</span>`;

//     alertContainer.appendChild(div);
// });

// ipcRenderer.on('message/simpleError', (event: any, data: string) => {
//     contadorAlert += 1;
//     let contador = contadorAlert;
//     let div = document.createElement('div');
//     div.setAttribute('id', `alert${contador}`);
//     div.classList.add('alert', 'simple-erro');
//     div.innerHTML = `<span>${data}</span>`;

//     alertContainer.appendChild(div);

//     setTimeout(() => {
//         document.getElementById(`alert${contador}`).remove();
//     }, 5000);
// });

// ipcRenderer.on('message/options', (event: any, possibleDETFile: string) => {
//     contadorAlert += 1;
//     const contador = contadorAlert;
//     let div = document.createElement('div');
//     div.setAttribute('id', `alert${contador}`);
//     div.classList.add('alert', 'erro', 'option');
//     div.innerHTML = `
//         <span>O arquivo ${possibleDETFile} tem DET?</span>
//         <div class='btn-container'>
//             <button id='btnSetDET'>Sim</button>
//             <button id='btnCancelDET'>Não</button>
//         </div>
//     `;
//     alertContainer.appendChild(div);

//     const btnSetDet = document.getElementById('btnSetDET');
//     btnSetDet.addEventListener('click', () => {
//         sendToBackend('action/setDET', possibleDETFile)
//     })

//     const btnCancelDet = document.getElementById('btnCancelDET');
//     btnCancelDet.addEventListener('click', () => {
//         actionPage.style.transform = 'translateX(100%)';
//         alertContainer.innerHTML = '';
//     })
// });
