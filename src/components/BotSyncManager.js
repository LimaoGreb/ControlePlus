// Componente invisível que escuta o Firebase pelo Jarvis Bot e adiciona despesas.
// Só ativa quando o usuário configurou o Telegram Chat ID nas Configurações.
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useBotSync } from '../hooks/useBotSync';

export default function BotSyncManager() {
  const { addItem } = useData();
  const { telegramChatId } = useSettings();
  useBotSync(telegramChatId, addItem);
  return null;
}
