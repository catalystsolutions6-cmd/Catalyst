import { useCallback, useLayoutEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, Text, View } from "react-native";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl, type Product } from "../../api";
import { useAuth } from "../../auth";
import { productCache } from "../../productCache";
import { Button, C, formatPKR } from "../../ui";

export default function MyListings() {
  const { logout } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={logout} hitSlop={10} style={{ marginRight: 16 }}>
          <Text style={{ color: C.primary, fontWeight: "600" }}>Log out</Text>
        </Pressable>
      ),
    });
  }, [navigation, logout]);

  const load = useCallback(async () => {
    try {
      const list = await api.listProducts();
      productCache.setAll(list);
      setProducts(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load listings");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const activeCount = products?.filter((p) => p.status === "active").length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 170 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          products && products.length > 0 ? (
            <Text style={{ color: C.muted, marginBottom: 12 }}>
              {products.length} listing{products.length === 1 ? "" : "s"} · {activeCount} live
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          products === null && !error ? (
            <Text style={{ textAlign: "center", color: C.muted, marginTop: 40 }}>Loading…</Text>
          ) : error ? (
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: C.danger, textAlign: "center", marginBottom: 12 }}>{error}</Text>
              <Button title="Try again" variant="secondary" onPress={refresh} />
            </View>
          ) : (
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 48 }}>📦</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, marginTop: 12 }}>No listings yet</Text>
              <Text style={{ color: C.muted, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
                Take a photo of any laptop, LCD, headphones or accessory. The app writes the title and details for you.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <ProductRow product={item} />}
      />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 6, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border }}>
        <Button title="Snap a product" icon="📷" onPress={() => router.push({ pathname: "/new", params: { source: "camera" } })} />
        <Pressable onPress={() => router.push({ pathname: "/new", params: { source: "gallery" } })} style={{ padding: 10 }}>
          <Text style={{ textAlign: "center", color: C.primary, fontWeight: "600" }}>or choose from gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProductRow({ product: p }: { product: Product }) {
  const soldOut = p.stock <= 0;
  const badge = p.status === "draft" ? { t: "Hidden", c: C.muted } : soldOut ? { t: "Sold out", c: C.warning } : { t: "Live", c: C.success };
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
      style={({ pressed }) => ({
        flexDirection: "row",
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {p.images[0] ? (
        <Image source={{ uri: imageUrl(p.images[0]) }} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: C.bg }} />
      ) : (
        <View style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: C.bg }} />
      )}
      <View style={{ flex: 1, marginLeft: 12, justifyContent: "space-between" }}>
        <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "600", color: C.text }}>
          {p.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.primaryDark }}>{formatPKR(p.price)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: C.muted, fontSize: 13, marginRight: 8 }}>Stock {p.stock}</Text>
            <View style={{ backgroundColor: badge.c + "22", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: badge.c, fontSize: 12, fontWeight: "700" }}>{badge.t}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
