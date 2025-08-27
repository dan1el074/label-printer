interface windowOptions {
    title: string,
    icon: string;
    width: number;
    height: number;
    maxWidth?: number,
    maxHeight?: number,
    fullscreenable?: boolean,
    resizable?: boolean,
    frame?: boolean,
    webPreferences: WebPreferences;
}
