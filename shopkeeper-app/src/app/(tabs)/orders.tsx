import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api, type ShopOrder } from "../../api";
import { ORDER_STATUS, shortDate } from "../../orderStatus";
import { Button, C, Chip, formatPKR } from "../../ui";

type Filter = "open" | "done";

export default function Orders() {
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("open");

  const load = useCallback(async () => {
    try {
      setOrders(await api.listOrders());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), 30_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const isOpen = (o: ShopOrder) => o.status === "pending" || o.status === "packed" || o.status === "ready";
  const shown = (orders ?? []).filter((o) => (filter === "open" ? isOpen(o) : !isOpen(o)));
  const openCount = (orders ?? []).filter(isOpen).length;

  return (
    <FlatList
      data={shown}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Chip label={`To do${openCount ? ` (${openCount})` : ""}`} selected={filter === "open"} onPress={() => setFilter("open")} />
          <Chip label="Completed" selected={filter === "done"} onPress={() => setFilter("done")} />
        </View>
      }
      ListEmptyComponent={
        orders === null && !error ? (
          <Text style={{ textAlign: "center", color: C.muted, marginTop: 40 }}>Loading…</Text>
        ) : error ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: C.danger, textAlign: "center", marginBottom: 12 }}>{error}</Text>
            <Button title="Try again" variant="secondary" onPress={refresh} />
          </View>
        ) : (
          <View style={{ alignItems: "center", marginTop: 50, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 44 }}>🧾</Text>
            <Text style={{ fontSize: 19, fontWeight: "700", color: C.text, marginTop: 12 }}>
              {filter === "open" ? "No orders to pack" : "No completed orders yet"}
            </Text>
            <Text style={{ color: C.muted, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
              We call every customer to confirm their order first. Confirmed orders for your products show up here.
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => <OrderRow order={item} />}
    />
  );
}

function OrderRow({ order: o }: { order: ShopOrder }) {
  const s = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending;
  const qty = o.items.reduce((t, i) => t + i.quantity, 0);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/order/[id]", params: { id: o.id } })}
      style={({ pressed }) => ({
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: o.status === "pending" ? C.warning : C.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", color: C.text, fontSize: 15 }}>Order #{o.orderNumber}</Text>
        <View style={{ backgroundColor: s.color + "22", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: s.color, fontSize: 12, fontWeight: "700" }}>{s.label}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={{ color: C.text, marginTop: 6 }}>
        {o.items.map((i) => `${i.quantity} × ${i.title}`).join("\n")}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>
          {shortDate(o.confirmedAt ?? o.createdAt)} · {qty} item{qty === 1 ? "" : "s"}
        </Text>
        <Text style={{ fontWeight: "700", color: C.primaryDark }}>{formatPKR(o.total)}</Text>
      </View>
    </Pressable>
  );
}
