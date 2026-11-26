import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../auth";
import { C } from "../ui";

function RootStack() {
  const { ready, shop } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.card },
        headerTintColor: C.text,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Protected guard={!!shop}>
        <Stack.Screen name="index" options={{ title: shop?.name ?? "My shop" }} />
        <Stack.Screen name="new" options={{ title: "New listing" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Edit listing" }} />
      </Stack.Protected>
      <Stack.Protected guard={!shop}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootStack />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
