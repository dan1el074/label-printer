import { PDFDocument, rgb } from "pdf-lib";
import { writeFileSync } from "fs";
import { log } from '../../app/services/logService';

export async function createLabel(printModel: PrintModel, tempPath: string): Promise<any> {
    const width = mmToPt(printModel.width * printModel.collumn);
    const height = mmToPt(printModel.height);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);

    // coluna
    for (let i=0; i<printModel.collumn; i++) {

        // body
        printModel.body.forEach(content => {

            // body vezes X
            for (let j=0; j<content.value.length; j++) {
                let message = content.value;

                if (content.type == "text") {

                    // variaveis
                    for (let x=0; x<printModel.variables.length; x++) {

                        // variaveis vezes X
                        // se a variável tiver o "max" maior que 1, pegar o mesmo índice do body
                        // message.replace(`%${printModel.variables[x].name}%`, "");
                    }
                }

                // page.drawText(message, {
                //     x: mmToPt(printModel.width) * i,
                //     y: height - 10,
                //     size: 10,
                //     color: rgb(0, 0, 0),
                // });
            }
        })
    }

    const pdfBytes = await pdfDoc.save();
    writeFileSync(tempPath, pdfBytes);

    log("arquivo temporario atualizado!");
}

function mmToPt(mm: number): number {
    return (mm / 25.4) * 72;
}
