const { ipcRenderer } = require("electron");

const btnMinimize: HTMLElement = document.getElementById("btnMinimize");
const btnClose: HTMLElement = document.getElementById("btnClose");

btnMinimize.addEventListener("click", (): void => {
    ipcRenderer.send("app/minimize");
});

btnClose.addEventListener("click", (): void => {
    ipcRenderer.send("app/close");
});
