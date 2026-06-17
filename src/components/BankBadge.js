import React from 'react';
import { View, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import * as logos from '../data/bankLogos';

// Fallback quando o SVG não existe ou falha.
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
        color: '#fff', fontSize, fontWeight: '900',
        letterSpacing: isLong ? -0.3 : -0.5,
        includeFontPadding: false,
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

export default function BankBadge({ bank, size = 28 }) {
  if (!bank) return null;
  const svgString = logos[bank.id];
  const radius = Math.round(size * 0.24);

  if (!svgString) return <TextBadge bank={bank} size={size} />;

  // lightBg: logo com paths coloridos precisa de fundo branco pra aparecer.
  // Fundo branco + borda colorida fina usando View externo (sem borderWidth
  // dentro de overflow:hidden, que causa crash no SvgXml em alguns devices).
  const bg = bank.lightBg ? '#fff' : bank.color;

  // SVG renderizado 15% maior que o badge e centralizado via margem negativa.
  // Isso enquadra logos que têm conteúdo descentrado no viewBox original.
  const svgSize = Math.round(size * 1.15);
  const offset = -Math.round((svgSize - size) / 2);

  return (
    <SVGErrorBoundary fallback={<TextBadge bank={bank} size={size} />}>
      {bank.lightBg ? (
        // Anel colorido via View externo (padding) + inner branco sem border
        <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bank.color, padding: 1.5 }}>
          <View style={{ flex: 1, borderRadius: Math.max(0, radius - 2), overflow: 'hidden', backgroundColor: '#fff' }}>
            <SvgXml xml={svgString} width={svgSize - 3} height={svgSize - 3} style={{ margin: offset }} />
          </View>
        </View>
      ) : (
        <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: bg }}>
          <SvgXml xml={svgString} width={svgSize} height={svgSize} style={{ margin: offset }} />
        </View>
      )}
    </SVGErrorBoundary>
  );
}
