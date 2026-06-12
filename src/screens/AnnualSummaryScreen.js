import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  useWindowDimensions, LayoutAnimation, Platform, UIManager,
  Animated, PanResponder, Modal,
} from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { annualTotals } from '../utils/calculations';
import { formatBRL, formatPercent } from '../utils/currency';
import { projectStats } from '../utils/projects';
import { YEAR, MONTH_NAMES } from '../data/initialData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Categories ───────────────────────────────────────────────────────────────
const CAT_EMOJI = {
  alimentacao:'🍔', moradia:'🏠', transporte:'🚗', saude:'💊',
  assinaturas:'📺', vestuario:'👕', compras:'📦', tech:'💻',
  lazer:'🎮', educacao:'📚', outros:'🔮',
};

// Ordem importa: a primeira categoria que casar vence.
// Tech vem antes de Assinaturas para que 'cabo' vença 'internet'.
const CATS = [
  { id:'alimentacao', label:'Alimentação', color:'#FF6B6B', keys:[
    'ifood','rappi','delivery','uber eats','ubereats','supermercado','mercado','padaria',
    'restaurante','lanche','pizza','sushi','hamburguer','comida','feira','açaí','acai',
    'carrefour','pão de açúcar','pao de acucar','marmita','bar ','boteco','cerveja',
    'almoco','almoço','janta','cafe','café','hortifruti','churrasco','salgado','sorvete',
    'chocolate','biscoito','tapioca','empada','torta','doce','sanduiche','frango','carne',
    'peixe','frutas','verduras','legumes','panificadora','quentinha','refeicao','gelato',
    'caldo','suco','sacolao','minimercado','mercearia','atacadão','atacadao','assai','assaí',
    'hipermercado','extra ','mcdonalds','burger king','kfc','subway','outback','giraffas',
    'bobs','habibs','ze delivery','zé delivery','99food','aiqfome','laçador','lacador',
    'açougue','acougue','peixaria',
  ]},
  { id:'moradia', label:'Moradia', color:'#26C6DA', keys:[
    // 'casa' captura "Casa" exato e "casa de algo". Edge case 'casamento' vai p/ lazer.
    'aluguel','condominio','condomínio','casa','moradia',
    'luz ','energia ','agua ','água ','gas ','gás ',
    'iptu','reforma','manutencao','manutenção',
    'enel','sabesp','copasa','cemig','eletropaulo','limpeza',
    'pintura','pedreiro','eletricista','encanamento','instalacao','material de construcao',
    'leroy','tok stok','casa show','piso','telha','torneira','chuveiro','conta de agua',
    'conta de luz','conta de gas','caixa dagua','reparo','conserto',
    'seguro residencial','seguro casa','administradora','portaria','sindico',
  ]},
  { id:'transporte', label:'Transporte', color:'#42A5F5', keys:[
    'uber ','gasolina','99 ','combustivel','combustível','posto ','estacionamento',
    'onibus','ônibus','metro','metrô','passagem','pedagio','pedágio','ipva','seguro auto',
    'seguro carro','moto','taxi','táxi','carsharing','revisao','revisão','borracharia',
    'troca de oleo','oleo ','filtro ','pneu','bateria ','emplacamento','renavam','detran',
    'dpvat','bilhete unico','bilhete único','vlt','brt','trem ','transfer aeroporto',
  ]},
  { id:'saude', label:'Saúde', color:'#66BB6A', keys:[
    'farmacia','farmácia','remedio','remédio','medico','médico','consulta','plano de saude',
    'plano saude','plano de saúde','dentista','academia','gym','smart fit','smartfit',
    'fisioterapia','fisio','exame','hospital','clinica','clínica','vitamina','suplemento',
    'psicologo','psicólogo','terapeuta','psiquiatra','nutricionista','oftalmo','dermato',
    'ultrafarma','panvel','droga raia','drogasil','pacheco','nissei','biolab',
    'crossfit','pilates','yoga','zumba','natacao','natação','musculacao','musculação',
    'treino','corrida','bike','esteira','spinning','academia de ginastica',
  ]},
  // Tech ANTES de assinaturas: 'cabo' precisa ganhar de 'internet'
  { id:'tech', label:'Tecnologia', color:'#5C6BC0', keys:[
    'cabo','setup','mouse','teclado','headset','monitor','webcam','gpu','placa de video','ssd',
    'hd ','notebook','iphone','samsung','xiaomi','motorola','smartphone','celular ',
    'smart tv','carregador','fone ','kabum','pichau','steam','psn','xbox','nintendo',
    'impressora','hub ','pendrive','hd externo','tablet','ipad','macbook','lenovo',
    'dell','hp ','asus','acer','positivo ','controle ','gopro','ring light',
    'microfone','placa de som','caixa de som','soundbar','projetor','alexa','google home',
    'smartwatch','apple watch','raspberry','arduino','drone','roteador','modem',
    'switch rede','access point','wi-fi','wifi',
  ]},
  { id:'assinaturas', label:'Assinaturas', color:'#AB47BC', keys:[
    // Operadoras e internet — movidas de moradia para cá
    'internet','fibra','banda larga','vivo ','claro ','tim ','oi ','net ',
    'gvt','nextel','embratel','oi fibra','claro fibra','vivo fibra',
    'tv por assinatura','tv a cabo','sky ','directv','brisanet','algar',
    // Streaming e apps
    'netflix','spotify','prime','amazon prime','hbo','max ','disney','youtube premium',
    'apple tv','apple one','deezer','globoplay','paramount','crunchyroll','chatgpt',
    'openai','canva','notion','assinatura','duolingo','microsoft 365','office 365',
    'adobe','photoshop','dropbox','google one','icloud','antivirus','norton','kaspersky',
    'vpn','nordvpn','expressvpn','linkedin premium','plataforma','hospedagem','dominio',
    'gamepass','ea play','ubisoft','origin','battle.net','twitch sub',
  ]},
  { id:'vestuario', label:'Vestuário', color:'#FFCA28', keys:[
    'roupa','calca','calça','camiseta','camisa','blusa','vestido','sapato','tenis','tênis',
    'sandalia','sandália','mochila','bolsa','renner','riachuelo','zara','c&a','cea',
    'nike','adidas','puma','centauro','shein','netshoes','hering','arezzo','reserva',
    'farm','animale','shoulder','amaro','youcom','marisa','leader','decathlon',
    'meias','cueca','calcinha','sutiã','sutia','cinto ','carteira ','oculos','óculos',
    'relogio','relógio','joias','brincos','pulseira','colar ','anel ',
    'cabelo','cabeleireiro','barba','manicure','pedicure','barbearia',
  ]},
  { id:'compras', label:'Compras Online', color:'#FF7043', keys:[
    'shopee','aliexpress','ali express','amazon','mercado livre','mercadolivre','magalu',
    'magazine luiza','americanas','casas bahia','wish','temu','shoptime','submarino',
    'extra.com','b2w','loja virtual','marketplace','ebay',
  ]},
  { id:'lazer', label:'Lazer', color:'#EC407A', keys:[
    'cinema','show ','teatro','ingresso','balada','festa','viagem','hotel','airbnb',
    'booking','hostel','pousada','resort','parque','jogo ','game ','passeio','turismo',
    'disney','universal','ingresso.com','tickets','parque aquático','aquatico',
    'zoologico','zoológico','museu','exposicao','exposição','skate','surf','escalada',
    'mergulho','trilha','camping','acampamento','karaoke','karaokê','boliche',
    'laser game','escape room','quadra','golfe','passagem aerea','passagem aérea',
    'aeroporto','cruzeiro','navio','excursao','excursão','casamento',
  ]},
  { id:'educacao', label:'Educação', color:'#26A69A', keys:[
    'curso','faculdade','escola','livro','udemy','alura','rocketseat','coursera',
    'ingles','inglês','idioma','aula ','apostila','mensalidade escolar','colegio',
    'colégio','universidade','pos ','pós ','mba ','graduacao','graduação','enem',
    'vestibular','preparatorio','reforco','reforço','tutoria','coaching','mentoria',
    'workshop','bootcamp','treinamento','capacitacao','certificacao',
    'descomplica','estrategia','gran cursos','qconcursos','open english','fisk','wizard',
    'material escolar','caderno','caneta','lapis','lápis','mochila escolar',
  ]},
];

// ─── Data Processing ──────────────────────────────────────────────────────────
function categorize(months) {
  const mk = () => Array.from({length:12},(_,i)=>({monthIndex:i,total:0,items:[]}));
  const map = {};
  CATS.forEach(c=>{ map[c.id]={...c,total:0,itemMap:{},monthlyData:mk()}; });
  map.outros={id:'outros',label:'Outros',color:'#78909C',total:0,itemMap:{},monthlyData:mk()};
  let grand=0;
  for (let i=0;i<12;i++) {
    const m=months?.[i]||{};
    const all=[...(m.fixed||[]),...(m.variable||[])];
    for (const item of all) {
      const val=Number(item.value)||0;
      if (val<=0) continue;
      grand+=val;
      const n=(item.name||'').toLowerCase();
      let hit=false;
      for (const cat of CATS) {
        if (cat.keys.some(k=>n.includes(k))) {
          const key=n;
          map[cat.id].total+=val;
          if (!map[cat.id].itemMap[key]) map[cat.id].itemMap[key]={name:item.name||'?',total:0,count:0};
          map[cat.id].itemMap[key].total+=val;
          map[cat.id].itemMap[key].count+=1;
          map[cat.id].monthlyData[i].total+=val;
          map[cat.id].monthlyData[i].items.push({name:item.name||'?',value:val});
          hit=true; break;
        }
      }
      if (!hit) {
        const key=n;
        map.outros.total+=val;
        if (!map.outros.itemMap[key]) map.outros.itemMap[key]={name:item.name||'?',total:0,count:0};
        map.outros.itemMap[key].total+=val;
        map.outros.itemMap[key].count+=1;
        map.outros.monthlyData[i].total+=val;
        map.outros.monthlyData[i].items.push({name:item.name||'?',value:val});
      }
    }
  }
  return {
    cats: Object.values(map)
      .filter(c=>c.total>0)
      .map(c=>({
        ...c,
        percent:grand>0?(c.total/grand)*100:0,
        topItems:Object.values(c.itemMap).sort((a,b)=>b.total-a.total).slice(0,6),
        monthlyData:c.monthlyData
          .filter(md=>md.total>0)
          .map(md=>({...md,items:[...md.items].sort((a,b)=>b.value-a.value)})),
      }))
      .sort((a,b)=>b.total-a.total),
    grand,
  };
}

function getHealth(rate) {
  if (rate>=30) return {grade:'A',label:'Excelente',color:'#2ECC71',tip:'Você guarda mais de 30% da renda. Nível máster! 🏆'};
  if (rate>=20) return {grade:'B',label:'Ótimo',    color:'#27AE60',tip:'Mais de 20% poupado. Quase no nível A!'};
  if (rate>=10) return {grade:'C',label:'Regular',  color:'#F39C12',tip:'Poupando, mas dá pra melhorar. Corte um gasto variável.'};
  if (rate>= 0) return {grade:'D',label:'Atenção',  color:'#E67E22',tip:'Sobra muito pouco. Reveja as despesas variáveis.'};
  return             {grade:'F',label:'Crítico',   color:'#E74C3C',tip:'Gastos maiores que a renda. Ação urgente!'};
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────
const f2 = n=>n.toFixed(2);
const polar = (cx,cy,r,deg)=>({x:cx+r*Math.cos(deg*Math.PI/180),y:cy+r*Math.sin(deg*Math.PI/180)});
function donutPath(cx,cy,R,r,sA,eA) {
  if (eA-sA>=360) eA=sA+359.9;
  const lg=eA-sA>180?1:0;
  const p1=polar(cx,cy,R,sA),p2=polar(cx,cy,R,eA),p3=polar(cx,cy,r,eA),p4=polar(cx,cy,r,sA);
  return `M${f2(p1.x)} ${f2(p1.y)} A${R} ${R} 0 ${lg} 1 ${f2(p2.x)} ${f2(p2.y)} L${f2(p3.x)} ${f2(p3.y)} A${r} ${r} 0 ${lg} 0 ${f2(p4.x)} ${f2(p4.y)}Z`;
}
function buildSlices(cats) {
  if (!cats.length) return [];
  const GAP=cats.length>1?2:0;
  let angle=-90;
  return cats.map(cat=>{
    const sweep=Math.max(5,(cat.percent/100)*(360-cats.length*GAP));
    const sA=angle,eA=sA+sweep; angle=eA+GAP;
    return {...cat,sA,eA,midA:(sA+eA)/2};
  });
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────
function ScoreRing({rate,grade,size=108}) {
  const ST=9,R=(size-ST)/2,C=2*Math.PI*R;
  const dash=(Math.max(0,Math.min(100,rate))/100)*C;
  return (
    <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size/2} cy={size/2} r={R} stroke="rgba(255,255,255,0.22)" strokeWidth={ST} fill="none"/>
        <Circle cx={size/2} cy={size/2} r={R} stroke="#fff" strokeWidth={ST} fill="none"
          strokeDasharray={`${f2(dash)} ${f2(C)}`} strokeLinecap="round"
          rotation={-90} originX={size/2} originY={size/2}/>
      </Svg>
      <Text style={{fontSize:size*0.32,fontWeight:'900',color:'#fff',lineHeight:size*0.38}}>{grade}</Text>
      <Text style={{fontSize:size*0.13,color:'rgba(255,255,255,0.75)',marginTop:-3}}>
        {rate>=0?'+':''}{Math.round(rate)}%
      </Text>
    </View>
  );
}

// ─── PeekCard (press & hold → futuristic floating card) ───────────────────────
function PeekCard({cat,anim}) {
  if (!cat) return null;
  const topItems=cat.topItems?.slice(0,3)||[];
  return (
    <Animated.View style={[pk.card,{
      borderColor:cat.color+'55',
      opacity:anim,
      transform:[
        {translateY:anim.interpolate({inputRange:[0,1],outputRange:[32,0]})},
        {scale:anim.interpolate({inputRange:[0,1],outputRange:[0.86,1]})},
      ],
    }]}>
      <View style={[pk.accentBar,{backgroundColor:cat.color}]}/>
      <Text style={pk.emoji}>{CAT_EMOJI[cat.id]||'🔮'}</Text>
      <Text style={pk.catName}>{cat.label}</Text>
      <Text style={[pk.total,{color:cat.color}]}>{formatBRL(cat.total)}</Text>
      <Text style={pk.pctTxt}>{formatPercent(cat.percent)} dos gastos anuais</Text>
      <View style={[pk.bar,{backgroundColor:'rgba(255,255,255,0.12)'}]}>
        <View style={[pk.barFill,{width:`${Math.min(100,cat.percent)}%`,backgroundColor:cat.color}]}/>
      </View>
      {topItems.length>0&&(
        <View style={pk.items}>
          {topItems.map((it,i)=>(
            <View key={i} style={pk.item}>
              <Text style={pk.itemIcon}>{['🥇','🥈','🥉'][i]||'▸'}</Text>
              <Text style={pk.itemName} numberOfLines={1}>{it.name}</Text>
              <Text style={[pk.itemAmt,{color:cat.color}]}>{formatBRL(it.total)}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={pk.hint}>↓ Toque em "Ver detalhes completos"</Text>
    </Animated.View>
  );
}
const pk = StyleSheet.create({
  card:{
    backgroundColor:'rgba(8,10,22,0.96)',
    borderWidth:1.5,borderRadius:28,padding:24,
    alignItems:'center',overflow:'hidden',
    shadowColor:'#000',shadowOffset:{width:0,height:18},
    shadowOpacity:0.7,shadowRadius:30,elevation:32,
  },
  accentBar:{position:'absolute',top:0,left:0,right:0,height:4},
  emoji:{fontSize:46,marginTop:4,marginBottom:6},
  catName:{fontSize:18,fontWeight:'900',color:'#fff',marginBottom:4},
  total:{fontSize:28,fontWeight:'900',marginBottom:2},
  pctTxt:{fontSize:12,color:'rgba(255,255,255,0.55)',marginBottom:12},
  bar:{height:8,borderRadius:5,width:'100%',overflow:'hidden',marginBottom:16},
  barFill:{height:'100%',borderRadius:5},
  items:{width:'100%',gap:8,marginBottom:14},
  item:{flexDirection:'row',alignItems:'center',gap:8},
  itemIcon:{fontSize:14,width:22},
  itemName:{flex:1,fontSize:13,fontWeight:'700',color:'rgba(255,255,255,0.85)'},
  itemAmt:{fontSize:13,fontWeight:'900'},
  hint:{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:4},
});

// ─── CategoryDetailPanel ──────────────────────────────────────────────────────
function CategoryDetailPanel({cat}) {
  const {colors}=useTheme();
  const [expandedMonth,setExpandedMonth]=useState(null);
  const maxMT=cat.monthlyData.length>0?Math.max(...cat.monthlyData.map(m=>m.total)):1;
  const avgActive=cat.total/Math.max(1,cat.monthlyData.length);
  const peakM=cat.monthlyData.length>0?cat.monthlyData.reduce((a,b)=>b.total>a.total?b:a,cat.monthlyData[0]):null;
  const toggle=idx=>{
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonth(p=>p===idx?null:idx);
  };
  return (
    <View>
      <View style={dt.header}>
        <Text style={{fontSize:36}}>{CAT_EMOJI[cat.id]||'🔮'}</Text>
        <View style={{flex:1,marginLeft:14}}>
          <Text style={[dt.title,{color:colors.text}]}>{cat.label}</Text>
          <Text style={[dt.big,{color:cat.color}]}>{formatBRL(cat.total)}</Text>
          <Text style={[dt.meta,{color:colors.textMuted}]}>
            {formatPercent(cat.percent)} do total · méd. {formatBRL(avgActive)}/mês ativo
          </Text>
        </View>
      </View>
      {peakM&&<View style={[dt.peak,{backgroundColor:cat.color+'18'}]}>
        <Ionicons name="flame-outline" size={13} color={cat.color}/>
        <Text style={[dt.peakTxt,{color:cat.color}]}>
          Pico: {MONTH_NAMES[peakM.monthIndex]} · {formatBRL(peakM.total)}
        </Text>
      </View>}
      {cat.monthlyData.length>0&&<>
        <Text style={[dt.sub,{color:colors.textSecondary}]}>MÊS A MÊS</Text>
        {cat.monthlyData.map(md=>{
          const isExp=expandedMonth===md.monthIndex;
          return (
            <View key={md.monthIndex}>
              <TouchableOpacity activeOpacity={0.7} onPress={()=>toggle(md.monthIndex)} style={dt.monthRow}>
                <Text style={[dt.monthName,{color:colors.text}]}>{MONTH_NAMES[md.monthIndex].slice(0,3)}</Text>
                <View style={[dt.track,{backgroundColor:colors.cardAlt}]}>
                  <View style={[dt.fill,{width:`${(md.total/maxMT)*100}%`,backgroundColor:cat.color}]}/>
                </View>
                <Text style={[dt.monthAmt,{color:cat.color}]}>{formatBRL(md.total)}</Text>
                <Ionicons name={isExp?'chevron-up':'chevron-down'} size={13} color={colors.textMuted}/>
              </TouchableOpacity>
              {isExp&&<View style={[dt.monthItems,{borderColor:colors.border}]}>
                {md.items.map((it,i)=>(
                  <View key={i} style={dt.mItem}>
                    <View style={[dt.dot,{backgroundColor:cat.color}]}/>
                    <Text style={[dt.mItemName,{color:colors.text}]} numberOfLines={1}>{it.name}</Text>
                    <Text style={[dt.mItemAmt,{color:cat.color}]}>{formatBRL(it.value)}</Text>
                  </View>
                ))}
              </View>}
            </View>
          );
        })}
      </>}
      {cat.topItems?.length>0&&<>
        <Text style={[dt.sub,{color:colors.textSecondary,marginTop:14}]}>PRINCIPAIS DO ANO</Text>
        {cat.topItems.map((it,i)=>(
          <View key={i} style={dt.topItem}>
            <Text style={{fontSize:15,width:22}}>{['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][i]||'▸'}</Text>
            <Text style={[dt.topName,{color:colors.text}]} numberOfLines={1}>{it.name}</Text>
            <Text style={[dt.topCount,{color:colors.textMuted}]}>{it.count}×</Text>
            <Text style={[dt.topAmt,{color:cat.color}]}>{formatBRL(it.total)}</Text>
          </View>
        ))}
      </>}
    </View>
  );
}
const dt = StyleSheet.create({
  header:{flexDirection:'row',alignItems:'flex-start',marginBottom:12},
  title:{fontSize:17,fontWeight:'900'},
  big:{fontSize:24,fontWeight:'900',marginTop:3},
  meta:{fontSize:11,marginTop:4,lineHeight:16},
  peak:{flexDirection:'row',alignItems:'center',borderRadius:10,paddingHorizontal:10,paddingVertical:7,marginBottom:14,gap:6},
  peakTxt:{fontSize:12,fontWeight:'700'},
  sub:{fontSize:11,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.7,marginBottom:9},
  monthRow:{flexDirection:'row',alignItems:'center',paddingVertical:7,gap:7},
  monthName:{fontSize:13,fontWeight:'700',width:32},
  track:{flex:1,height:10,borderRadius:6,overflow:'hidden'},
  fill:{height:'100%',borderRadius:6},
  monthAmt:{fontSize:12,fontWeight:'800',minWidth:80,textAlign:'right'},
  monthItems:{borderWidth:1,borderRadius:12,padding:11,marginTop:4,marginBottom:6,gap:7},
  mItem:{flexDirection:'row',alignItems:'center',gap:9},
  dot:{width:7,height:7,borderRadius:4},
  mItemName:{flex:1,fontSize:13,fontWeight:'600'},
  mItemAmt:{fontSize:13,fontWeight:'800'},
  topItem:{flexDirection:'row',alignItems:'center',paddingVertical:5,gap:9},
  topName:{flex:1,fontSize:13,fontWeight:'700'},
  topCount:{fontSize:12,minWidth:24},
  topAmt:{fontSize:14,fontWeight:'900',minWidth:82,textAlign:'right'},
});

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
const SHEET_H = 620;

function CategoryBottomSheet({visible,cats,selectedCatId,onClose,onSelectCat}) {
  const {colors}=useTheme();
  const translateY=useRef(new Animated.Value(SHEET_H)).current;

  React.useEffect(()=>{
    if (visible) Animated.spring(translateY,{toValue:0,useNativeDriver:true,tension:55,friction:11}).start();
    else         Animated.timing(translateY,{toValue:SHEET_H,duration:250,useNativeDriver:true}).start();
  },[visible]);

  const panHandlers=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:(_,g)=>g.dy>8,
    onPanResponderMove:(_,g)=>{ if (g.dy>0) translateY.setValue(g.dy); },
    onPanResponderRelease:(_,g)=>{
      if (g.dy>100||g.vy>0.6) onClose();
      else Animated.spring(translateY,{toValue:0,useNativeDriver:true}).start();
    },
  })).current;

  const selectedCat=selectedCatId?cats.find(c=>c.id===selectedCatId):null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={bs.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}/>
        <Animated.View style={[bs.sheet,{backgroundColor:colors.card,transform:[{translateY}]}]}>
          <View {...panHandlers.panHandlers} style={bs.handleZone}>
            <View style={[bs.handle,{backgroundColor:colors.border}]}/>
            {selectedCat?(
              <View style={bs.sheetHead}>
                <TouchableOpacity onPress={()=>onSelectCat(null)} style={bs.backBtn}>
                  <Ionicons name="chevron-back" size={18} color={colors.primary}/>
                  <Text style={[bs.backTxt,{color:colors.primary}]}>Todas</Text>
                </TouchableOpacity>
                <Text style={[bs.sheetTitle,{color:colors.text}]}>
                  {CAT_EMOJI[selectedCat.id]} {selectedCat.label}
                </Text>
                <View style={{width:60}}/>
              </View>
            ):(
              <Text style={[bs.sheetTitle,{color:colors.text,textAlign:'center',marginBottom:4}]}>
                💰 Gastos por Categoria
              </Text>
            )}
          </View>
          <ScrollView contentContainerStyle={bs.content} showsVerticalScrollIndicator={false}>
            {selectedCat?(
              <CategoryDetailPanel cat={selectedCat}/>
            ):(
              cats.map(cat=>(
                <TouchableOpacity key={cat.id}
                  style={[bs.catRow,{borderColor:colors.border}]}
                  onPress={()=>onSelectCat(cat.id)} activeOpacity={0.75}>
                  <Text style={{fontSize:24,width:36}}>{CAT_EMOJI[cat.id]||'🔮'}</Text>
                  <View style={{flex:1}}>
                    <View style={bs.catRowTop}>
                      <Text style={[bs.catLabel,{color:colors.text}]}>{cat.label}</Text>
                      <Text style={[bs.catAmt,{color:cat.color}]}>{formatBRL(cat.total)}</Text>
                    </View>
                    <View style={[bs.catTrack,{backgroundColor:colors.cardAlt}]}>
                      <View style={[bs.catFill,{width:`${Math.min(100,cat.percent)}%`,backgroundColor:cat.color}]}/>
                    </View>
                    <Text style={[bs.catPct,{color:colors.textMuted}]}>{formatPercent(cat.percent)} do total</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted}/>
                </TouchableOpacity>
              ))
            )}
            <View style={{height:48}}/>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
const bs = StyleSheet.create({
  backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.52)'},
  sheet:{borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:SHEET_H,paddingTop:6,
    shadowColor:'#000',shadowOffset:{width:0,height:-8},shadowOpacity:0.28,shadowRadius:20,elevation:20},
  handleZone:{alignItems:'center',paddingTop:8,paddingBottom:4,paddingHorizontal:18},
  handle:{width:44,height:5,borderRadius:3,marginBottom:12},
  sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width:'100%',marginBottom:4},
  sheetTitle:{fontSize:17,fontWeight:'900'},
  backBtn:{flexDirection:'row',alignItems:'center',gap:2,minWidth:60},
  backTxt:{fontSize:14,fontWeight:'700'},
  content:{paddingHorizontal:18,paddingTop:10},
  catRow:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:16,padding:14,marginBottom:10,gap:12},
  catRowTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6},
  catLabel:{fontSize:14,fontWeight:'800'},
  catAmt:{fontSize:15,fontWeight:'900'},
  catTrack:{height:8,borderRadius:5,overflow:'hidden',marginBottom:4},
  catFill:{height:'100%',borderRadius:5},
  catPct:{fontSize:11},
});

// ─── DonutChart ───────────────────────────────────────────────────────────────
function DonutChart({cats,selectedId,onSelect,onPressIn,onPressOut,onLongPress,grand}) {
  const {colors}=useTheme();
  const {width}=useWindowDimensions();
  const SIZE=Math.min(width-64,272);
  const EXP=14,FULL=SIZE+EXP*2,CX=FULL/2,CY=FULL/2,OUTER=SIZE/2-4,INNER=OUTER*0.50;
  const slices=useMemo(()=>buildSlices(cats),[cats]);
  const activeCat=selectedId?cats.find(c=>c.id===selectedId):null;
  if (!slices.length) return (
    <View style={{height:180,alignItems:'center',justifyContent:'center'}}>
      <Text style={{color:colors.textMuted,fontSize:13,textAlign:'center',lineHeight:20}}>
        Lance despesas para ver{'\n'}a distribuição por categoria
      </Text>
    </View>
  );
  return (
    <View style={{alignItems:'center'}}>
      <View style={{width:FULL,height:FULL}}>
        <Svg width={FULL} height={FULL} style={{position:'absolute'}}>
          {slices.map(s=>{
            const isSel=!!selectedId&&s.id===selectedId;
            const midRad=s.midA*Math.PI/180;
            const ox=isSel?EXP*Math.cos(midRad):0,oy=isSel?EXP*Math.sin(midRad):0;
            return (
              <Path key={s.id}
                d={donutPath(CX+ox,CY+oy,OUTER,INNER,s.sA,s.eA)}
                fill={s.color}
                opacity={selectedId&&!isSel?0.3:1}
                onPress={()=>onSelect(s.id===selectedId?null:s.id)}
                onPressIn={()=>onPressIn(s)}
                onPressOut={onPressOut}
                onLongPress={()=>onLongPress(s.id)}/>
            );
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFillObject,{alignItems:'center',justifyContent:'center'}]} pointerEvents="none">
          <Text style={{fontSize:28,lineHeight:34}}>{activeCat?(CAT_EMOJI[activeCat.id]||'🔮'):'💰'}</Text>
          <Text style={{fontSize:16,fontWeight:'900',color:colors.text,marginTop:4}} numberOfLines={1}>
            {formatBRL(activeCat?activeCat.total:grand)}
          </Text>
          <Text style={{fontSize:11,color:colors.textMuted,marginTop:1}}>
            {activeCat?activeCat.label:'Total de gastos'}
          </Text>
          {activeCat&&<View style={{backgroundColor:activeCat.color+'30',borderRadius:8,paddingHorizontal:8,paddingVertical:2,marginTop:5}}>
            <Text style={{fontSize:13,fontWeight:'800',color:activeCat.color}}>{formatPercent(activeCat.percent)}</Text>
          </View>}
        </View>
      </View>
    </View>
  );
}

// ─── ProjectRow ───────────────────────────────────────────────────────────────
function ProjectRow({project}) {
  const {colors}=useTheme();
  const stats=projectStats(project);
  const barColor=stats.done?colors.positive:colors.primary;
  return (
    <View style={[pj.row,{backgroundColor:colors.card,borderColor:colors.border}]}>
      <View style={pj.top}>
        <Text style={[pj.name,{color:colors.text}]} numberOfLines={1}>{project.name||'Projeto'}</Text>
        {stats.done?(
          <View style={[pj.badge,{backgroundColor:colors.positive+'22'}]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.positive}/>
            <Text style={[pj.badgeTxt,{color:colors.positive}]}>Concluído!</Text>
          </View>
        ):stats.etaLabel&&(
          <View style={[pj.badge,{backgroundColor:colors.primary+'18'}]}>
            <Ionicons name="time-outline" size={12} color={colors.primary}/>
            <Text style={[pj.badgeTxt,{color:colors.primary}]}>{stats.etaLabel}</Text>
          </View>
        )}
      </View>
      <View style={[pj.track,{backgroundColor:colors.cardAlt}]}>
        <View style={[pj.fill,{width:`${Math.min(100,stats.pct)}%`,backgroundColor:barColor}]}/>
      </View>
      <View style={pj.bottom}>
        <Text style={[pj.saved,{color:barColor}]}>{formatBRL(stats.saved)}</Text>
        <Text style={[pj.sep,{color:colors.textMuted}]}>/</Text>
        <Text style={[pj.target,{color:colors.textSecondary}]}>{formatBRL(stats.target)}</Text>
        <Text style={[pj.pct,{color:barColor}]}>{formatPercent(stats.pct)}</Text>
        {!stats.done&&stats.remaining>0&&<Text style={[pj.rem,{color:colors.textMuted}]}>faltam {formatBRL(stats.remaining)}</Text>}
      </View>
    </View>
  );
}
const pj = StyleSheet.create({
  row:{borderRadius:14,borderWidth:1,padding:14,marginBottom:10},
  top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:9},
  name:{fontSize:15,fontWeight:'800',flex:1,marginRight:8},
  badge:{flexDirection:'row',alignItems:'center',borderRadius:8,paddingHorizontal:8,paddingVertical:3,gap:4},
  badgeTxt:{fontSize:11,fontWeight:'700'},
  track:{height:8,borderRadius:5,overflow:'hidden',marginBottom:8},
  fill:{height:'100%',borderRadius:5},
  bottom:{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'},
  saved:{fontSize:15,fontWeight:'900'},
  sep:{fontSize:13},
  target:{fontSize:13,fontWeight:'600'},
  pct:{fontSize:12,fontWeight:'800',marginLeft:4},
  rem:{fontSize:11,marginLeft:'auto'},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AnnualSummaryScreen() {
  const {colors}=useTheme();
  const {data}=useData();
  const {projects=[]}=useSettings();
  const scrollRef=useRef(null);
  useScrollToTop(scrollRef);

  const totals=useMemo(()=>annualTotals(data.months),[data.months]);
  const {cats,grand}=useMemo(()=>categorize(data.months),[data.months]);

  const rate=totals.rendaTotal>0?(totals.sobraTotal/totals.rendaTotal)*100:0;
  const health=getHealth(rate);
  const mwd=totals.perMonth.filter(m=>m.renda>0||m.despesa>0);
  const posMonths=totals.perMonth.filter(m=>m.sobra>0).length;
  const bestM=mwd.length>0?mwd.reduce((a,b)=>b.sobra>a.sobra?b:a,mwd[0]):null;
  const worstM=mwd.length>0?mwd.reduce((a,b)=>b.despesa>a.despesa?b:a,mwd[0]):null;

  // Mês atual
  const currentMonthIdx=new Date().getMonth();
  const currentM=totals.perMonth[currentMonthIdx]||{renda:0,despesa:0,sobra:0,index:currentMonthIdx};
  const monthPct=currentM.renda>0?Math.min(100,(currentM.despesa/currentM.renda)*100):0;
  const monthHealth=getHealth(currentM.renda>0?(currentM.sobra/currentM.renda)*100:0);

  // Selected slice (inline highlight)
  const [selCat,setSelCat]=useState(null);

  // Peek card state (press & hold)
  const peekAnim=useRef(new Animated.Value(0)).current;
  const [peekCat,setPeekCat]=useState(null);

  const showPeek=useCallback((slice)=>{
    setPeekCat(slice);
    Animated.spring(peekAnim,{toValue:1,tension:80,friction:7,useNativeDriver:true}).start();
  },[peekAnim]);

  const hidePeek=useCallback(()=>{
    Animated.timing(peekAnim,{toValue:0,duration:160,useNativeDriver:true}).start(()=>setPeekCat(null));
  },[peekAnim]);

  // Bottom sheet state
  const [sheetOpen,setSheetOpen]=useState(false);
  const [sheetCatId,setSheetCatId]=useState(null);

  const openSheet=useCallback((catId=null)=>{
    setSheetCatId(catId);
    setSheetOpen(true);
  },[]);

  const closeSheet=useCallback(()=>setSheetOpen(false),[]);

  const {width}=useWindowDimensions();

  return (
    <View style={{flex:1,backgroundColor:colors.background}}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <LinearGradient colors={[health.color+'EE',health.color+'99']}
          start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}>
          {/* Linha 1: ring anual + stats anuais */}
          <View style={s.heroRow}>
            <ScoreRing rate={Math.max(0,rate)} grade={health.grade}/>
            <View style={s.heroR}>
              <Text style={s.heroEye}>Saúde Financeira {YEAR}</Text>
              <Text style={s.heroGrade}>{health.label}</Text>
              <Text style={s.heroSobra}>{formatBRL(totals.sobraTotal)}</Text>
              <Text style={s.heroSobraLbl}>sobra acumulada no ano</Text>
              <View style={s.heroMini}>
                <View><Text style={s.heroML}>Renda</Text><Text style={s.heroMV}>{formatBRL(totals.rendaTotal)}</Text></View>
                <View style={s.heroDiv}/>
                <View><Text style={s.heroML}>Gastos</Text><Text style={s.heroMV}>{formatBRL(totals.despesaTotal)}</Text></View>
                {posMonths>0&&<><View style={s.heroDiv}/><View><Text style={s.heroML}>Meses +</Text><Text style={s.heroMV}>{posMonths}/12</Text></View></>}
              </View>
            </View>
          </View>

          {/* Linha 2: sub-chart do mês atual */}
          {(currentM.renda>0||currentM.despesa>0)&&<View style={s.heroMonth}>
            <View style={s.heroMonthHead}>
              <Text style={s.heroMonthLabel}>📅 {MONTH_NAMES[currentMonthIdx]}</Text>
              <View style={[s.heroMonthGradePill,{backgroundColor:monthHealth.color+'40'}]}>
                <Text style={[s.heroMonthGrade,{color:monthHealth.color==='#2ECC71'||monthHealth.color==='#27AE60'?'#b8ffd5':'#fff'}]}>
                  {monthHealth.grade}
                </Text>
              </View>
              <Text style={[s.heroMonthSobra,{color:currentM.sobra>=0?'#b8ffd5':'#ffaaaa'}]}>
                {currentM.sobra>=0?'▲':'▼'} {formatBRL(Math.abs(currentM.sobra))}
              </Text>
            </View>
            <View style={s.heroMonthTrack}>
              <View style={[s.heroMonthFill,{
                width:`${monthPct}%`,
                backgroundColor:currentM.sobra>=0?'rgba(255,255,255,0.55)':'rgba(255,120,120,0.65)',
              }]}/>
            </View>
            <View style={s.heroMonthStats}>
              <Text style={s.heroMonthStat}>↑ {formatBRL(currentM.renda)}</Text>
              <Text style={s.heroMonthStat}>↓ {formatBRL(currentM.despesa)}</Text>
              <Text style={s.heroMonthPct}>{Math.round(monthPct)}% consumido</Text>
            </View>
          </View>}
        </LinearGradient>
        <Text style={[s.tip,{color:colors.textMuted}]}>{health.tip}</Text>

        {/* ── DONUT CARD ── */}
        <View style={[s.card,{backgroundColor:colors.card,borderColor:colors.border}]}>
          <View style={s.cardHead}>
            <View style={{flex:1,marginRight:10}}>
              <Text style={[s.cardTitle,{color:colors.text}]}>Onde foi seu dinheiro?</Text>
              <Text style={[s.cardSub,{color:colors.textMuted}]}>
                {cats.length>0
                  ?'Toque para selecionar · segure para ver detalhes'
                  :'Lance despesas para ver a distribuição'}
              </Text>
            </View>
            {cats.length>0&&(
              <TouchableOpacity style={[s.exploreBtn,{backgroundColor:colors.primary+'18',borderColor:colors.primary+'44'}]}
                onPress={()=>openSheet(null)}>
                <Ionicons name="layers-outline" size={14} color={colors.primary}/>
                <Text style={[s.exploreTxt,{color:colors.primary}]}>Tudo</Text>
              </TouchableOpacity>
            )}
          </View>

          <DonutChart
            cats={cats} selectedId={selCat} grand={grand}
            onSelect={id=>{
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSelCat(p=>p===id?null:id);
            }}
            onPressIn={showPeek}
            onPressOut={hidePeek}
            onLongPress={()=>{}}
          />

          {cats.length>0&&<>
            <View style={s.pills}>
              {cats.map(cat=>(
                <TouchableOpacity key={cat.id}
                  style={[s.pill,{borderColor:cat.color,backgroundColor:selCat===cat.id?cat.color:'transparent'}]}
                  onPress={()=>{
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelCat(p=>p===cat.id?null:cat.id);
                  }}
                  onLongPress={()=>openSheet(cat.id)}>
                  <Text style={{fontSize:11}}>{CAT_EMOJI[cat.id]}</Text>
                  <Text style={[s.pillTxt,{color:selCat===cat.id?'#fff':colors.textSecondary}]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.swipeHint,{borderColor:colors.border}]}
              onPress={()=>openSheet(null)} activeOpacity={0.7}>
              <Ionicons name="chevron-up" size={14} color={colors.textMuted}/>
              <Text style={[s.swipeHintTxt,{color:colors.textMuted}]}>Ver detalhes completos</Text>
              <Ionicons name="chevron-up" size={14} color={colors.textMuted}/>
            </TouchableOpacity>
          </>}

          {/* PeekCard inline — flutua sobre a rosquinha ao segurar um segmento */}
          <View style={[StyleSheet.absoluteFillObject,s.peekOnCard]} pointerEvents="none">
            <PeekCard cat={peekCat} anim={peekAnim}/>
          </View>
        </View>

        {/* ── PROJETOS ── */}
        {projects.length>0&&<>
          <Text style={[s.secTitle,{color:colors.text}]}>🎯 Projetos</Text>
          <Text style={[s.secSub,{color:colors.textMuted}]}>
            {projects.filter(p=>projectStats(p).done).length} de {projects.length} concluídos
          </Text>
          {projects.map(p=><ProjectRow key={p.id} project={p}/>)}
        </>}

        {/* ── DESTAQUES ── */}
        {(bestM||worstM)&&<>
          <Text style={[s.secTitle,{color:colors.text}]}>Destaques do Ano</Text>
          <View style={s.hlRow}>
            {bestM&&<View style={[s.hlCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
              <Text style={s.hlEmoji}>🏆</Text>
              <Text style={[s.hlLbl,{color:colors.textSecondary}]}>Melhor Mês</Text>
              <Text style={[s.hlMonth,{color:colors.text}]}>{MONTH_NAMES[bestM.index]}</Text>
              <Text style={[s.hlVal,{color:colors.positive}]}>{formatBRL(bestM.sobra)}</Text>
              <Text style={[s.hlSub,{color:colors.textMuted}]}>de sobra</Text>
            </View>}
            {worstM&&<View style={[s.hlCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
              <Text style={s.hlEmoji}>🔥</Text>
              <Text style={[s.hlLbl,{color:colors.textSecondary}]}>Maior Gasto</Text>
              <Text style={[s.hlMonth,{color:colors.text}]}>{MONTH_NAMES[worstM.index]}</Text>
              <Text style={[s.hlVal,{color:colors.negative}]}>{formatBRL(worstM.despesa)}</Text>
              <Text style={[s.hlSub,{color:colors.textMuted}]}>em despesas</Text>
            </View>}
          </View>
          {posMonths>0&&<View style={[s.posRow,{backgroundColor:colors.card,borderColor:colors.border}]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.positive}/>
            <Text style={[s.posTxt,{color:colors.text}]}>
              Você fechou{' '}
              <Text style={{fontWeight:'900',color:colors.positive}}>{posMonths}</Text>
              {' '}{posMonths===1?'mês':'meses'} no positivo em {YEAR}
            </Text>
          </View>}
        </>}

        <View style={{height:96}}/>
      </ScrollView>

      {/* ── BOTTOM SHEET ── */}
      <CategoryBottomSheet
        visible={sheetOpen}
        cats={cats}
        selectedCatId={sheetCatId}
        onClose={closeSheet}
        onSelectCat={setSheetCatId}
      />
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  content:           {padding:16},
  hero:              {borderRadius:22,padding:18,marginBottom:8},
  heroRow:           {flexDirection:'row',alignItems:'center',gap:14},
  heroR:             {flex:1},
  heroEye:           {fontSize:10,fontWeight:'700',color:'rgba(255,255,255,0.75)',textTransform:'uppercase',letterSpacing:0.6},
  heroGrade:         {fontSize:22,fontWeight:'900',color:'#fff',marginTop:2},
  heroSobra:         {fontSize:20,fontWeight:'900',color:'#fff',marginTop:4},
  heroSobraLbl:      {fontSize:10,color:'rgba(255,255,255,0.7)'},
  heroMini:          {flexDirection:'row',alignItems:'center',marginTop:10,gap:10,flexWrap:'wrap'},
  heroDiv:           {width:1,height:26,backgroundColor:'rgba(255,255,255,0.3)'},
  heroML:            {fontSize:9,color:'rgba(255,255,255,0.7)',textTransform:'uppercase'},
  heroMV:            {fontSize:12,fontWeight:'800',color:'#fff'},
  heroMonth:         {marginTop:14,borderTopWidth:1,borderTopColor:'rgba(255,255,255,0.2)',paddingTop:12},
  heroMonthHead:     {flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  heroMonthLabel:    {fontSize:13,fontWeight:'800',color:'#fff',flex:1},
  heroMonthGradePill:{borderRadius:8,paddingHorizontal:7,paddingVertical:2},
  heroMonthGrade:    {fontSize:12,fontWeight:'900'},
  heroMonthSobra:    {fontSize:13,fontWeight:'900'},
  heroMonthTrack:    {height:10,borderRadius:6,backgroundColor:'rgba(255,255,255,0.18)',overflow:'hidden',marginBottom:7},
  heroMonthFill:     {height:'100%',borderRadius:6},
  heroMonthStats:    {flexDirection:'row',alignItems:'center',gap:10},
  heroMonthStat:     {fontSize:11,color:'rgba(255,255,255,0.75)',fontWeight:'700'},
  heroMonthPct:      {fontSize:11,color:'rgba(255,255,255,0.55)',marginLeft:'auto'},
  tip:          {fontSize:12,textAlign:'center',marginBottom:16,lineHeight:17,paddingHorizontal:8},
  card:         {borderRadius:18,borderWidth:1,padding:16,marginBottom:14},
  cardHead:     {flexDirection:'row',alignItems:'flex-start',marginBottom:14},
  cardTitle:    {fontSize:17,fontWeight:'900',marginBottom:2},
  cardSub:      {fontSize:11,lineHeight:16},
  exploreBtn:   {flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:14,paddingHorizontal:10,paddingVertical:7,gap:5},
  exploreTxt:   {fontSize:12,fontWeight:'800'},
  pills:        {flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16},
  pill:         {flexDirection:'row',alignItems:'center',borderWidth:1.5,borderRadius:20,paddingHorizontal:10,paddingVertical:5,gap:5},
  pillTxt:      {fontSize:12,fontWeight:'700'},
  swipeHint:    {flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:14,paddingVertical:8,borderTopWidth:1},
  swipeHintTxt: {fontSize:12,fontWeight:'600'},
  peekOnCard:   {alignItems:'center',justifyContent:'center',zIndex:9999,borderRadius:16},
  secTitle:     {fontSize:17,fontWeight:'900',marginBottom:4,marginTop:4},
  secSub:       {fontSize:12,marginBottom:10},
  hlRow:        {flexDirection:'row',gap:10,marginBottom:10},
  hlCard:       {flex:1,borderRadius:16,borderWidth:1,padding:14,alignItems:'center'},
  hlEmoji:      {fontSize:26,marginBottom:6},
  hlLbl:        {fontSize:10,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.3,marginBottom:4},
  hlMonth:      {fontSize:14,fontWeight:'800',marginBottom:2},
  hlVal:        {fontSize:16,fontWeight:'900'},
  hlSub:        {fontSize:11,marginTop:2},
  posRow:       {flexDirection:'row',alignItems:'center',borderRadius:14,borderWidth:1,padding:14,gap:10,marginBottom:14},
  posTxt:       {fontSize:14,fontWeight:'600',flex:1,lineHeight:20},
});
