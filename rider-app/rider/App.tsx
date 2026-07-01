import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RiderAuthProvider, useRiderAuth } from './src/auth/RiderAuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useRiderAuth();
  if (isLoading) return null;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <RiderAuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </RiderAuthProvider>
  );
}
