/**
 * openFinance.js — PLACEHOLDER / MÓDULO FUTURO (não implementado)
 * ================================================================
 *
 * Objetivo futuro: integrar o app ao ecossistema do Open Finance Brasil
 * para importar automaticamente as transações da conta bancária do usuário,
 * eliminando a digitação manual de despesas.
 *
 * ARQUITETURA PLANEJADA
 * ---------------------
 * O Open Finance Brasil é regulado pelo Banco Central (BCB). Para consumir
 * dados de uma instituição financeira é necessário:
 *
 *   1. Registro como Instituição Participante (ou parceria com uma "Receptora"
 *      já habilitada) no diretório do Open Finance Brasil.
 *   2. Certificados digitais ICP-Brasil (mTLS) — transport + signing — emitidos
 *      por uma AC credenciada, usados em toda comunicação com as APIs.
 *   3. Cadastro da aplicação no diretório central (client_id/software statement).
 *   4. Processo de homologação/conformidade junto ao BCB.
 *
 * FLUXO TÉCNICO (resumo)
 * ----------------------
 *   a) Consentimento: o usuário autoriza o compartilhamento via fluxo OAuth 2.0
 *      / FAPI (Financial-grade API) redirecionando para o banco detentor.
 *   b) Token: troca do authorization_code por access_token com mTLS.
 *   c) Consumo das APIs de "Accounts" e "Transactions" (padrão do BCB).
 *   d) Normalização das transações -> mapeamento para Despesas Fixas/Variáveis
 *      deste app -> gravação via services/storage.js.
 *
 * IMPORTANTE
 * ----------
 * Toda a parte sensível (certificados, troca de tokens, chamadas às APIs do
 * banco) NÃO deve rodar no dispositivo. O recomendado é um backend próprio
 * (ver pasta /server) que guarda os certificados com segurança e expõe um
 * endpoint simples para o app consumir as transações já normalizadas.
 *
 * Documentação oficial: https://openfinancebrasil.org.br/
 */

// Exemplo de assinatura da função que existirá no futuro:
export async function fetchTransactions(/* consentId, accountId */) {
  throw new Error(
    'Integração Open Finance ainda não implementada. Ver comentários neste arquivo e a pasta /server.'
  );
}

export default { fetchTransactions };
