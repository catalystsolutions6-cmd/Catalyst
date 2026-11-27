import { useCallback, useEffect, useState } from "react";
import { AppState, Text } from "react-native";
import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { C } from "../../ui";

/** Number of confirmed orders this shop still has to pack, shown as a badge on the Orders tab. */
function useOpenOrderCount() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const list = await api.listOrders();
      setCount(list.filter((o) => o.status === "pending" || o.status === "packed").length);
    } catch {
      // keep the last count when offline
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 60_000);
    const sub = AppState.addEventListener("change", (s) => s === "active" && void refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);
  return count;
}

export default function TabsLayout() {
  const { shop } = useAuth();
  const openOrders = useOpenOrderCount();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.card },
        headerTintColor: C.text,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
        tabBarStyle: { height: 66 + insets.bottom, paddingTop: 4, paddingBottom: 4 + insets.bottom },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: shop?.name ?? "My shop",
          tabBarLabel: "Listings",
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, lineHeight: 22, opacity: focused ? 1 : 0.55 }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarBadge: openOrders > 0 ? openOrders : undefined,
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, lineHeight: 22, opacity: focused ? 1 : 0.55 }}>🧾</Text>,
        }}
      />
    </Tabs>
  );
}
