// Palavras-chave por área jurídica
const KEYWORDS = {
  saude: [
    'plano de saúde',
    'plano de saude',
    'operadora',
    'ANS',
    'cobertura',
    'negativa de cobertura',
    'reembolso',
    'internação',
    'internacao',
    'procedimento cirúrgico',
    'procedimento cirurgico',
    'medicamento',
    'tratamento médico',
    'tratamento medico',
    'carência',
    'carencia',
    'sinistro',
    'seguro saúde',
    'seguro saude',
    'amil',
    'bradesco saúde',
    'sulamerica',
    'unimed',
    'hapvida',
  ],
  inss: [
    'INSS',
    'benefício previdenciário',
    'beneficio previdenciario',
    'aposentadoria',
    'auxílio-doença',
    'auxilio-doenca',
    'auxílio doença',
    'BPC',
    'LOAS',
    'incapacidade',
    'perícia médica',
    'pericia medica',
    'previdência social',
    'previdencia social',
    'pensão por morte',
    'pensao por morte',
    'salário-maternidade',
    'salario-maternidade',
    'auxílio-acidente',
    'auxilio-acidente',
    'regime geral',
    'segurado',
    'contribuição previdenciária',
    'contribuicao previdenciaria',
    'tempo de contribuição',
    'tempo de contribuicao',
  ],
  consumidor: [
    'CDC',
    'Código de Defesa do Consumidor',
    'Codigo de Defesa do Consumidor',
    'consumidor',
    'fornecedor',
    'dano moral',
    'dano material',
    'serasa',
    'SPC',
    'negativação',
    'negativacao',
    'inscrição indevida',
    'banco',
    'financeira',
    'financiamento',
    'contrato de adesão',
    'contrato de adesao',
    'cláusula abusiva',
    'clausula abusiva',
    'publicidade enganosa',
    'vício do produto',
    'vicio do produto',
    'recall',
    'tarifa bancária',
    'tarifa bancaria',
    'juros abusivos',
    'cartão de crédito',
    'cartao de credito',
    'empréstimo consignado',
    'emprestimo consignado',
  ],
  familia: [
    'alimentos',
    'guarda',
    'divórcio',
    'divorcio',
    'inventário',
    'inventario',
    'união estável',
    'uniao estavel',
    'pensão alimentícia',
    'pensao alimenticia',
    'partilha',
    'poder familiar',
    'adoção',
    'adocao',
    'curatela',
    'interdição',
    'interdicao',
    'filiação',
    'filiacao',
    'reconhecimento de paternidade',
    'bem de família',
    'bem de familia',
    'herança',
    'heranca',
    'testamento',
    'regime de bens',
    'casamento',
    'separação',
    'separacao',
  ],
};

const AREA_LABELS = {
  todas: 'Todas as Áreas',
  saude: 'Plano de Saúde',
  inss: 'INSS / Prev.',
  consumidor: 'Consumidor',
  familia: 'Família',
};

const AREA_ICONS = {
  todas: '⚖️',
  saude: '🏥',
  inss: '📋',
  consumidor: '🛡️',
  familia: '👨‍👩‍👧',
};

/**
 * Detecta qual área jurídica um texto pertence.
 * Retorna o ID da área ou null se não encontrar match.
 */
function detectArea(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  let bestArea = null;
  let bestCount = 0;

  for (const [area, keywords] of Object.entries(KEYWORDS)) {
    const count = keywords.filter((kw) =>
      lower.includes(kw.toLowerCase())
    ).length;
    if (count > bestCount) {
      bestCount = count;
      bestArea = area;
    }
  }

  return bestCount > 0 ? bestArea : null;
}

/**
 * Verifica se um texto corresponde a uma área específica.
 */
function matchesArea(text, area) {
  if (!text || !area || area === 'todas') return detectArea(text) !== null;
  const keywords = KEYWORDS[area] || [];
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

module.exports = { KEYWORDS, AREA_LABELS, AREA_ICONS, detectArea, matchesArea };
