import { BrowserWindow } from "electron";
import * as path from "path";

export class Window {
    public readonly mainWindow: BrowserWindow;
    private readonly devMode: boolean = false;
    private readonly options: windowOptions;

    constructor(devMode?:boolean) {
        this.options = {
            title: 'Imprime Etiquetas',
            icon: path.join(__dirname, '../../public/images/icon.ico'),
            width: 600,
            height: 400,
            maxWidth: 600,
            maxHeight: 400,
            fullscreenable: false,
            resizable: false,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                devTools: false
            }
        }

        if(devMode) {
            this.devMode = devMode;
            this.options.maxWidth = 9999;
            this.options.maxHeight = 9999;
            this.options.width = 1250;
            this.options.height = 500;
            this.options.fullscreenable = true;
            this.options.resizable = true;
            this.options.frame = true;
            this.options.webPreferences.devTools = true;
        }

        this.mainWindow = new BrowserWindow(this.options);
        if(this.devMode) {
            console.log('Iniciando como desenvolvedor');
            this.mainWindow.webContents.openDevTools();
        }
    }

    public async loadIndex(): Promise<void> {
        let indexPath = path.join(__dirname, '../../public/views/index.html');
        await this.mainWindow.loadFile(indexPath);
    }
}
