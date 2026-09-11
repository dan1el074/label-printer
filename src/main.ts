import { app } from 'electron';
import {Application} from "./core/Application";

const application = new Application();

application.init().catch(error => {
    console.error('Erro ao iniciar a aplicação:', error);
    app.quit();
});
