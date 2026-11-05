import { PDFPage, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

// Supports monochrome SVGs made of filled paths with a viewBox.
// Paths stay vector-based so thermal printing does not depend on bitmap resolution.
export function drawMonochromeSvg(page: PDFPage, filename: string, options: BodyOptions,
    labelWidth: number, labelHeight: number, columnStart: number): void {
    const resources = path.resolve(__dirname, '../../resources');
    const file = path.resolve(resources, filename);
    if (!file.startsWith(resources + path.sep)) throw new Error('Caminho da imagem SVG inválido.');
    const svg = fs.readFileSync(file, 'utf8');
    const viewBox = /\bviewBox\s*=\s*["']([^"']+)["']/i.exec(svg);
    const dimensions = viewBox?.[1].trim().split(/[\s,]+/).map(Number);
    if (!dimensions || dimensions.length !== 4 || dimensions.some(n => !Number.isFinite(n))
        || dimensions[2] <= 0 || dimensions[3] <= 0) {
        throw new Error('A imagem SVG precisa de um viewBox válido.');
    }
    const x = options.x ?? 0;
    const y = options.y ?? 0;
    const width = options.width ?? labelWidth;
    const height = options.height ?? width * dimensions[3] / dimensions[2];
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0
        || x + width > labelWidth || y + height > labelHeight) {
        throw new Error('A imagem SVG deve ficar dentro dos limites da etiqueta.');
    }
    const mmToPt = (value: number): number => value / 25.4 * 72;
    const scale = Math.min(mmToPt(width) / dimensions[2], mmToPt(height) / dimensions[3]);
    const paths = /<path\b[^>]*\sd\s*=\s*(["'])([\s\S]*?)\1[^>]*>/gi;
    let match: RegExpExecArray | null;
    let count = 0;
    while ((match = paths.exec(svg)) !== null) {
        page.drawSvgPath(match[2], {
            x: columnStart + mmToPt(x) - dimensions[0] * scale,
            y: mmToPt(labelHeight - y) + dimensions[1] * scale,
            scale,
            color: rgb(0, 0, 0),
            borderWidth: 0,
        });
        count++;
    }
    if (count === 0) throw new Error('A imagem SVG precisa conter traçados path.');
}
