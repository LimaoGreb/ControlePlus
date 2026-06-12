import React from 'react';
import { View, Text } from 'react-native';

export default function BankBadge({ bank, size = 28 }) {
  if (!bank) return null;
  const radius = Math.round(size * 0.28);
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: bank.color,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        color: '#fff',
        fontSize: Math.round(size * 0.38),
        fontWeight: '900',
        letterSpacing: -0.5,
      }}>
        {bank.abbr}
      </Text>
    </View>
  );
}
