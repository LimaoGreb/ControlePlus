import React from 'react';
import { View, Text } from 'react-native';

const LOGOS = {
  nubank:      require('../../assets/banks/nubank.svg'),
  c6:          require('../../assets/banks/c6.svg'),
  inter:       require('../../assets/banks/inter.svg'),
  picpay:      require('../../assets/banks/picpay.svg'),
  itau:        require('../../assets/banks/itau.svg'),
  bradesco:    require('../../assets/banks/bradesco.svg'),
  santander:   require('../../assets/banks/santander.svg'),
  bb:          require('../../assets/banks/bb.svg'),
  caixa:       require('../../assets/banks/caixa.svg'),
  neon:        require('../../assets/banks/neon.svg'),
  next:        require('../../assets/banks/next.svg'),
  pagbank:     require('../../assets/banks/pagbank.svg'),
  mercadopago: require('../../assets/banks/mercadopago.svg'),
  sicoob:      require('../../assets/banks/sicoob.svg'),
  recargapay:  require('../../assets/banks/recargapay.svg'),
};

export default function BankBadge({ bank, size = 28 }) {
  if (!bank) return null;

  const Logo = LOGOS[bank.id];
  const radius = Math.round(size * 0.28);

  if (Logo) {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        overflow: 'hidden', backgroundColor: bank.color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Logo width={size} height={size} />
      </View>
    );
  }

  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: bank.color, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: Math.round(size * 0.38), fontWeight: '900', letterSpacing: -0.5 }}>
        {bank.abbr}
      </Text>
    </View>
  );
}
