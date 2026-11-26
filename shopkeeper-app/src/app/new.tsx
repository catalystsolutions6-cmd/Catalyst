import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ProductStatus } from "../api";
import { EMPTY_FORM, ListingForm, parsePrice, specsFromObject, specsToObject, validate, type FormErrors, type FormValues } from "../ListingForm";
import { PermissionDeniedError, pickPhotos, type PhotoSource } from "../photos";
import { Button, C, Card } from "../ui";

type Phase = "pick" | "analyzing" | "review";

export default function NewListing() {
  const { source } = useLocalSearchParams<{ source?: PhotoSource }>();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("pick");
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [aiError, setAiError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [saving, setSaving] = useState<ProductStatus | null>(null);
  // Uploads start as soon as a photo is taken, so publishing is instant later.
  const uploads = useRef(new Map<string, Promise<string>>());
  const autoOpened = useRef(false);

  useEffect(() => {
    if (autoOpened.current || !source) return;
    autoOpened.current = true;
    void addPhotos(source, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  function startUpload(uri: string) {
    if (!uploads.current.has(uri)) {
      const p = api.uploadImage(uri).then((r) => r.url);
      p.catch(() => {}); // surfaced on publish
      uploads.current.set(uri, p);
    }
  }

  async function addPhotos(src: PhotoSource, first = false) {
    let picked: string[];
    try {
      picked = await pickPhotos(src, 6 - photos.length);
    } catch (e) {
      Alert.alert("Permission needed", e instanceof PermissionDeniedError ? e.message : "Could not open the camera.");
      if (first) router.back();
      return;
    }
    if (picked.length === 0) {
      if (first && photos.length === 0) router.back();
      return;
    }
    picked.forEach(startUpload);
    const isFirst = photos.length === 0;
    setPhotos((prev) => [...prev, ...picked].slice(0, 6));
    if (isFirst) void analyze(picked[0]);
  }

  async function analyze(uri: string) {
    setPhase("analyzing");
    setAiError(null);
    try {
      const d = await api.analyze(uri);
      setForm((f) => ({
        ...f,
        title: d.title,
        description: d.description,
        categorySlug: d.categorySlug,
        brand: d.brand,
        model: d.model,
        condition: d.condition,
        specs: specsFromObject(d.specs),
      }));
      setConfidence(d.confidence);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Could not read the photo.");
    } finally {
      setPhase("review");
    }
  }

  function removePhoto(uri: string) {
    setPhotos((p) => p.filter((x) => x !== uri));
    uploads.current.delete(uri);
  }

  async function save(status: ProductStatus) {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      Alert.alert("Almost there", Object.values(errs)[0]);
      return;
    }
    if (photos.length === 0) {
      Alert.alert("Add a photo", "Listings need at least one photo.");
      return;
    }
    setSaving(status);
    try {
      let images: string[];
      try {
        images = await Promise.all(
          photos.map((uri) => {
            // Retry any upload that failed earlier (e.g. bad signal).
            const p = uploads.current.get(uri);
            return p ? p.catch(() => api.uploadImage(uri).then((r) => r.url)) : api.uploadImage(uri).then((r) => r.url);
          }),
        );
      } catch {
        throw new Error("Photo upload failed. Check your internet and try again.");
      }
      await api.createProduct({
        title: form.title.trim(),
        description: form.description.trim(),
        categorySlug: form.categorySlug,
        brand: form.brand.trim(),
        model: form.model.trim(),
        condition: form.condition,
        specs: specsToObject(form.specs),
        price: parsePrice(form.price)!,
        stock: Number(form.stock),
        images,
        status,
      });
      if (Platform.OS === "web") {
        // Alert has no buttons on web previews; go straight back to the list.
        router.back();
        return;
      }
      Alert.alert(status === "active" ? "Published ✅" : "Saved as draft", status === "active" ? "Your product is now live on the marketplace." : "You can publish it later from My listings.", [
        { text: "List another", onPress: () => router.replace({ pathname: "/new", params: { source: "camera" } }) },
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(null);
    }
  }

  if (phase === "pick" && photos.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 48, textAlign: "center" }}>📷</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", textAlign: "center", color: C.text, marginTop: 12 }}>Photograph the product</Text>
        <Text style={{ color: C.muted, textAlign: "center", marginTop: 8, marginBottom: 28, lineHeight: 20 }}>
          Good light, whole product in frame. If there is a model sticker or box, include it so details come out right.
        </Text>
        <Button title="Take photo" icon="📷" onPress={() => addPhotos("camera")} />
        <Button title="Choose from gallery" variant="ghost" onPress={() => addPhotos("gallery")} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {photos.map((uri, i) => (
            <View key={uri} style={{ marginRight: 10 }}>
              <Image source={{ uri }} style={{ width: i === 0 ? 150 : 100, height: i === 0 ? 150 : 100, borderRadius: 12, backgroundColor: C.border }} />
              {phase === "review" && (
                <Pressable
                  onPress={() => removePhoto(uri)}
                  hitSlop={8}
                  style={{ position: "absolute", top: 6, right: 6, backgroundColor: "#0009", borderRadius: 999, width: 24, height: 24, alignItems: "center", justifyContent: "center" }}
                  accessibilityLabel="Remove photo"
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>×</Text>
                </Pressable>
              )}
              {i === 0 && <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Cover photo</Text>}
            </View>
          ))}
          {photos.length < 6 && phase === "review" && (
            <Pressable
              onPress={() => addPhotos("camera")}
              onLongPress={() => addPhotos("gallery")}
              style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: C.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 26, color: C.muted }}>+</Text>
              <Text style={{ fontSize: 11, color: C.muted }}>Add photo</Text>
            </Pressable>
          )}
        </ScrollView>

        {phase === "analyzing" ? (
          <Card style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ fontSize: 17, fontWeight: "700", color: C.text, marginTop: 14 }}>Reading your product…</Text>
            <Text style={{ color: C.muted, marginTop: 6, textAlign: "center" }}>Finding the brand, model and specs. Takes a few seconds.</Text>
          </Card>
        ) : (
          <>
            {aiError ? (
              <Card style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", marginBottom: 14 }}>
                <Text style={{ color: C.danger, fontWeight: "700" }}>Couldn't fill it automatically</Text>
                <Text style={{ color: C.text, marginTop: 4 }}>{aiError}</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Button title="Try again" variant="secondary" onPress={() => analyze(photos[0])} style={{ flex: 1, height: 42 }} />
                </View>
              </Card>
            ) : (
              <Card style={{ backgroundColor: confidence !== null && confidence < 0.5 ? "#FFFBEB" : C.primarySoft, borderColor: "transparent", marginBottom: 14 }}>
                <Text style={{ color: C.primaryDark, fontWeight: "700" }}>
                  {confidence !== null && confidence < 0.5 ? "⚠️ Please check the model and specs" : "✨ Filled in from your photo"}
                </Text>
                <Text style={{ color: C.text, marginTop: 4 }}>
                  {confidence !== null && confidence < 0.5
                    ? "The exact model was hard to see. A photo of the sticker or box helps."
                    : "Check the details, add your price, and publish."}
                </Text>
              </Card>
            )}
            <ListingForm value={form} onChange={setForm} errors={errors} />
          </>
        )}
      </ScrollView>

      {phase === "review" && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: "row",
            gap: 10,
            padding: 16,
            paddingBottom: 16 + insets.bottom,
            backgroundColor: C.card,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          <Button title="Save draft" variant="ghost" onPress={() => save("draft")} loading={saving === "draft"} disabled={!!saving} style={{ flex: 1 }} />
          <Button title="Publish" onPress={() => save("active")} loading={saving === "active"} disabled={!!saving} style={{ flex: 2 }} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
