import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { auth } from './firebaseConfig';
import { colors } from './constants/theme';

// Import screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreenSimple';
import WardrobeScreen from './screens/WardrobeScreen';
import ShopScreen from './screens/ShopScreen';
import TodoTeamsScreen from './screens/TodoTeamsScreen';
import TeamDetailScreen from './screens/TeamDetailScreen';
import LegalScreen from './screens/LegalScreen';
import { AppAlertProvider } from './components/ui/AppAlert';
import { LanguageProvider } from './utils/LanguageContext';

const Stack = createNativeStackNavigator();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to authentication state
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <AppAlertProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 200,
            }}
          >
            {user ? (
              // Authenticated screens
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
                <Stack.Screen name="Shop" component={ShopScreen} />
                <Stack.Screen name="TodoTeams" component={TodoTeamsScreen} />
                <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
              </>
            ) : (
              // Auth screens
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
            <Stack.Screen name="Legal" component={LegalScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppAlertProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});


export default App;
