import { breakTextIntoLines, PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { concatTransformationMatrix, popGraphicsState, pushGraphicsState } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { log } from '../../app/services/logService';
import { shell } from 'electron';
import * as fs from 'fs';
import { drawEAN13, resolveBarcodeValue } from './barcodeService';
import { drawMonochromeSvg } from './svgService';

export async function createLabel(printModel: PrintModel, tempPath: string, copies: number): Promise<any> {
    const volumes = printModel.variables.find(variable => variable.name === 'volumes');
    const volumeMatch = volumes?.value?.length === 1 ? /^(\d+)x$/i.exec(volumes.value[0].trim()) : null;
    const volumeCount = volumeMatch ? Number(volumeMatch[1]) : undefined;
    if (volumeCount !== undefined && (!Number.isInteger(volumeCount) || volumeCount < 1 || volumeCount > 9999)) {
        throw new Error('Informe uma quantidade de volumes entre 1 e 9999 antes do X.');
    }
    const labelCount = volumeCount ?? copies;
    const rotated = printModel.options?.rotation === 90;
    const width = mmToPt(printModel.width * printModel.collumn + (rotated ? 0 : 10));
    const height = mmToPt(printModel.height);
    const layoutWidth = rotated ? printModel.height : printModel.width;
    const layoutHeight = rotated ? printModel.width : printModel.height;
    const tableLayout = printModel.options?.layout === 'table';
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

    for (let i=0; i<labelCount; i++) {
        let rowCount = 1;
        let tableTop = mmToPt(layoutHeight) - marginTop;
        const columnStart = mmToPt(printModel.width) * (columnCount - 1);
        const columnInset = columnCount > 1 ? gap : marginLeft;
        const horizontalOffset = (rotated ? 0 : columnStart) + columnInset;
        if (rotated) {
            // Rotate the label coordinate system clockwise within its physical column.
            page.pushOperators(pushGraphicsState(), concatTransformationMatrix(0, -1, 1, 0, columnStart, height));
        }

        for (const currentBody of printModel.body) {
            if (currentBody.type === 'svg') {
                // Images use absolute label coordinates, in millimeters, from the top-left.
                drawMonochromeSvg(page, currentBody.value, currentBody.options || {},
                    layoutWidth, layoutHeight, rotated ? 0 : columnStart);
                continue;
            }
            if (currentBody.type === 'barcode') {
                if (currentBody.format !== 'EAN13') throw new Error('Formato de código de barras inválido. Utilize EAN13.');
                drawEAN13(page, resolveBarcodeValue(currentBody.value, printModel.variables), currentBody.options || {},
                    layoutWidth, layoutHeight, horizontalOffset, await pdfDoc.embedFont(StandardFonts.Helvetica));
                continue;
            }
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
                const drawMessage = (text: string): void => {
                    const labelWidth = mmToPt(layoutWidth);
                    if (tableLayout) {
                        const tableWidth = labelWidth - columnInset - marginLeft;
                        const labelColumnWidth = tableWidth / 3;
                        const columnGap = printModel.options?.columnGap ?? mmToPt(2);
                        const rowPadding = mmToPt(2);
                        const boxHeight = mmToPt(currentBody.options?.writingBoxHeight ?? 0);
                        const valueFontSize = currentBody.options?.valueFontSize ?? bodyFontSize;
                        const rowHeight = Math.max(bodyLineHeight, boxHeight + rowPadding,
                            Math.max(bodyFontSize, valueFontSize) + rowPadding);
                        const rowCenter = tableTop - rowHeight / 2;
                        const valueX = labelColumnWidth + columnGap;
                        // Negative left margins must not extend the value column beyond the label's right edge.
                        const rightMargin = Math.max(0, marginLeft);
                        const valueWidth = Math.max(0, Math.min(tableWidth - valueX,
                            labelWidth - columnInset - valueX - rightMargin));
                        const drawCell = (value: string, x: number, width: number, alignment: 'left' | 'right' = 'left', cellFontSize = bodyFontSize): void => {
                            let cellText = value.replace(/\s+/g, ' ').trim();
                            if (!cellText) return;
                            if (currentBody.options?.ellipsis && bodyFontFamily.widthOfTextAtSize(cellText, cellFontSize) > width) {
                                while (cellText && bodyFontFamily.widthOfTextAtSize(cellText + '...', cellFontSize) > width) {
                                    cellText = cellText.slice(0, -1);
                                }
                                cellText = cellText.trimEnd() + '...';
                            }
                            const textWidth = bodyFontFamily.widthOfTextAtSize(cellText, cellFontSize);
                            const size = cellFontSize * Math.min(1, width / textWidth);
                            const baseline = rowCenter - bodyFontFamily.heightAtSize(size, { descender: false }) / 2;
                            const textX = alignment === 'right' ? x + width - bodyFontFamily.widthOfTextAtSize(cellText, size) : x;
                            draw(page, cellText, textX, baseline, bodyFontFamily, size, rowHeight, horizontalOffset);
                        };

                        drawCell(currentBody.label ?? '', 0, labelColumnWidth, printModel.options?.labelAlignment);
                        if (boxHeight > 0) {
                            page.drawRectangle({
                                x: horizontalOffset + valueX,
                                y: rowCenter - boxHeight / 2,
                                width: currentBody.options?.writingBoxWidth === undefined
                                    ? valueWidth : mmToPt(currentBody.options.writingBoxWidth),
                                height: boxHeight,
                                borderColor: rgb(0, 0, 0),
                                borderWidth: 0.6,
                            });
                        } else {
                            const maxWidth = mmToPt(currentBody.options?.maxWidth ?? 0);
                            drawCell(text, valueX, maxWidth > 0 ? Math.min(valueWidth, maxWidth) : valueWidth, 'left', valueFontSize);
                        }
                        tableTop -= rowHeight;
                        return;
                    }
                    const maxWidth = mmToPt(currentBody.options?.maxWidth || 0);
                    const maxLines = currentBody.options?.maxLines;
                    const measure = (line: string): number => bodyFontFamily.widthOfTextAtSize(line, bodyFontSize);
                    let lines = maxWidth > 0 ? breakTextIntoLines(text, [' '], maxWidth, measure) : [text];
                    if (maxLines === 2 && lines.length > 1 && !text.includes('\n')) {
                        lines = balanceTwoLines(text, measure);
                    }
                    if (Number.isInteger(maxLines) && maxLines > 0 && lines.length > maxLines) {
                        const remaining = lines.splice(maxLines - 1);
                        lines.push(remaining.map(line => line.trim()).join(' '));
                    }
                    const widestLine = Math.max(0, ...lines.map(measure));
                    const scale = maxWidth > 0 && widestLine > maxWidth ? maxWidth / widestLine : 1;
                    for (const line of lines) {
                        const lineWidth = measure(line);
                        const x = (labelWidth - lineWidth * scale) / 2;
                        const y = mmToPt(layoutHeight) - marginTop - bodyLineHeight * rowCount;
                        draw(page, line, x, y, bodyFontFamily, bodyFontSize * scale, bodyLineHeight, horizontalOffset);
                        rowCount++;
                    }
                };

                for (let j = 0; j < printModel.variables.length; j++) {
                    const variable = printModel.variables[j];
                    const placeholder = `%${variable.name}%`;
                    if (!currentBody.value.includes(placeholder)) continue;

                    for (const value of variable.value ?? []) {
                        const printedValue = variable === volumes && volumeCount !== undefined
                            ? `${i % volumeCount + 1}/${volumeCount}` : value;
                        drawMessage(message.replace(placeholder, () => printedValue));
                        isPrint = true;
                    }
                }

                if (!isPrint) drawMessage(message);
            }
        }

        if (rotated) page.pushOperators(popGraphicsState());

        if (columnCount % printModel.collumn === 0) {
            if (i + 1 != labelCount) page = pdfDoc.addPage([width, height]);
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
    const error = await shell.openPath(filePath);
    if (error) throw new Error('Não foi possível abrir o PDF: ' + error);
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

function balanceTwoLines(text: string, measure: (line: string) => number): string[] {
    const words = text.trim().split(/\s+/);
    let bestLines = [text];
    let bestWidth = Infinity;
    for (let split = 1; split < words.length; split++) {
        const first = words.slice(0, split).join(' ');
        const second = words.slice(split).join(' ');
        const width = Math.max(measure(first), measure(second));
        if (width < bestWidth) {
            bestWidth = width;
            bestLines = [first, second];
        }
    }
    return bestLines;
}
