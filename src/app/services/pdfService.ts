import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { log } from '../../app/services/logService';

export async function createLabel(printModel: PrintModel, tempPath: string): Promise<any> {
    const width = mmToPt(printModel.width * printModel.collumn);
    const height = mmToPt(printModel.height);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);

    for (let i = 0; i < printModel.collumn; i++) {
        let firstTime = true;
        let message = '';

        printModel.body.forEach((content) => {
            if (!firstTime) message += '\n';

            firstTime = false;
            message += content.value;

            if (content.type == 'text') {
                for (let j = 0; j < printModel.variables.length; j++) {
                    if (!content.value.includes(printModel.variables[j].name)) continue;

                    for (let x = 0; x < printModel.variables[j].value.length; x++) {
                        if (x > 0) message += '\n' + content.value;
                        message = message.replace(
                            `%${printModel.variables[j].name}%`,
                            printModel.variables[j].value[x],
                        );
                    }
                }
            }
        });

        draw(page, message, mmToPt(printModel.width) * i, height - 10);
    }

    const pdfBytes = await pdfDoc.save();
    writeFileSync(tempPath, pdfBytes);
    log('arquivo temporario atualizado!');
}

function draw(page: PDFPage, message: string, x: number, y: number) {
    const lines = message.split('\n');
    lines.forEach((line, i) => {
        page.drawText(line, {
            x: x,
            y: y - i * 12,
            size: 10,
            color: rgb(0, 0, 0),
        });
    });
}

function mmToPt(mm: number): number {
    return (mm / 25.4) * 72;
}
