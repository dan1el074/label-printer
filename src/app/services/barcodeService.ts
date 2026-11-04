import { PDFFont, PDFPage, rgb } from 'pdf-lib';

const leftPatterns = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
];
const parityPatterns = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
];

/** Accepts a GTIN-13 or calculates its check digit from 12 digits. */
export function encodeEAN13(value: string): { value: string; modules: string } {
    if (typeof value !== 'string' || !/^\d{12,13}$/.test(value)) {
        throw new Error('EAN13: informe 12 ou 13 dígitos numéricos.');
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(value[i]) * (i % 2 === 0 ? 1 : 3);
    const checkDigit = String((10 - sum % 10) % 10);
    if (value.length === 13 && value[12] !== checkDigit) {
        throw new Error('EAN13: dígito verificador inválido. Esperado: ' + checkDigit + '.');
    }
    value = value.slice(0, 12) + checkDigit;
    const invert = (pattern: string): string => pattern.replace(/[01]/g, bit => bit === '0' ? '1' : '0');
    let modules = '101';
    const parity = parityPatterns[Number(value[0])];
    for (let i = 1; i <= 6; i++) {
        const pattern = leftPatterns[Number(value[i])];
        modules += parity[i - 1] === 'L' ? pattern : invert(pattern.split('').reverse().join(''));
    }
    modules += '01010';
    for (let i = 7; i < 13; i++) modules += invert(leftPatterns[Number(value[i])]);
    return { value, modules: modules + '101' };
}

export function resolveBarcodeValue(template: string, variables: PrintVariables[]): string {
    return template.replace(/%([^%]+)%/g, (_match: string, name: string): string => {
        const variable = variables.find(item => item.name === name);
        if (!variable || !variable.value || variable.value.length !== 1) {
            throw new Error('EAN13: informe um único valor para a variável ' + name + '.');
        }
        return variable.value[0];
    });
}

/** x/y and dimensions are in mm, relative to the top left of each label. */
export function drawEAN13(page: PDFPage, value: string, options: BodyOptions,
    labelWidth: number, labelHeight: number, columnOffset: number, font: PDFFont): void {
    const barcode = encodeEAN13(value);
    const width = options.width === undefined ? 37.29 : options.width;
    const height = options.height === undefined ? 25.93 : options.height;
    const x = options.x === undefined ? (labelWidth - width) / 2 : options.x;
    const y = options.y === undefined ? 0 : options.y;
    const fontSize = options.fontSize === undefined ? 8 : options.fontSize;
    if (![x, y, width, height, fontSize].every(item => typeof item === 'number' && Number.isFinite(item)) ||
        x < 0 || y < 0 || width <= 0 || height <= 0 || fontSize <= 0) {
        throw new Error('EAN13: posição, tamanho e fonte devem ser números válidos e positivos (x e y podem ser zero).');
    }
    if (x + width > labelWidth + 0.000001 || y + height > labelHeight + 0.000001) {
        throw new Error('EAN13: o código de barras ultrapassa os limites da etiqueta.');
    }
    const pt = (mm: number): number => mm * 72 / 25.4;
    // 95 encoded modules, plus mandatory quiet zones: 11 left and 7 right.
    const moduleWidth = pt(width) / 113;
    const showText = options.showText !== false;
    const textSpace = showText ? fontSize + 3 : 0;
    const barHeight = pt(height) - textSpace;
    const guardExtension = showText ? Math.min(5 * moduleWidth, textSpace / 2) : 0;
    if (barHeight <= 0 || (showText && font.widthOfTextAtSize(barcode.value, fontSize) > 95 * moduleWidth)) {
        throw new Error('EAN13: aumente o tamanho do código de barras ou reduza fontSize.');
    }
    const left = columnOffset + pt(x);
    const bottom = pt(labelHeight - y - height);
    page.drawRectangle({ x: left, y: bottom, width: pt(width), height: pt(height), color: rgb(1, 1, 1) });
    for (let i = 0; i < barcode.modules.length; i++) {
        if (barcode.modules[i] !== '1') continue;
        const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
        const extension = guard ? guardExtension : 0;
        page.drawRectangle({
            x: left + (11 + i) * moduleWidth, y: bottom + textSpace - extension,
            width: moduleWidth, height: barHeight + extension, color: rgb(0, 0, 0)
        });
    }
    if (showText) {
        // Keep the first digit outside the start guard, with six digits on each side.
        const drawDigit = (digit: string, center: number): void => {
            page.drawText(digit, { x: left + center * moduleWidth - font.widthOfTextAtSize(digit, fontSize) / 2,
                y: bottom + 1, size: fontSize, font, color: rgb(0, 0, 0) });
        };
        drawDigit(barcode.value[0], 5.5);
        for (let i = 1; i <= 6; i++) drawDigit(barcode.value[i], 14 + (i - 0.5) * 7);
        for (let i = 7; i <= 12; i++) drawDigit(barcode.value[i], 61 + (i - 6.5) * 7);
    }
}
