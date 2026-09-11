import { WebContents } from 'electron';
import { Printer } from '../models/Printer';

export async function getPrinters(webContents: WebContents): Promise<Printable[]> {
    const printers = await webContents.getPrintersAsync();
    return [new Printer('Abrir arquivo'), ...printers.map(printer => new Printer(printer.name))];
}
