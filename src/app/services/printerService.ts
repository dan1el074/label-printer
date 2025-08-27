import { exec } from "child_process";
import { Printer } from "../models/Printer";

export function getPrinters(): Promise<Printable[]> {
    return new Promise((resolve, reject): void => {
        const command: string = 'wmic printer get name';
        let listPrinters: any[] = [];
        let printersName: Array<string> = [];

        listPrinters.push(new Printer("Salvar como PDF"))

        exec(command, (error: Error, stdout: string, _stderr: string): void => {
            if (error) {
                reject('Nenhuma impressora encontrada!');
            }

            printersName = stdoutResolve(stdout);

            printersName.forEach( (currentPrinterName: string): void => {
                listPrinters.push(new Printer(currentPrinterName))
            })

            resolve(listPrinters);
        });
    });
}

function stdoutResolve(stdout: string): Array<string> {
    let res: string = stdout.trim();
    let printersName: Array<string> = res.split(/\r?\n/g);

    for (let i: number = 0; i < printersName.length; i++) {
        printersName[i] = printersName[i].replace("\\r", "").trim();
    }

    let printerIndex: number = printersName.indexOf("Name");
    if (printerIndex != -1) {
        printersName.splice(printerIndex, 1);
    }

    return printersName
}
