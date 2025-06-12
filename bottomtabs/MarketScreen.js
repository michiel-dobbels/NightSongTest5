import React, { Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const MarketHomeScreen = React.lazy(() => import('../app/screens/MarketHomeScreen'));
const MarketListingDetailScreen = React.lazy(() => import('../app/screens/MarketListingDetailScreen'));
const CreateListingScreen = React.lazy(() => import('../app/screens/CreateListingScreen'));
const EditListingScreen = React.lazy(() => import('../app/screens/EditListingScreen'));

const Stack = createNativeStackNavigator();

export default function MarketScreen() {
  return (
    <Suspense fallback={null}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MarketHome" component={MarketHomeScreen} />
        <Stack.Screen name="ListingDetail" component={MarketListingDetailScreen} />
        <Stack.Screen name="CreateListing" component={CreateListingScreen} />
        <Stack.Screen name="EditListing" component={EditListingScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
