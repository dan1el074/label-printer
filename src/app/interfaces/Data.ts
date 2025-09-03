interface Data {
    printerList: Array<Printable>;
    modelList: Array<PrintModel>;
    selectModel: PrintModel | null;
    temporaryFile: string;
    newModelPath?: string;
    newModelFileName?: string;
}
