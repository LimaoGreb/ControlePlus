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

// Prepara o SVG para renderização no react-native-svg:
// 1. Injeta viewBox se ausente (sem viewBox, RN clipa em vez de escalar)
// 2. Converte class="stX" para fill inline (RN tem suporte limitado a <style>)
// 3. Se whiteLogo, troca todos os fills por branco (logo colorido no próprio fundo)
function prepareSvg(svgString, bank) {
  let s = svgString;

  if (!s.includes('viewBox') && s.includes('width="2500"')) {
    s = s.replace('<svg ', '<svg viewBox="0 0 2500 2500" ');
  }

  const classMap = {};
  for (const m of s.matchAll(/\.([\w-]+)\{fill:([^;}]+)[;}]/g)) {
    classMap[m[1]] = m[2].trim();
  }
  if (Object.keys(classMap).length > 0) {
    s = s.replace(/class="([\w-\s]+)"/g, (_, classes) => {
      const first = classes.trim().split(/\s+/)[0];
      return classMap[first] ? `fill="${classMap[first]}"` : `class="${classes}"`;
    });
  }

  if (bank.whiteLogo) {
    s = s.replace(/fill="(?!none)[^"]+"/g, 'fill="#ffffff"');
  }

  return s;
}

export default function BankBadge({ bank, size = 28 }) {
  if (!bank) return null;
  const svgString = logos[bank.id];
  const radius = Math.round(size * 0.24);

  if (!svgString || bank.noLogo) return <TextBadge bank={bank} size={size} />;

  const svgInner = Math.round(size * 0.78);
  const prepared = prepareSvg(svgString, bank);

  return (
    <SVGErrorBoundary fallback={<TextBadge bank={bank} size={size} />}>
      <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: bank.color, alignItems: 'center', justifyContent: 'center' }}>
        <SvgXml xml={prepared} width={svgInner} height={svgInner} />
      </View>
    </SVGErrorBoundary>
  );
}
