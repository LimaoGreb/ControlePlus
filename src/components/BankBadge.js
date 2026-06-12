import React from 'react';
import { View, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import * as logos from '../data/bankLogos';

function TextBadge({ bank, size }) {
  const radius = Math.round(size * 0.28);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bank.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: Math.round(size * 0.38), fontWeight: '900', letterSpacing: -0.5 }}>
        {bank.abbr}
      </Text>
    </View>
  );
}

class SVGErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e) { console.warn('[BankBadge] SVG crash:', e.message); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function BankBadge({ bank, size = 28 }) {
  if (!bank) return null;
  const svgString = logos[bank.id];
  const radius = Math.round(size * 0.28);
  if (!svgString) return <TextBadge bank={bank} size={size} />;
  return (
    <SVGErrorBoundary fallback={<TextBadge bank={bank} size={size} />}>
      <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: bank.color }}>
        <SvgXml xml={svgString} width={size} height={size} />
      </View>
    </SVGErrorBoundary>
  );
}
