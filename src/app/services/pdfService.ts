import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { log } from '../../app/services/logService';
import { exec } from "child_process";
import * as fs from "fs";

export async function createLabel(printModel: PrintModel, tempPath: string): Promise<any> {
    const width = mmToPt((printModel.width * printModel.collumn) + 10);
    const height = mmToPt(printModel.height);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);
    let fontFamily = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // default values
    let fontSize = 10;
    let bold = true;
    let lineHeight = 10;
    let gap = 0;
    let marginLeft = 10;

    // custom values
    if (printModel.options) {
        if (printModel.options.fontSize) fontSize = printModel.options.fontSize
        if (printModel.options.bold) bold = printModel.options.bold
        if (printModel.options.lineHeight) lineHeight = printModel.options.lineHeight
        if (printModel.options.gap) gap = printModel.options.gap
        if (printModel.options.marginLeft) marginLeft = printModel.options.marginLeft
    }

    if (!bold) {
        fontFamily = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

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
                        message = message.replace(`%${printModel.variables[j].name}%`, printModel.variables[j].value[x]);
                    }
                }
            }
        });

        draw(page, message, (mmToPt(printModel.width) * i), height - lineHeight, fontFamily, fontSize,
            lineHeight, (i > 0 ? gap : marginLeft));
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(tempPath, "", { flag: "w" });
    writeFileSync(tempPath, pdfBytes);
    log('arquivo temporario atualizado! - ' + tempPath);
}

export async function copyPages(tempPath: string, copyNumber: number) {
    if (copyNumber <=1) return;

    const existingPdfBytes = fs.readFileSync(tempPath);
    const existingPdf = await PDFDocument.load(existingPdfBytes);

    const newPdf = await PDFDocument.create();
    const [originalPage] = await newPdf.copyPages(existingPdf, [0]);

    for (let i=0; i<copyNumber; i++) {
        newPdf.addPage(originalPage);
    }

    const pdfBytes = await newPdf.save();
    fs.writeFileSync(tempPath, pdfBytes);
}

export async function openFile(filePath: string) {
    exec(`start "" "${filePath}"`);
}

function draw(page: PDFPage, message: string, x: number, y: number, fontFamily: PDFFont, fontSize: number, lineHeight: number, gap: number) {
    const lines = message.split('\n');

    for (let i=0; i<lines.length; i++) {
        page.drawText(lines[i], {
            font: fontFamily,
            x: x + gap,
            y: y - (lineHeight * i),
            size: fontSize,
            color: rgb(0, 0, 0),
        });
    }
}

function mmToPt(mm: number): number {
    return (mm / 25.4) * 72;
}
