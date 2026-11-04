interface Printable {
    name: string;
    print(temporaryFilePath: string, orientation?: 'portrait' | 'landscape'): Promise<string>;
}
