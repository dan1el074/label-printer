import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { log } from '../../app/services/logService';
import { exec } from 'child_process';
import * as fs from 'fs';

export async function createLabel(printModel: PrintModel, tempPath: string, copies: number): Promise<any> {
    const width = mmToPt(printModel.width * printModel.collumn + 10);
    const height = mmToPt(printModel.height);
    const pdfDoc = await PDFDocument.create();

    // default values
    let fontFamily = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let fontSize = 10;
    let lineHeight = 10;
    let marginLeft = 0;
    let marginTop = 0;
    let gap = 0;

    // custom values
    if (printModel.options) {
        if (printModel.options.bold == false) fontFamily = await pdfDoc.embedFont(StandardFonts.Helvetica);
        if (printModel.options.fontSize) fontSize = printModel.options.fontSize;
        if (printModel.options.lineHeight) lineHeight = printModel.options.lineHeight;
        if (printModel.options.gap) gap = printModel.options.gap;
        if (printModel.options.marginLeft) marginLeft = printModel.options.marginLeft;
        if (printModel.options.marginTop) marginTop = printModel.options.marginTop;
    }

    let page = pdfDoc.addPage([width, height]);
    let columnCount = 1;

    for (let i=0; i<copies; i++) {
        let rowCount = 1;

        printModel.body.forEach(async (currentBody) => {
            let message = currentBody.value;

            let bodyFontFamily = fontFamily;
            let bodyFontSize = fontSize;
            let bodyLineHeight = lineHeight;

            if (currentBody.options) {
                if (currentBody.options.bold) bodyFontFamily = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                if (currentBody.options.fontSize) bodyFontSize = currentBody.options.fontSize;
                if (currentBody.options.lineHeight) bodyLineHeight = currentBody.options.lineHeight;
            }

            if (currentBody.type == 'text') {
                let isPrint = false;

                for (let j = 0; j < printModel.variables.length; j++) {
                    if (!currentBody.value.includes(printModel.variables[j].name)) continue;

                    for (let y = 0; y < printModel.variables[j].value.length; y++) {
                        const newMessage = message.replace(`%${printModel.variables[j].name}%`, printModel.variables[j].value[y]);
                        const textWidth = bodyFontFamily.widthOfTextAtSize(newMessage, bodyFontSize);
                        const xPosition = ((mmToPt(printModel.width) - textWidth) / 2) + (mmToPt(printModel.width) * (columnCount - 1));
                        const yPosition = height - marginTop - (bodyLineHeight * rowCount);

                        draw(page, newMessage, xPosition, yPosition, bodyFontFamily, bodyFontSize,
                            bodyLineHeight, (columnCount > 1 ? gap : marginLeft));

                        isPrint = true;
                        rowCount++;
                    }
                }

                if (!isPrint) {
                    const textWidth = bodyFontFamily.widthOfTextAtSize(message, bodyFontSize);
                    const xPosition = ((mmToPt(printModel.width) - textWidth) / 2) + (mmToPt(printModel.width) * (columnCount - 1));
                    const yPosition = height - marginTop - (bodyLineHeight * rowCount);

                    draw(page, message, xPosition, yPosition, bodyFontFamily, bodyFontSize,
                        bodyLineHeight, (columnCount > 1 ? gap : marginLeft));
                    rowCount++;
                }
            }
        });

        if (columnCount % printModel.collumn === 0) {
            if (i + 1 != copies) page = pdfDoc.addPage([width, height]);
            columnCount = 1;
            continue;
        }

        columnCount++;
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(tempPath, "", { flag: "w" });
    writeFileSync(tempPath, pdfBytes);
    log('arquivo temporario atualizado! - ' + tempPath);
}

export async function openFile(filePath: string) {
    exec(`start "" "${filePath}"`);
}

function draw(page: PDFPage, message: string, x: number, y: number, fontFamily: PDFFont, fontSize: number, lineHeight: number, gap: number) {
    const lines = message.split('\n');

    for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], {
            font: fontFamily,
            x: x + gap,
            y: y - lineHeight * i,
            size: fontSize,
            color: rgb(0, 0, 0),
        });
    }
}

function mmToPt(mm: number): number {
    return (mm / 25.4) * 72;
}
