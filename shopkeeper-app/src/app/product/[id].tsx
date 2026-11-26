import { useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl, type Product, type ProductStatus } from "../../api";
import { ListingForm, parsePrice, specsFromObject, specsToObject, validate, type FormErrors, type FormValues } from "../../ListingForm";
import { productCache } from "../../productCache";
import { Button, C, Card } from "../../ui";

function toForm(p: Product): FormValues {
  return {
    title: p.title,
    description: p.description ?? "",
    categorySlug: p.categorySlug,
    brand: p.brand ?? "",
    model: p.model ?? "",
    condition: p.condition ?? "used",
    specs: specsFromObject(p.specs),
    price: String(p.price),
    stock: String(p.stock),
  };
}

export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | undefined>(() => productCache.get(id));
  const [form, setForm] = useState<FormValues | null>(() => (product ? toForm(product) : null));
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (product) return;
    api
      .listProducts()
      .then((list) => {
        productCache.setAll(list);
        const p = list.find((x) => x.id === id);
        setProduct(p);
        if (p) setForm(toForm(p));
      })
      .catch(() => {});
  }, [id, product]);

  if (!product || !form) {
    return <Text style={{ textAlign: "center", marginTop: 40, color: C.muted }}>Loading…</Text>;
  }

  async function patch(changes: Partial<Product>, label: string, close = false) {
    setBusy(label);
    try {
      const updated = await api.updateProduct(product!.id, changes);
      productCache.put(updated);
      setProduct(updated);
      setForm(toForm(updated));
      if (close) router.back();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function saveAll() {
    const errs = validate(form!);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    void patch(
      {
        title: form!.title.trim(),
        description: form!.description.trim(),
        categorySlug: form!.categorySlug,
        brand: form!.brand.trim(),
        model: form!.model.trim(),
        condition: form!.condition,
        specs: specsToObject(form!.specs),
        price: parsePrice(form!.price)!,
        stock: Number(form!.stock),
      },
      "save",
      true,
    );
  }

  const isLive = product.status === "active";
  const nextStatus: ProductStatus = isLive ? "draft" : "active";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {product.images.map((u) => (
            <Image key={u} source={{ uri: imageUrl(u) }} style={{ width: 110, height: 110, borderRadius: 12, marginRight: 10, backgroundColor: C.border }} />
          ))}
        </ScrollView>

        <Card style={{ marginBottom: 14 }}>
          <Text style={{ fontWeight: "700", color: C.text }}>
            {isLive ? (product.stock > 0 ? "🟢 Live on the marketplace" : "🟠 Live but sold out") : "⚪ Hidden from customers"}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Button
              title={isLive ? "Hide" : "Publish"}
              variant={isLive ? "ghost" : "primary"}
              onPress={() => patch({ status: nextStatus }, "status")}
              loading={busy === "status"}
              disabled={!!busy}
              style={{ flex: 1, height: 44 }}
            />
            {product.stock > 0 && (
              <Button
                title="Mark sold out"
                variant="ghost"
                onPress={() => patch({ stock: 0 }, "soldout")}
                loading={busy === "soldout"}
                disabled={!!busy}
                style={{ flex: 1, height: 44 }}
              />
            )}
          </View>
        </Card>

        <ListingForm value={form} onChange={setForm} errors={errors} />
      </ScrollView>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          backgroundColor: C.card,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <Button title="Save changes" onPress={saveAll} loading={busy === "save"} disabled={!!busy} />
      </View>
    </KeyboardAvoidingView>
  );
}
