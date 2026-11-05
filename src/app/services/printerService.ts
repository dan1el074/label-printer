import { WebContents } from 'electron';
import { Printer } from '../models/Printer';

export async function getPrinters(webContents: WebContents): Promise<Printable[]> {
    const printers = await webContents.getPrintersAsync();
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
    const sorted = printers.map(printer => new Printer(printer.name)).sort((first, second) => {
        const firstPriority = /zdesigner|etiqueta/i.test(first.name) ? 0 : 1;
        const secondPriority = /zdesigner|etiqueta/i.test(second.name) ? 0 : 1;
        return firstPriority - secondPriority || collator.compare(first.name, second.name);
    });
    return [...sorted, new Printer('Abrir arquivo')];
}
