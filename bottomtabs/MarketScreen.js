import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MarketHomeScreen from '../app/screens/MarketHomeScreen';
import MarketListingDetailScreen from '../app/screens/MarketListingDetailScreen';
import CreateListingScreen from '../app/screens/CreateListingScreen';
import EditListingScreen from '../app/screens/EditListingScreen';

const Stack = createNativeStackNavigator();

export default function MarketScreen() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, detachInactiveScreens: false }}
    >
      <Stack.Screen name="MarketHome" component={MarketHomeScreen} />
      <Stack.Screen name="ListingDetail" component={MarketListingDetailScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
      <Stack.Screen name="EditListing" component={EditListingScreen} />
    </Stack.Navigator>
  );
}
