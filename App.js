// Raiz do app: providers (SafeArea, Tema, Configurações, Dados) + navegação.
import React from 'react';
import { View, ActivityIndicator, StatusBar, Platform, UIManager, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { DataProvider, useData } from './src/context/DataContext';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { InstallmentProvider } from './src/context/InstallmentContext';
import { SyncProvider } from './src/context/SyncContext';
import { SharedDataProvider, PartnerDataProvider } from './src/context/SharedDataContext';
import CasalScreen from './src/screens/CasalScreen';

import HomeScreen from './src/screens/HomeScreen';
import AllMonthsScreen from './src/screens/AllMonthsScreen';
import MonthScreen from './src/screens/MonthScreen';
import AnnualSummaryScreen from './src/screens/AnnualSummaryScreen';
import InvestmentsScreen from './src/screens/InvestmentsScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FloatingTabBar from './src/components/FloatingTabBar';
import NotificationsManager from './src/components/NotificationsManager';
import { useSync } from './src/context/SyncContext';
import { MONTH_NAMES, YEAR } from './src/data/initialData';

// Habilita animação de layout (accordion) no Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Botão de engrenagem (Configurações) no topo direito.
function GearButton({ navigation, color }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Settings')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingHorizontal: 6 }}
    >
      <Ionicons name="settings-outline" size={22} color={color} />
    </TouchableOpacity>
  );
}

function AllMonthsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <GearButton navigation={navigation} color={colors.text} />,
      })}
    >
      <Stack.Screen name="AllMonthsList" component={AllMonthsScreen} options={{ title: `Meses de ${YEAR}` }} />
      <Stack.Screen
        name="MonthDetail"
        component={MonthScreen}
        options={({ route }) => ({
          title: route.params?.title || MONTH_NAMES[route.params?.monthIndex] || 'Mês',
        })}
      />
    </Stack.Navigator>
  );
}

function Tabs() {
  const { colors } = useTheme();
  const { isInvestor, userName } = useSettings();
  const { coupleCode, activeProfile, switchProfile, partnerPersonalData, partnerName } = useSync();
  const insets = useSafeAreaInsets();
  const currentMonthName = MONTH_NAMES[new Date().getMonth()];

  const canSwitchProfile = !!(coupleCode && partnerPersonalData);
  const isPartnerMode = activeProfile === 'partner' && canSwitchProfile;
  const myFirst = (userName || 'Você').split(' ')[0];
  const partnerFirst = (partnerName || 'Parceiro(a)').split(' ')[0];

  const tabNavigator = (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => <GearButton navigation={navigation} color={colors.text} />,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Atual: 'today-outline',
            Meses: 'calendar-outline',
            Anual: 'stats-chart-outline',
            Investir: 'trending-up-outline',
            Casal: 'heart-outline',
            Projetos: 'flag-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Atual"
        component={HomeScreen}
        options={{ headerShown: false, tabBarLabel: currentMonthName }}
      />
      <Tab.Screen
        name="Meses"
        component={AllMonthsStack}
        options={{ headerShown: false, tabBarLabel: 'Meses' }}
      />
      <Tab.Screen
        name="Anual"
        component={AnnualSummaryScreen}
        options={{ title: 'Resumo Anual', tabBarLabel: 'Anual' }}
      />
      {isInvestor && (
        <Tab.Screen
          name="Investir"
          component={InvestmentsScreen}
          options={{ title: 'Investimentos', tabBarLabel: 'Investir' }}
        />
      )}
      {coupleCode && (
        <Tab.Screen
          name="Casal"
          component={CasalScreen}
          options={{ title: 'Casal', tabBarLabel: 'Casal' }}
        />
      )}
      <Tab.Screen
        name="Projetos"
        component={ProjectsScreen}
        options={{ title: 'Projetos', tabBarLabel: 'Projetos' }}
      />
    </Tab.Navigator>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Banner de modo parceiro — aparece acima de todo o conteúdo */}
      {isPartnerMode && (
        <TouchableOpacity
          onPress={switchProfile}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: '#F5A52420', borderBottomWidth: 1,
            borderBottomColor: '#F5A52450', paddingVertical: 9, paddingHorizontal: 16,
          }}
        >
          <Ionicons name="eye-outline" size={14} color="#F5A524" />
          <Text style={{ color: '#F5A524', fontSize: 12, fontWeight: '700', flex: 1 }}>
            Visualizando dados de {partnerFirst} · somente leitura
          </Text>
          <Ionicons name="close-circle" size={17} color="#F5A524" />
        </TouchableOpacity>
      )}

      {/* Conteúdo principal — DataContext sobrescrito quando em modo parceiro */}
      {isPartnerMode ? (
        <PartnerDataProvider data={partnerPersonalData}>
          {tabNavigator}
        </PartnerDataProvider>
      ) : tabNavigator}

      {/* Pill flutuante de troca de perfil — só aparece quando parceiro compartilhou dados */}
      {canSwitchProfile && (
        <TouchableOpacity
          onPress={switchProfile}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            right: 20,
            bottom: insets.bottom + 82,
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: isPartnerMode ? '#F5A524' : colors.card,
            borderRadius: 20,
            paddingHorizontal: 12, paddingVertical: 7,
            borderWidth: 1,
            borderColor: isPartnerMode ? '#F5A524' : colors.border,
            elevation: 8,
            shadowColor: '#000', shadowOpacity: 0.16,
            shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
          }}
        >
          <Ionicons
            name={isPartnerMode ? 'person' : 'person-outline'}
            size={14}
            color={isPartnerMode ? '#fff' : colors.primary}
          />
          <Text style={{ fontSize: 13, fontWeight: '800', color: isPartnerMode ? '#fff' : colors.text }}>
            {isPartnerMode ? partnerFirst : myFirst}
          </Text>
          <Ionicons name="swap-horizontal-outline" size={13} color={isPartnerMode ? '#ffffffaa' : colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function Navigation() {
  const { colors, ready: themeReady } = useTheme();
  const { ready: dataReady } = useData();
  const { ready: settingsReady, userName } = useSettings();

  if (!themeReady || !dataReady || !settingsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Primeiro acesso: sem nome definido -> tela de boas-vindas (aparece só uma vez).
  if (!userName || !userName.trim()) {
    return <OnboardingScreen />;
  }

  const navTheme = {
    ...(colors.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colors.mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle={colors.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <RootStack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
        <RootStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <DataProvider>
            <SharedDataProvider>
            <SyncProvider>
            <InstallmentProvider>
              <NotificationsManager />
              <Navigation />
            </InstallmentProvider>
            </SyncProvider>
            </SharedDataProvider>
          </DataProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
