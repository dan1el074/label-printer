import { app, Menu, ipcMain, dialog, shell } from 'electron';
import { Window } from '../app/models/Window';
import { log, getSpan } from '../app/services/logService';
import { getPrinters } from '../app/services/printerService';
import { exec } from 'child_process';
import * as path from 'path';
import fs = require('fs/promises');

export class Application {
    private data: Data;
    private configData: ConfigData;
    private window: Window;
    private running: boolean = false;

    constructor() {
        this.data = {
            printerList: [],
            modelList: [],
            temporaryFile: path.join(__dirname, '../resources/temp/result.pdf'),
            selectModel: null
        };

        let options: Array<string> = [
            'app/minimize',
            'app/close',
            'action/showDialog',
            // 'action/getCodes',
            // 'app/start',
        ];

        options.forEach((option: string): void => {
            this.actionFromFrontend(option);
        });

        this.hideMenu();
    }

    public async init() {
        await this.readConfigFile();
        await this.createResultPath();
        await app.whenReady().then(async () => {
            this.window = new Window(this.configData.dev);
            await this.window.loadIndex();
            this.actionFromBackend('app/setTitle', this.configData.version);
        });

        await this.getPrintModels();
        await this.getPrinters();
    }

    private async copyFileIfNotExists() {
        try {
            exec(
                'mkdir "%APPDATA%\\ImprimeEtiqueta\\temp" "%APPDATA%\\ImprimeEtiqueta\\logs"',
            );
        } catch (error) {
            log(error);
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
                tmpFile: configData.tmpFile,
            };

            let message = `Arquivo de configuração: {${getSpan()}    dev: ${configData.dev},${getSpan()}    version: ${configData.version},${getSpan()}}`;
            log(message);
        } catch (error) {
            console.error('Erro ao ler o arquivo de configuração:', error);
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

    private async getPrintModels(): Promise<void> {
        try {
            const modelsPath = path.join(__dirname, '../resources/models');
            const files = await fs.readdir(modelsPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            this.data.modelList = jsonFiles;
            log(`Modelos de impressão encontrados:${jsonFiles}`);

            const modelsList: Array<PrintModel> = await Promise.all(
                jsonFiles.map(async file => {
                    const filePath = path.join(modelsPath, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    return JSON.parse(content);
                })
            );

            const modelsName = modelsList.map(currentModel => currentModel.title)

            this.actionFromBackend('set/models', modelsName);
        } catch (error) {
            console.error('Erro ao encontrar a pasta de modelos:', error);
        }
    }

    private async getPrinters(): Promise<void> {
        try {
            const printers = await getPrinters();

            this.data.printerList = printers;
            const NameOfPrinters = this.data.printerList.map(
                (printer) => ' ' + printer.name,
            );
            log(`Impressoras encontradas:${NameOfPrinters}`);

            let printerNames: Array<string> = [];
            this.data.printerList.forEach((printer: Printable): void => {
                printerNames.push(printer.name);
            });

            this.actionFromBackend('set/printers', printerNames);
        } catch (error) {
            log(error);
            this.actionFromBackend('message/error', error);
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
                ipcMain.on(route, async () => {
                    try {
                        const arrayModels: Array<string> = await this.getPath();
                        this.data.newModelPath = arrayModels[0];
                        this.data.newModelFileName = arrayModels[1];
                        this.actionFromBackend('set/fileName', this.data.newModelFileName)

                        // TODO: incluir novo modelo somente se o usuário clicar em *AVANÇAR*
                        const destinationPath = path.join(__dirname, '../resources/models');
                        const filesNumberInPath = await fs.readdir(destinationPath)
                        await fs.copyFile(this.data.newModelPath, `${destinationPath}/custom-model${filesNumberInPath.length - 2}.json`);

                        this.getPrintModels();
                    } catch (error) {
                        log(error);
                    }
                });
                break;
            }
            case 'app/start': {
                ipcMain.on(route, (_event, printer: string): void => {
                    this.startApplication(printer)
                        .then(() => {
                            this.running = false;
                        })
                        .catch((error) => {
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
            return;
        }
        this.window.mainWindow.webContents.send(route);
    }

    private hideMenu() {
        const menuTemplate: any = [];
        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);
    }

    private async getPath(): Promise<Array<string>> {
        return new Promise(async (resolve, reject) => {
            let dialogPath = await dialog.showOpenDialog({
                defaultPath: app.getPath('desktop'),
                title: 'Selecione o arquivo:',
                buttonLabel: 'Selecionar',
                filters: [
                    {
                        name: 'Excel',
                        extensions: ['json'],
                    },
                ],
            });

            if (dialogPath.canceled) {
                this.actionFromBackend('action/closeDialog');
                reject('Operação cancelada');
            }

            const folderPath = String(dialogPath.filePaths).replace(
                '\\\\',
                '\\',
            );
            const arrayFolder = folderPath.split('\\');
            const fileName = arrayFolder[arrayFolder.length - 1];
            let filePath: string;
            filePath = folderPath;

            if (arrayFolder[1] === 'metaro-server') {
                filePath = '\\' + folderPath;
            }

            this.actionFromBackend('action/closeDialog');
            resolve([filePath, fileName]);
        });
    }

    private async saveToPdf(): Promise<void> {
        setTimeout((): void => {
            this.actionFromBackend('message/success', 'Processando arquivo');
        }, 500);

        const result = await dialog.showSaveDialog({
                title: 'Salvar arquivo',
                defaultPath: app.getPath('desktop'),
                filters: [{ name: 'Text Files', extensions: ['pdf'] }],
            })

        if (result.canceled) {
            log('Diálogo de salvar cancelado');
            return;
        }

        let currentFilePath: string = result.filePath;
        log(`Caminho para salvar arquivo: ${currentFilePath}`);

        try {
            await fs.copyFile(
                this.data.temporaryFile,
                currentFilePath,
            );
            await shell.openPath(currentFilePath);
            log('Arquivo copiado com sucesso!');
            setTimeout((): void => {
                this.actionFromBackend(
                    'message/success',
                    'Arquivo salvo com sucesso!',
                );
            }, 500);
            return;
        } catch (error) {
            log(`Erro ao copiar o arquivo: ${error}`);
            setTimeout((): void => {
                this.actionFromBackend(
                    'message/simpleError',
                    'Erro ao copiar o arquivo!',
                );
            }, 500);
            return;
        }
    }

    private startApplication(printer: string): Promise<void> {
        if (this.running) {
            return new Promise((resolve, reject) => {
                reject('Aplicação ainda não foi finalizada!');
            });
        }

        this.running = true;
        // TODO: implementar aplicação!
    }
}
