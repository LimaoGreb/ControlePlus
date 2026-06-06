// "Cérebro" de frases-reação: gera mensagens divertidas com base nos gastos.
// Quanto mais variado o valor/nome, mais diferente a frase (evita repetir igual
// pra pessoas diferentes). A árvore de marcas/lojas é bem ampla.
import { monthTotals } from './calculations';

// Escolhe uma frase de forma estável por (texto-semente) — mas como a semente
// inclui o valor, dois gastos do mesmo nome com valores diferentes variam.
function pick(phrases, seed) {
  let h = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i) * 7 + 13) % 1000003;
  return phrases[h % phrases.length];
}

// Regras por palavra-chave/marca. group ajuda a agrupar marcas parecidas.
const RULES = [
  {
    keys: ['ifood', 'i food', 'rappi', 'delivery', 'uber eats', 'ubereats', 'ze delivery', 'zé delivery', '99 food', 'aiqfome'],
    phrases: [
      'Gastando bem com delivery, hein... que tal cozinhar uma janta pelo menos uma vez? 🍳',
      'O entregador já te chama pelo nome 😅 bora de marmita essa semana?',
      'Esse delivery tá comendo o seu salário 🍔',
      'Taxa de entrega + gorjeta + saudade da cozinha = 💸',
      'Já pensou no quanto daria pra economizar cozinhando 2x na semana? 👀',
    ],
  },
  {
    keys: ['shein', 'shopee', 'aliexpress', 'ali express', 'wish', 'temu'],
    phrases: [
      'Comprinhas internacionais de novo? 📦 cuidado pra não virar vício de carrinho!',
      'Shein/Shopee é uma cilada boa... R$10 aqui, R$15 ali, e no fim do mês 😬',
      'O carteiro tá fazendo hora extra por sua causa 📬😂',
      'Frete grátis é a maior armadilha do varejo, hein 👀',
    ],
  },
  {
    keys: ['amazon', 'mercado livre', 'mercadolivre', 'magalu', 'magazine', 'americanas', 'casas bahia', 'kabum', 'pichau'],
    phrases: [
      'Mais um pacote a caminho? 📦 a dopamina da compra é traiçoeira!',
      'Comprou de novo? Pelo menos pesquisou o preço em 3 lugares? 🔍',
      'O app de compras virou seu melhor amigo, né 😅',
    ],
  },
  {
    keys: ['renner', 'riachuelo', 'c&a', 'cea', 'zara', 'roupa', 'shopping', 'calça', 'calca', 'tênis', 'tenis', 'sapato', 'camisa', 'mochila', 'nike', 'adidas', 'centauro', 'vestido'],
    phrases: [
      'Renovando o guarda-roupa? Tá fashion, mas tá gastando 👗',
      'Mais uma peça nova? O armário já tá pedindo socorro 😅',
      'Tá se vestindo bem, só não vista a carteira de prejuízo 😂',
      'Roupa nova é dopamina cara, hein 👕',
    ],
  },
  {
    keys: ['setup', 'mouse', 'teclado', 'headset', 'monitor', 'webcam', 'gpu', 'placa de video', 'placa de vídeo', 'ssd', 'gabinete', 'pc', 'processador', 'ram', 'memória', 'memoria', 'fone', 'cadeira gamer', 'adaptador', 'notebook', 'kabum', 'pichau'],
    phrases: [
      'Seu setup ainda não tá perfeito? Com o tanto que você investe nele 🖥️😂',
      'Mais um upgrade no PC? Logo ele pede pra dirigir 🚗',
      'Tech é vida, mas a carteira tá sentindo 👀',
      'O PC dos sonhos é um buraco negro de dinheiro, confia 🕳️💸',
    ],
  },
  {
    keys: ['mercado', 'supermercado', 'carrefour', 'atacad', 'assaí', 'assai', 'feira', 'hortifruti', 'extra', 'pão de açúcar', 'pao de acucar', 'big', 'sam', 'tonin', 'dia'],
    phrases: [
      'Mercado tá caro mesmo 🛒 fica de olho nas promoções!',
      'Foi só "pão e leite" que virou R$200 de novo? 😂',
      'Lista de compras existe pra ser ignorada, né 📝😅',
      'Dica: não vá ao mercado com fome 🤤💸',
    ],
  },
  {
    keys: ['uber', '99', 'passagem', 'gasolina', 'combustível', 'combustivel', 'ônibus', 'onibus', 'metrô', 'metro', 'shell', 'ipiranga', 'petrobras', 'posto', 'estacionamento', 'pedágio', 'pedagio'],
    phrases: [
      'Rodando bastante esse mês, hein 🚗',
      'Transporte tá pesando — será que rola uma carona ou bike? 🚲',
      'O combustível não dá trégua, né 💀⛽',
    ],
  },
  {
    keys: ['spotify', 'netflix', 'prime', 'disney', 'hbo', 'max', 'cloud', 'assinatura', 'youtube', 'plano', 'deezer', 'crunchyroll', 'globoplay', 'paramount', 'apple'],
    phrases: [
      'Quantas assinaturas você tem mesmo? Hora de revisar 📺',
      'Streaming demais — será que assiste tudo? 🍿',
      'R$30 aqui, R$25 ali... as assinaturas somam um dinheirão 👀',
      'Tá pagando por serviço que nem lembra que tem? 😅',
    ],
  },
  {
    keys: ['steam', 'game', 'jogo', 'joguito', 'playstation', 'ps5', 'xbox', 'nintendo', 'skin', 'gacha', 'mine', 'riot', 'valorant', 'gift card', 'giftcard', 'robux'],
    phrases: [
      'Investindo nos joguinhos, né? 🎮 que a diversão valha o preço!',
      'Mais um joguito? A pilha de não-jogados agradece 😂',
      'Skin nova não melhora seu aim, mas melhora o ego 😎',
      'Gastou com game? Só não esquece de jogar os que já tem 🕹️',
    ],
  },
  {
    keys: ['bar', 'cerveja', 'balada', 'festa', 'rolê', 'role', 'lanche', 'lanchudo', 'restaurante', 'pizza', 'mc donalds', 'mcdonalds', 'burger king', 'bk', 'bobs', 'subway', 'starbucks', 'café', 'cafe', 'açaí', 'acai', 'sorvete'],
    phrases: [
      'Curtindo a vida, né? 🍻 só não exagera no fim do mês',
      'Rolê bom, mas a sobra agradece moderação 😄',
      'Fast food é rápido pra comer e pra esvaziar a carteira 🍔',
      'Café de R$15 todo dia vira um carro no fim do ano ☕😂',
    ],
  },
  {
    keys: ['academia', 'farmácia', 'farmacia', 'remédio', 'remedio', 'médico', 'medico', 'gym', 'dentista', 'smartfit', 'drogasil', 'pacheco', 'raia', 'pague menos', 'suplemento', 'whey'],
    phrases: [
      'Investir em saúde é sempre um bom gasto 💪',
      'Saúde em dia! Equilíbrio é tudo 🧘',
      'Academia que você paga e não vai é o gasto mais caro de todos 😂',
      'Cuidar do corpo é investimento, segue firme 💊',
    ],
  },
  {
    keys: ['casa', 'aluguel', 'condomínio', 'condominio', 'luz', 'energia', 'água', 'agua', 'internet', 'das', 'iptu', 'gás', 'gas', 'reforma', 'móveis', 'moveis'],
    phrases: [
      'Contas da casa são chatas, mas necessárias 🏠',
      'Os boletos sempre dão um oi todo mês, né? 📄',
      'Casa é aquele gasto que não dá pra fugir 🙃',
      'Morar custa caro, mas dormir no sofá dos outros custa mais 😂',
    ],
  },
  {
    keys: ['presente', 'aniversário', 'aniversario', 'natal', 'amigo secreto', 'flores', 'floricultura', 'alianças', 'aliancas'],
    phrases: [
      'Gastando com quem ama? Isso não tem preço (mas tem, e tá aqui 😂)',
      'Presente é amor em forma de boleto 🎁❤️',
      'Generoso(a)! Só não esquece de você também 😉',
    ],
  },
  {
    keys: ['pet', 'cachorro', 'gato', 'ração', 'racao', 'petz', 'cobasi', 'veterinário', 'veterinario', 'vacina pet'],
    phrases: [
      'Mimando o bichinho, né? 🐶 eles merecem (e custam) 😂',
      'Pet é família — e família a gente não economiza 🐾',
    ],
  },
];

// Frase para um item específico (pelo nome + valor). Retorna string ou null.
export function getItemInsight(name, value = 0) {
  const n = (name || '').toLowerCase();
  if (!n.trim()) return null;
  for (const rule of RULES) {
    if (rule.keys.some((k) => n.includes(k))) {
      return pick(rule.phrases, `${n}|${value}`);
    }
  }
  return null;
}

// Frases genéricas quando a loja não é reconhecida (variando pelo valor).
const GENERIC = [
  '"%N" foi o seu maior gasto aqui. Vale ficar de olho 👀',
  '"%N" pesou no bolso esse mês — tá valendo a pena? 🤔',
  '"%N" lidera os gastos. Bora monitorar de perto 📊',
  '"%N" foi o campeão de gastos. Atenção redobrada 👇',
];

// Frase para uma categoria (olha o item de maior valor).
export function getCategoryInsight(items) {
  const valid = (items || []).filter((i) => (Number(i.value) || 0) > 0);
  if (!valid.length) return null;
  const top = [...valid].sort((a, b) => (b.value || 0) - (a.value || 0))[0];
  const ins = getItemInsight(top.name, top.value);
  if (ins) return ins;
  return pick(GENERIC, `${top.name}|${top.value}`).replace('%N', top.name || 'Esse gasto');
}

// Frase geral do mês, com base nos totais (varia conforme os valores).
export function getMonthInsight(month) {
  const t = monthTotals(month);
  if (t.rendaTotal <= 0 && t.despesaTotal <= 0) return null;
  const seed = `${Math.round(t.sobraTotal)}|${Math.round(t.despesaTotal)}|${Math.round(t.rendaTotal)}`;

  if (t.sobraTotal < 0) {
    return pick(
      [
        'Eita! Mês no vermelho 🥵 As saídas passaram a renda — bora ajustar?',
        'Tá gastando mais do que ganha esse mês 😬 atenção nos próximos lançamentos!',
        'Mês no negativo 📉 dá uma revisada nos gastos variáveis, costuma ser ali o vazamento.',
        'Saldo negativo é sinal de alerta vermelho 🚨 nada de pânico, mas é hora de segurar.',
      ],
      seed
    );
  }
  if (t.percentGasto >= 90) {
    return pick(
      [
        'Quase toda a renda foi embora esse mês 😬 sobrou bem pouquinho.',
        'No limite! Gastou quase tudo que entrou 😅 cuidado com imprevistos.',
        'Tá raspando o tacho esse mês 🥄 quase 100% da renda comprometida.',
      ],
      seed
    );
  }
  if (t.variableTotal > t.fixedTotal * 1.2 && t.variableTotal > 0) {
    return pick(
      [
        'Seus gastos variáveis estão altos — é aí que mora o perigo 👀',
        'Os variáveis passaram os fixos. Geralmente é onde dá pra economizar mais 💡',
        'Muito gasto solto esse mês 🎈 vale revisar os variáveis.',
      ],
      seed
    );
  }
  if (t.rendaTotal > 0 && t.sobraTotal / t.rendaTotal >= 0.3) {
    return pick(
      [
        'Mandou bem! Sobrou um bom pedaço da renda esse mês 🎉',
        'Boa! Tá guardando uma graninha — segue assim 💪',
        'Que mês equilibrado! Sobrou bem, dá até pra investir um pouco 📈',
        'Disciplina financeira em dia 👏 a sobra agradece.',
      ],
      seed
    );
  }
  return pick(
    [
      'Tá no controle 👍 segue acompanhando os gastos!',
      'Mês equilibrado por enquanto ⚖️ continue de olho.',
      'Tudo sob controle até aqui 🙂 bora manter o ritmo.',
    ],
    seed
  );
}
