interface Data {
    printerList: Array<Printable>;
    modelList: Array<PrintModel>;
    selectModel: PrintModel | null;
    temporaryPath: string;
    newModelPath?: string;
    newModelFileName?: string;
}
