import { app, Menu, ipcMain, dialog } from 'electron';
import { Window } from '../app/models/Window';
import { log, getSpan } from '../app/services/logService';
import { getPrinters } from '../app/services/printerService';
import { createLabel, copyPages, openFile } from '../app/services/pdfService';
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
            temporaryPath: path.join(__dirname, "../resources/temp/"),
            selectModel: null
        };

        let options: Array<string> = [
            'app/minimize',
            'app/close',
            'action/showDialog',
            'action/addNewModel',
            'action/reset',
            'action/getConfigInput',
            'action/setModel',
            'app/start'
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

    private timestamp(): string {
        const now = new Date();
        const timestamp = now.getFullYear() + "-" +
            String(now.getMonth() + 1).padStart(2, "0") + "-" +
            String(now.getDate()).padStart(2, "0") + "_" +
            String(now.getHours()).padStart(2, "0") + "-" +
            String(now.getMinutes()).padStart(2, "0") + "-" +
            String(now.getSeconds()).padStart(2, "0");
        return timestamp;
    }

    private async readConfigFile(): Promise<void> {
        try {
            const configPath = path.join(__dirname, '../config.json');
            const data = await fs.readFile(configPath, 'utf8');
            const configData = JSON.parse(data);
            this.configData = {
                dev: configData.dev,
                version: configData.version,
                tmpPath: configData.tmpPath,
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

        if (this.configData.tmpPath) {
            this.data.temporaryPath = this.configData.tmpPath;
            return;
        }

        try {
            await this.copyFileIfNotExists();
            this.data.temporaryPath = dirPath;
        } catch (err) {
            log(`Erro ao criar o caminho do resultado: ${err.message}`);
        }
    }

    private async getPrintModels(): Promise<void> {
        try {
            const modelsPath = path.join(__dirname, '../resources/models');
            const files = await fs.readdir(modelsPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            log(`Modelos de impressão encontrados:${jsonFiles}`);

            this.data.modelList = await Promise.all(
                jsonFiles.map(async file => {
                    const filePath = path.join(modelsPath, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    return JSON.parse(content);
                })
            );

            const modelsName = this.data.modelList.map(currentModel => currentModel.title)

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
            this.actionFromBackend('message/breakError', error);
        }
    }

    private resetApplication(): void {
        this.data.selectModel = null;
        this.actionFromBackend('action/reset');
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
                        this.actionFromBackend('set/fileName', this.data.newModelFileName);
                    } catch (error) {
                        log(error);
                    }
                });
                break;
            }
            case 'action/addNewModel': {
                ipcMain.on(route, async () => {
                    const destinationPath = path.join(__dirname, '../resources/models');
                    const filesNumberInPath = await fs.readdir(destinationPath);
                    const newFile = `${destinationPath}/custom-model${filesNumberInPath.length - 2}.json`;
                    const verifyModel = await this.verifyNewModel(this.data.newModelPath);

                    if(!verifyModel) {
                        this.resetApplication();
                        return;
                    }

                    await fs.copyFile(this.data.newModelPath, newFile);
                    await this.getPrintModels();
                    await this.setModelPrintByFilePath(newFile);
                    this.actionFromBackend('set/printModel', this.data.selectModel.title);
                    this.getConfigInput(this.data.selectModel.title);
                    this.actionFromBackend('message/success', 'Modelo adicionado com sucesso!');
                });
                break;
            }
            case 'action/getConfigInput': {
                ipcMain.on(route, (_event, modelTitle: string): void => {
                    this.getConfigInput(modelTitle);
                });
                break;
            }
            case 'action/reset': {
                ipcMain.on(route, (): void => {
                    this.resetApplication();
                });
                break;
            }
            case 'action/setModel': {
                ipcMain.on(route, (_event, newModel: PrintModel): void => {
                    this.data.selectModel = newModel;
                });
                break;
            }
            case 'app/start': {
                ipcMain.on(route, async (_event, data: Array<string>) => {
                    try {
                        await this.start(data[0], parseInt(data[1]));
                        this.running = false;
                    } catch(error) {
                        log(error);
                    }
                });
                break;
            }
        }
    }

    private async verifyNewModel(newFile: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            const content = await fs.readFile(newFile, 'utf-8');
            const contentObj: PrintModel = await JSON.parse(content);

            this.data.modelList.forEach(model => {
                if (model.title == contentObj.title) {
                    this.actionFromBackend('message/error', 'Já existe um modelo com esse mesmo título!');
                    log('Já existe um modelo com esse mesmo título!');
                    resolve(false);
                }
            })

            resolve(true);
        })
    }

    private async setModelPrintByFilePath(filePath: string) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            this.data.selectModel = JSON.parse(content);
        } catch (error) {
           log('Erro ao encontrar modelo: ' + error);
        }
    }

    private async getConfigInput(modelTitle: string) {
        this.data.modelList.forEach(model => {
            if(model.title == modelTitle) this.data.selectModel = model
        })

        this.actionFromBackend('set/modelConfig', this.data.selectModel)
    }

    private actionFromBackend(route: string, message?: string | PrintModel | Array<string>): void {
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

    private async start(printer: string, copyNumber: number) {
        if (this.running) return;
        this.running = true;

        const filePath = path.join(this.data.temporaryPath, `/temp_${this.timestamp()}.pdf`);

        await createLabel(this.data.selectModel, filePath);
        await copyPages(filePath, copyNumber);

        if (printer == "Abrir arquivo") {
            try {
                await openFile(filePath);
                this.running = false;

                log("Impressão enviada com sucesso!");
                setTimeout(() => {
                    this.actionFromBackend('message/success', "Impressão enviada com sucesso!");
                }, 500)
            } catch (error) {
                log("Erro ao imprimir: " + error);
                setTimeout(() => {
                    this.actionFromBackend('message/error', "Erro ao imprimir!");
                }, 500)
            }

            return;
        }

        try {
            let index = this.data.printerList.findIndex(data => data.name == printer);
            await this.data.printerList[index].print(filePath);

            log("Impressão enviada com sucesso!");
            setTimeout(() => {
                this.actionFromBackend('message/success', "Impressão enviada com sucesso!");
            }, 500)
        } catch(error) {
            log(error);
        }

        this.running = false;
    }
}
