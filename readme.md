# Aplicação ImprimeEtiquetas

[![Static Badge](https://img.shields.io/badge/status-finished-green)](#) [![Static Badge](https://img.shields.io/badge/release-v1.5-blue)](https://github.com/dan1el074/label-printer/releases/tag/1.5)

Este projeto é uma aplicação desktop em **Node.js**, usando **TypeScript** com o framework **Electron.js**, desenvolvida para o setor de engenharia da empresa [Metaro Indústria e Comércio LTDA](https://www.metaro.com.br).

## Pré-requisitos

Os scripts só funcionam no Windows, portanto faça tudo dentro do "**CMD**" ou "**Power Shell**" para que não aconteça nenhum erro. Para executar a aplicação, certifique-se de que o seguinte esteja instalado:

- [Node.js](https://nodejs.org/en/download/current) (versão 12 ou superior)
- [Git](https://git-scm.com/download/win) (sistema de controle de versões)

## Pré-configuração

1. Clone este repositório para o seu ambiente local:

    ```bash
    git clone git@github.com:dan1el074/label-printer.git 
    ```

2. Navegue até o diretório do projeto:

   ```bash
    cd label-printer
    ```

3. Instale as dependências:

    ```bash
    npm install
    ```
    
## Iniciar aplicação:

Rode o seguinte comando no terminal:

```bash
npm run start:dev
```

## Criar executável:

Rode o seguinte comando no terminal:

```bash
npm run build:prod 
```

## Código de barras EAN13

Para incluir um código nos modelos, adicione um elemento ao `body`:

```json
{
    "type": "barcode",
    "format": "EAN13",
    "value": "%codigo%",
    "options": {
        "x": 5,
        "y": 6,
        "width": 40,
        "height": 22,
        "showText": true,
        "fontSize": 9
    }
}
```

## Mais opções de customização:

| Opção | Descrição | Padrão |
| --- | --- | --- |
| `x` | Distância da borda esquerda da etiqueta, em mm | Centralizado |
| `y` | Distância da borda superior da etiqueta, em mm | `0` |
| `width` | Largura total, incluindo margens brancas de leitura, em mm | `37.29` |
| `height` | Altura total, incluindo os números quando visíveis, em mm | `25.93` |
| `showText` | Exibe os 13 dígitos abaixo das barras | `true` |
| `fontSize` | Tamanho dos números, em pontos | `8` |
