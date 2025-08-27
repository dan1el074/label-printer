interface Printable {
    name: string;
    print(temporaryFilePath: string): Promise<string>;
}