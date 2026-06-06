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
  const { isInvestor } = useSettings();
  const insets = useSafeAreaInsets();
  const currentMonthName = MONTH_NAMES[new Date().getMonth()];

  return (
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
      <Tab.Screen
        name="Projetos"
        component={ProjectsScreen}
        options={{ title: 'Projetos', tabBarLabel: 'Projetos' }}
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
            <InstallmentProvider>
              <NotificationsManager />
              <Navigation />
            </InstallmentProvider>
          </DataProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
