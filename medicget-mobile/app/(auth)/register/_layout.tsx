import { Stack } from 'expo-router';

export default function RegisterStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="patient" />
      <Stack.Screen name="professional" />
      <Stack.Screen name="professional-address" />
      <Stack.Screen name="clinic" />
      <Stack.Screen name="clinic-details" />
      <Stack.Screen name="clinic-address" />
    </Stack>
  );
}
