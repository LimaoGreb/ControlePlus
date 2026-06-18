// Carrega todos os dados necessários para renderizar os widgets.
// Chamado tanto pelo widgetTaskHandler quanto pelo updateAllWidgets.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { monthTotals } from '../utils/calculations';

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export async function loadWidgetData() {
  try {
    const year  = new Date().getFullYear();
    const month = new Date().getMonth();
    const DATA_KEY = `@financas:dados:${year}`;

    const [raw, invRaw, projRaw, paymRaw] = await Promise.all([
      AsyncStorage.getItem(DATA_KEY),
      AsyncStorage.getItem('@financas:investimentos'),
      AsyncStorage.getItem('@financas:projetos'),
      AsyncStorage.getItem('@financas:formasPagamento'),
    ]);

    const finData        = raw      ? JSON.parse(raw)      : null;
    const monthData      = finData?.months?.[month]        || {};
    const investments    = invRaw   ? JSON.parse(invRaw)   : [];
    const projects       = projRaw  ? JSON.parse(projRaw)  : [];
    const paymentMethods = paymRaw  ? JSON.parse(paymRaw)  : [];

    return {
      month,
      monthName: MONTH_NAMES[month],
      year,
      monthData,
      totals:         monthTotals(monthData),
      investments:    Array.isArray(investments)    ? investments    : [],
      projects:       Array.isArray(projects)       ? projects       : [],
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : [],
    };
  } catch {
    const month = new Date().getMonth();
    return {
      month,
      monthName: MONTH_NAMES[month],
      year: new Date().getFullYear(),
      monthData: {},
      totals: { rendaTotal: 0, despesaTotal: 0, sobraTotal: 0, percentGasto: 0, outflowTotal: 0 },
      investments: [],
      projects: [],
      paymentMethods: [],
    };
  }
}
