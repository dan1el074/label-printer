import { log } from "../services/logService";
import printer = require('pdf-to-printer');

export class Printer implements Printable {
    readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    public async print(temporaryFilePath: string, orientation: 'portrait' | 'landscape' = 'landscape'): Promise<string> {
        log('Impressora selecionada: ' + this.name);
        if (this.name === 'Abrir arquivo') throw new Error('Use a opção de abrir arquivo.');
        return this.printWithPdfToPrinter(temporaryFilePath, orientation);
    }

    public printWithPdfToPrinter(temporaryFilePath: string, orientation: 'portrait' | 'landscape' = 'landscape'): Promise<string> {
        return new Promise((resolve, reject) => {
            const options: Parameters<typeof printer.print>[1] = {
                printer: this.name,
                orientation,
                scale: "noscale"
            };

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
