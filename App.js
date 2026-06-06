// Raiz do app: providers (SafeArea, Tema, Configurações, Dados) + navegação.
import React from 'react';
import { View, ActivityIndicator, StatusBar, Platform, UIManager } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { DataProvider, useData } from './src/context/DataContext';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { InstallmentProvider } from './src/context/InstallmentContext';

import HomeScreen from './src/screens/HomeScreen';
import AllMonthsScreen from './src/screens/AllMonthsScreen';
import MonthScreen from './src/screens/MonthScreen';
import AnnualSummaryScreen from './src/screens/AnnualSummaryScreen';
import InvestmentsScreen from './src/screens/InvestmentsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FloatingTabBar from './src/components/FloatingTabBar';
import { MONTH_NAMES, YEAR } from './src/data/initialData';

// Habilita animação de layout (accordion) no Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AllMonthsStack() {
  const { colors } = useTheme();
  const screenOptions = {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '800' },
    contentStyle: { backgroundColor: colors.background },
  };
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
  const { isInvestor } = useSettings();
  const insets = useSafeAreaInsets();
  const currentMonthName = MONTH_NAMES[new Date().getMonth()];

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Atual: 'today-outline',
            Meses: 'calendar-outline',
            Anual: 'stats-chart-outline',
            Investir: 'trending-up-outline',
            Config: 'settings-outline',
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
      <Tab.Screen
        name="Config"
        component={SettingsScreen}
        options={{ title: 'Configurações', tabBarLabel: 'Config' }}
      />
    </Tab.Navigator>
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
      <Tabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <DataProvider>
            <InstallmentProvider>
              <Navigation />
            </InstallmentProvider>
          </DataProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
