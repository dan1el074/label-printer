import { app, Menu, ipcMain, dialog, shell } from "electron";
import { Window} from "../app/models/Window";
import { log, getSpan } from "../app/services/logService"
import { getPrinters } from "../app/services/printerService";
import { exec } from "child_process";
import * as path from "path";
import fs = require("fs/promises");

export class Application {
    private data: Data;
    private configData: ConfigData;
    private window: Window;
    private running: boolean = false;

    constructor() {
        this.data = {
            printers: [],
            temporaryFile: path.join(__dirname, '../resources/temp/result.pdf'),
        };

        let options: Array<string> = [
            'app/minimize',
            'app/close',
            'action/showDialog',
            'action/setDET',
            'action/saveDETs',
            'action/getCodes',
            'app/start'
        ];

        options.forEach((option: string): void => {
            this.actionFromFrontend(option);
        })

        this.hideMenu();
    }

    public init(): void {
        this.readConfigFile()
            .then((): void => {
                this.createResultPath()
                    .then((): void => {
                        app.whenReady()
                            .then(async (): Promise<void> => {
                                this.window = new Window(this.configData.dev);
                                await this.window.loadIndex();

                                this.actionFromBackend("app/setTitle", this.configData.version);

                                getPrinters()
                                    .then(printers => {
                                        this.data.printers = printers;
                                        const NameOfPrinters = this.data.printers.map(printer => ' ' + printer.name)
                                        log(`Impressoras encontradas:${NameOfPrinters}`);

                                        let printerNames: Array<string> = [];
                                        this.data.printers.forEach((printer: Printable): void => {
                                            printerNames.push(printer.name);
                                        })

                                        this.actionFromBackend('set/printers', printerNames)
                                    })
                                    .catch(error => {
                                        log(error);
                                        this.actionFromBackend('message/error', error);
                                    });
                            })
                    })
            })
            .catch(erro => log(erro));
    }

    private async copyFileIfNotExists() {
        try {
            exec('mkdir "%APPDATA%\\ImprimeEtiqueta\\temp" "%APPDATA%\\ImprimeEtiqueta\\logs"');
        } catch(error) {
            log(error);
        }
    }

    private async createResultPath() {
        const appDataPath = process.env.APPDATA;
        let dirPath = path.join(appDataPath, 'ImprimeEtiqueta');
        dirPath = path.join(dirPath, 'temp');
        const filePath = path.join(dirPath, 'result.pdf');

        if (this.configData.tmpFile) {
            this.data.temporaryFile = this.configData.tmpFile;
            return;
        }

        try {
            await this.copyFileIfNotExists();
            this.data.temporaryFile = filePath;
        } catch (err) {
            log(`Erro ao criar o caminho do resultado: ${err.message}`);
        }
    }

    private async readConfigFile(): Promise<void> {
        try {
            const configPath = path.join(__dirname, '../config.json');
            const data = await fs.readFile(configPath, 'utf8');
            const configData = JSON.parse(data);
            this.configData = {
                dev: configData.dev,
                version: configData.version,
                tmpFile: configData.tmpFile
            }

            let message = `Arquivo de configuração: {${getSpan()}    dev: ${configData.dev},${getSpan()}    version: ${configData.version},${getSpan()}}`;
            log(message);
        } catch (error) {
            console.error('Erro ao ler o arquivo de configuração:', error);
        }
    }

    private actionFromFrontend(route: string) {
        switch (route) {
            case 'app/minimize': {
                ipcMain.on(route, () => {
                    this.window.mainWindow.minimize();
                });
                break;
            }
            case 'app/close': {
                ipcMain.on(route, () => {
                    app.quit();
                });
                break;
            }
            case 'action/showDialog': {
                ipcMain.on(route, () => {
                    this.getPath()
                        .then((arr: Array<string>): void => {
                            // TODO: poder importart arquivos de template para as etiquetas, de preferência .json ou customizado
                            // this.data.path = arr[0];
                            // this.data.fileName = arr[1];
                            // this.actionFromBackend('set/fileName', this.data.fileName)
                        }).catch(error => {
                        log(error);
                    });
                });
                break;
            }
            case 'app/start': {
                ipcMain.on(route, (_event, printer: string): void => {
                    this.startApplication(printer)
                        .then(() => {
                            this.running = false;
                        }).catch(error => {
                        log(error);
                    });
                });
                break;
            }
        }
    }

    private actionFromBackend(route: string, message?: string | Array<string>): void {
        if (message) {
            this.window.mainWindow.webContents.send(route, message);
            return
        }

        this.window.mainWindow.webContents.send(route);
    }

    private hideMenu() {
        const menuTemplate: any = [];
        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);
    }

    private async getPath(): Promise<Array<string>> {
        // TODO: usar para importar modelos de etiqueta!

        return new Promise(async (resolve, reject) => {
            let dialogPath = await dialog.showOpenDialog({
                defaultPath: app.getPath("desktop"),
                title: 'Selecione o arquivo:',
                buttonLabel: 'Selecionar',
                filters: [
                    {
                        name: 'Excel',
                        extensions: ['xlsx', 'xls']
                    }
                ],
            });

            if (dialogPath.canceled) {
                this.actionFromBackend('action/closeDialog')
                reject('Operação cancelada');
            }

            const folderPath = String(dialogPath.filePaths).replace("\\\\", "\\");
            const arrayFolder = folderPath.split("\\");
            const fileName = arrayFolder[arrayFolder.length - 1];
            let filePath: string;
            filePath = folderPath;

            if (arrayFolder[1] === "metaro-server") {
                filePath = "\\" + folderPath;
            }

            this.actionFromBackend('action/closeDialog')
            resolve([filePath, fileName]);
        })
    }

    private async saveToPdf(): Promise<void> {
        setTimeout((): void => {
            this.actionFromBackend('message/success', 'Processando arquivo')
        }, 500)

        await dialog.showSaveDialog({
            title: 'Salvar arquivo',
            defaultPath: app.getPath("desktop"),
            filters: [
                {name: 'Text Files', extensions: ['pdf']}
            ]
        }).then(async result => {
            if (!result.canceled) {
                let currentFilePath: string = result.filePath;
                log(`Caminho para salvar arquivo: ${currentFilePath}`);

                try {
                    await fs.copyFile(this.data.temporaryFile, currentFilePath);
                    await shell.openPath(currentFilePath);
                    log('Arquivo copiado com sucesso!');
                    setTimeout((): void => {
                        this.actionFromBackend('message/success', 'Arquivo salvo com sucesso!')

                    }, 500)
                    return
                } catch (error) {
                    log(`Erro ao copiar o arquivo: ${error}`);
                    setTimeout((): void => {
                        this.actionFromBackend('message/simpleError', 'Erro ao copiar o arquivo!')
                    }, 500)
                    return;
                }
            } else {
                log('Diálogo de salvar cancelado');
            }
        })
    }

    private startApplication(printer: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.running) {
                reject('Aplicação ainda não foi finalizada!');
                return
            }
            this.running = true;
        
            // TODO: implementar aplicação!
        })
    }
}
