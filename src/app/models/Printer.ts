import { log } from "../services/logService";
import printer = require('pdf-to-printer');

export class Printer implements Printable {
    readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    public print(temporaryFilePath: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            log(`Impressora selecionada: ${this.name}`);

            if (this.name == "Salvar como PDF") {
                reject('Salvo como PDF')
                return;
            }

            await this.printWithPdfToPrinter(temporaryFilePath)
                .then(text => resolve(text))
                .catch(text => reject(text))
        })
    }

    public printWithPdfToPrinter(temporaryFilePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options = { printer: this.name };

            printer.print(temporaryFilePath, options)
                .then(() => {
                    resolve('Impressão iniciada com sucesso!');
                })
                .catch(err => {
                    reject(`Erro ao imprimir o arquivo: ${err}`);
                });
        })
    }
}
