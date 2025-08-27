import { PDFDocument } from "pdf-lib";
import fs = require("fs/promises");

export async function pdfJoin(arrayCodePath: Array<string>, temporaryFile: string): Promise<Array<Array<number>>> {
    return new Promise(async (resolve, reject) => {
        try {
            const newPDF = await PDFDocument.create();
            const repeatMapper: Array<Array<number>> = [];

            for (let i=0; i<arrayCodePath.length; i++) {
                const PDFFile = await fs.readFile(arrayCodePath[i]);
                const pdf = await PDFDocument.load(PDFFile);
                const pdfSize = await pdf.getPageCount();

                if(pdfSize > 1) {
                    repeatMapper.push([i, pdfSize]);
                }

                const pages = await newPDF.copyPages(pdf, pdf.getPageIndices());
                pages.forEach((page) => newPDF.addPage(page));
            }

            const newPDFBytes = await newPDF.save();
            await fs.writeFile(temporaryFile, newPDFBytes);
            resolve(repeatMapper);
        } catch (error) {
            reject([`Erro! Arquivo não encontrado: ${error.path}`, error.path])
        }
    })
}
