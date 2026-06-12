// Raiz do app: providers (SafeArea, Tema, Configurações, Dados) + navegação.
import React from 'react';
import { View, Text, ActivityIndicator, StatusBar, Platform, UIManager, TouchableOpacity } from 'react-native';
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
import { GoogleAuthProvider } from './src/context/GoogleAuthContext';
import { SharedDataProvider, PartnerDataProvider } from './src/context/SharedDataContext';
import CasalScreen from './src/screens/CasalScreen';

import HomeScreen from './src/screens/HomeScreen';
import AllMonthsScreen from './src/screens/AllMonthsScreen';
import MonthScreen from './src/screens/MonthScreen';
import AnnualSummaryScreen from './src/screens/AnnualSummaryScreen';
import InvestmentsScreen from './src/screens/InvestmentsScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SettingsPerfilScreen from './src/screens/SettingsPerfilScreen';
import SettingsCartoesScreen from './src/screens/SettingsCartoesScreen';
import SettingsTemasScreen from './src/screens/SettingsTemasScreen';
import SettingsCasalScreen from './src/screens/SettingsCasalScreen';
import SettingsInvestimentosScreen from './src/screens/SettingsInvestimentosScreen';
import SettingsBackupScreen from './src/screens/SettingsBackupScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FloatingTabBar from './src/components/FloatingTabBar';
import NotificationsManager from './src/components/NotificationsManager';
import BotSyncManager from './src/components/BotSyncManager';
import Avatar from './src/components/Avatar';
import HeaderMenu from './src/components/HeaderMenu';
import WelcomeBack from './src/components/WelcomeBack';
import { useSync } from './src/context/SyncContext';
import { MONTH_NAMES, YEAR } from './src/data/initialData';

// Habilita animação de layout (accordion) no Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();


function AllMonthsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <HeaderMenu />,
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
  const { coupleCode, activeProfile, switchProfile, partnerPersonalData, partnerName, partnerAvatar } = useSync();
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
        headerRight: () => <HeaderMenu />,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Atual: 'today-outline',
            Meses: 'calendar-outline',
            Controle: 'pie-chart-outline',
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
        name="Controle"
        component={AnnualSummaryScreen}
        options={{ title: 'Controle Geral', tabBarLabel: 'Controle' }}
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

      {/* Avatar do parceiro — pequeno, acima do FAB, igual ao Meta AI no WhatsApp */}
      {canSwitchProfile && (
        <TouchableOpacity
          onPress={switchProfile}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            right: 20,
            bottom: insets.bottom + 158,
            borderRadius: 22,
            borderWidth: 2.5,
            borderColor: isPartnerMode ? '#F5A524' : colors.card,
            elevation: 8,
            shadowColor: '#000', shadowOpacity: 0.22,
            shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
          }}
        >
          <Avatar avatar={partnerAvatar} size={36} />
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
        <RootStack.Screen name="SettingsPerfil" component={SettingsPerfilScreen} options={{ title: 'Perfil' }} />
        <RootStack.Screen name="SettingsCartoes" component={SettingsCartoesScreen} options={{ title: 'Formas de Pagamento' }} />
        <RootStack.Screen name="SettingsTemas" component={SettingsTemasScreen} options={{ title: 'Temas' }} />
        <RootStack.Screen name="SettingsCasal" component={SettingsCasalScreen} options={{ title: 'Modo Casal' }} />
        <RootStack.Screen name="SettingsInvestimentos" component={SettingsInvestimentosScreen} options={{ title: 'Investimentos' }} />
        <RootStack.Screen name="SettingsBackup" component={SettingsBackupScreen} options={{ title: 'Backup' }} />
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
            <GoogleAuthProvider>
            <InstallmentProvider>
              <NotificationsManager />
              <BotSyncManager />
              <WelcomeBack />
              <Navigation />
            </InstallmentProvider>
            </GoogleAuthProvider>
            </SyncProvider>
            </SharedDataProvider>
          </DataProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
