// Visualização/edição de qualquer mês (acessada a partir de "Todos os Meses").
import React from 'react';
import { View } from 'react-native';
import MonthContent from '../components/MonthContent';

export default function MonthScreen({ route }) {
  const monthIndex = route?.params?.monthIndex ?? new Date().getMonth();
  return (
    <View style={{ flex: 1 }}>
      <MonthContent monthIndex={monthIndex} />
    </View>
  );
}
