import { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Image, Platform, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { api, imageUrl, type ShopOrder } from "../../api";
import { ORDER_STATUS, shortDate } from "../../orderStatus";
import { Button, C, Card, formatPKR } from "../../ui";

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: order ? `Order #${order.orderNumber}` : "Order" });
  }, [navigation, order]);

  const load = useCallback(async () => {
    try {
      setOrder(await api.getOrder(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the order");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function setStatus(status: "pending" | "packed" | "ready") {
    setSaving(status);
    try {
      setOrder(await api.setOrderStatus(id, status));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      if (Platform.OS === "web") setError(msg);
      else Alert.alert("Could not update", msg);
      void load();
    } finally {
      setSaving(null);
    }
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {error ? (
          <>
            <Text style={{ color: C.danger, textAlign: "center", marginBottom: 12 }}>{error}</Text>
            <Button title="Try again" variant="secondary" onPress={load} />
          </>
        ) : (
          <Text style={{ color: C.muted }}>Loading…</Text>
        )}
      </View>
    );
  }

  const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
  const editable = order.status === "pending" || order.status === "packed" || order.status === "ready";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card style={{ backgroundColor: s.color + "14", borderColor: s.color + "55", marginBottom: 14 }}>
        <Text style={{ color: s.color, fontWeight: "800", fontSize: 17 }}>{s.label}</Text>
        <Text style={{ color: C.text, marginTop: 4, lineHeight: 20 }}>{s.hint}</Text>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        {order.items.map((i, idx) => (
          <View key={i.id} style={{ flexDirection: "row", paddingVertical: 10, borderTopWidth: idx ? 1 : 0, borderTopColor: C.border }}>
            {i.image ? (
              <Image source={{ uri: imageUrl(i.image) }} style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: C.bg }} />
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: C.bg }} />
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: C.text, fontWeight: "600" }}>{i.title}</Text>
              <Text style={{ color: C.muted, marginTop: 4 }}>
                {i.quantity} × {formatPKR(i.price)}
                {i.status === "cancelled" ? "  ·  cancelled" : ""}
              </Text>
            </View>
            <Text style={{ fontWeight: "700", color: C.text, marginLeft: 8 }}>{formatPKR(i.price * i.quantity)}</Text>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 4 }}>
          <Row label="Order total" value={formatPKR(order.total)} />
          <Row label={`Platform commission (${order.commissionPercent}%)`} value={`− ${formatPKR(order.total - order.payout)}`} />
          <Row label="You receive" value={formatPKR(order.payout)} bold />
        </View>
      </Card>

      <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 19 }}>
        Confirmed {shortDate(order.confirmedAt ?? order.createdAt)} · Delivery to {order.city}. We handle delivery and payment
        collection; our rider picks the order up from your shop.
      </Text>

      {editable && (
        <View style={{ gap: 10 }}>
          {order.status === "pending" && (
            <Button title="Mark as packed" onPress={() => setStatus("packed")} loading={saving === "packed"} disabled={!!saving} />
          )}
          {order.status !== "ready" && (
            <Button
              title="Ready for pickup"
              variant={order.status === "pending" ? "secondary" : "primary"}
              onPress={() => setStatus("ready")}
              loading={saving === "ready"}
              disabled={!!saving}
            />
          )}
          {order.status !== "pending" && (
            <Button title="Undo, back to To pack" variant="ghost" onPress={() => setStatus("pending")} loading={saving === "pending"} disabled={!!saving} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: bold ? C.text : C.muted, fontWeight: bold ? "700" : "400" }}>{label}</Text>
      <Text style={{ color: bold ? C.primaryDark : C.text, fontWeight: bold ? "800" : "500" }}>{value}</Text>
    </View>
  );
}
