interface Data {
    printerList: Array<Printable>;
    modelList: Array<string>;
    selectModel: PrintModel | null;
    temporaryFile: string;
    newModelPath?: string;
    newModelFileName?: string;
}
