import React from 'react';
import { View, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import * as logos from '../data/bankLogos';

// Badge de texto — fundo colorido, abreviação branca, estilo de ícone de app.
function TextBadge({ bank, size }) {
  const radius = Math.round(size * 0.24);
  const isLong = bank.abbr.length > 2;
  const fontSize = Math.round(size * (isLong ? 0.26 : 0.34));
  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: bank.color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        color: '#fff',
        fontSize,
        fontWeight: '900',
        letterSpacing: isLong ? -0.3 : -0.5,
        includeFontPadding: false,
        textAlignVertical: 'center',
      }}>
        {bank.abbr}
      </Text>
    </View>
  );
}

class SVGErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e) { console.warn('[BankBadge] SVG erro:', e.message); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Badge de banco: usa SVG quando disponível e confiável, TextBadge no resto.
export default function BankBadge({ bank, size = 28 }) {
  if (!bank) return null;
  const radius = Math.round(size * 0.24);

  const svgString = logos[bank.id];
  if (!svgString || bank.noSvg) return <TextBadge bank={bank} size={size} />;

  return (
    <SVGErrorBoundary fallback={<TextBadge bank={bank} size={size} />}>
      <View style={{
        width: size, height: size, borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: bank.color,
      }}>
        <SvgXml xml={svgString} width={size} height={size} />
      </View>
    </SVGErrorBoundary>
  );
}
