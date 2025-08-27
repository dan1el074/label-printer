import * as fs from 'fs';

let firstLog = true;

export function log(message: string): void {
    const date = new Date();
    const day = `${date.getDate()<=9?'0'+date.getDate():date.getDate()}-${date.getMonth()+1<=9?'0'+(date.getMonth()+1):date.getMonth()+1}-${date.getFullYear()}`
    const timestamp = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds() <= 9 ? `0${date.getSeconds()}` : date.getSeconds()}`;
    const path = require("path");
    const appDataPath = process.env.APPDATA;
    const dirPath = path.join(appDataPath, 'ImprimePDF');
    const logPath = path.join(dirPath, 'logs');
    const filePath = path.join(logPath, `${day}.txt`);
    const content = `[${timestamp}] ${message}\r\n`;

    console.log(message);

    if(firstLog) {
        const firstContent: string =
            `------------------------------  Acesso às ${timestamp}  --------------------------------\r\n`;

        if(fs.existsSync(filePath)) {
            fs.appendFile(filePath, '\r\n \r\n' + firstContent, (err) => {
                if (err) {
                    console.error('Erro ao adicionar logs ao arquivo:', err);
                }
            });
        }
        if(!fs.existsSync(filePath)) {
            fs.writeFile(filePath, firstContent, (err) => {
                if (err) {
                    console.error('Erro ao criar logs:', err);
                }
            });
        }
        firstLog = false
    }

    fs.appendFile(filePath, content, (err) => {
        if (err) {
            console.error('Erro ao adicionar logs ao arquivo:', err);
        }
    });

    console.log("");
}

export function getSpan(): String {
    return "\r\n            ";
}
