interface FoccoItem {
    cod_item: string;
    desc_tecnica: string;
    cod_barra: string;
}

interface FoccoSale {
    num_pedido: number | string;
    cliente: string;
    cidade: string;
}

interface FoccoResponse<T> {
    succeeded?: boolean;
    failed?: boolean;
    value?: T[];
}

export async function getFoccoItem(itemCode: string, exportKey?: string, bearerToken?: string): Promise<FoccoItem> {
    const code = itemCode?.trim();
    if (!code || !/^\d+$/.test(code)) {
        throw new Error('Informe o código numérico do item no FoccoERP.');
    }
    const rows = await getFoccoExport<FoccoItem>('portal_cod_barras', 'cod_item', code, 'item', exportKey, bearerToken);
    const item = rows.find(row => row?.cod_item === code);
    if (!item) throw new Error(`Item ${code} não encontrado no FoccoERP.`);
    if (typeof item.desc_tecnica !== 'string' || !item.desc_tecnica.trim() ||
        typeof item.cod_barra !== 'string' || !item.cod_barra.trim()) {
        throw new Error(`O item ${code} está sem descrição técnica ou código de barras no FoccoERP.`);
    }
    return {
        cod_item: code,
        desc_tecnica: item.desc_tecnica.replace(/\s+/g, ' ').trim(),
        cod_barra: item.cod_barra.trim()
    };
}

export async function getFoccoSale(orderNumber: string, exportKey?: string, bearerToken?: string): Promise<FoccoSale> {
    const order = orderNumber?.trim();
    if (!order || !/^\d+$/.test(order)) throw new Error('Informe o número do pedido no FoccoERP.');
    const rows = await getFoccoExport<FoccoSale>('portal_etiqueta_venda', 'num_pedido', order, 'pedido', exportKey, bearerToken);
    const sale = rows.find(row => row?.num_pedido != null && String(row.num_pedido).replace(/^0+(?=\d)/, '') === order.replace(/^0+(?=\d)/, ''));
    if (!sale) throw new Error(`Pedido ${order} não encontrado no FoccoERP.`);
    if (typeof sale.cliente !== 'string' || !sale.cliente.trim() || typeof sale.cidade !== 'string' || !sale.cidade.trim()) {
        throw new Error(`O pedido ${order} está sem cliente ou cidade no FoccoERP.`);
    }
    return { num_pedido: sale.num_pedido, cliente: sale.cliente.replace(/\s+/g, ' ').trim(), cidade: sale.cidade.replace(/\s+/g, ' ').trim() };
}

async function getFoccoExport<T>(endpoint: string, parameter: string, value: string, subject: string,
    exportKey?: string, bearerToken?: string): Promise<T[]> {
    const key = typeof exportKey === 'string' ? exportKey.trim() : '';
    if (!key) throw new Error('Configure a chave de integração foccoErpKey no config.json.');
    const token = typeof bearerToken === 'string' ? bearerToken.trim() : '';
    if (!token) throw new Error('Configure o token foccoErpBearerToken no config.json.');

    const url = new URL(`https://metaro.foccoerp.com.br/FoccoIntegrador/api/v1/Exportacao/${endpoint}`);
    url.searchParams.set('Chave', key);
    url.searchParams.set(parameter, value);

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
            redirect: 'error'
        });
    } catch {
        throw new Error('Não foi possível conectar ao FoccoERP. Verifique a conexão e tente novamente.');
    }
    if (response.status === 401) {
        throw new Error(`O FoccoERP recusou a autenticação (HTTP 401). Confira se foccoErpBearerToken está válido e se foccoErpKey está autorizada para a exportação ${endpoint} no config.json.`);
    }
    if (!response.ok) throw new Error(`O FoccoERP retornou HTTP ${response.status} ao consultar o ${subject}.`);

    let result: FoccoResponse<T>;
    try {
        result = await response.json();
    } catch {
        throw new Error('Não foi possível ler a resposta do FoccoERP.');
    }
    if (!result || result.failed || result.succeeded !== true || !Array.isArray(result.value)) {
        throw new Error(`O FoccoERP não concluiu a consulta do ${subject}.`);
    }
    return result.value;
}
