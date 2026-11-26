import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { api, FALLBACK_CATEGORIES, type Category, type Condition } from "./api";
import { C, Chip, Field, SectionTitle, styles } from "./ui";

export interface FormValues {
  title: string;
  description: string;
  categorySlug: string;
  brand: string;
  model: string;
  condition: Condition;
  specs: { name: string; value: string }[];
  price: string; // kept as text while editing
  stock: string;
}

export const EMPTY_FORM: FormValues = {
  title: "",
  description: "",
  categorySlug: "",
  brand: "",
  model: "",
  condition: "used",
  specs: [],
  price: "",
  stock: "1",
};

export type FormErrors = Partial<Record<"title" | "categorySlug" | "price" | "stock", string>>;

export function validate(v: FormValues): FormErrors {
  const e: FormErrors = {};
  if (v.title.trim().length < 5) e.title = "Add a title (at least 5 characters).";
  if (!v.categorySlug) e.categorySlug = "Pick a category.";
  const price = parsePrice(v.price);
  if (!price) e.price = "Enter the price in rupees.";
  const stock = Number(v.stock);
  if (!Number.isInteger(stock) || stock < 0) e.stock = "Stock must be 0 or more.";
  return e;
}

export function parsePrice(s: string): number | null {
  const n = Number(s.replace(/[^\d]/g, ""));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function specsToObject(specs: FormValues["specs"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of specs) if (s.name.trim() && s.value.trim()) out[s.name.trim()] = s.value.trim();
  return out;
}

export function specsFromObject(o: Record<string, string> | undefined): FormValues["specs"] {
  return Object.entries(o ?? {}).map(([name, value]) => ({ name, value }));
}

let categoriesCache: Category[] | null = null;
function useCategories(): Category[] {
  const [cats, setCats] = useState<Category[]>(categoriesCache ?? FALLBACK_CATEGORIES);
  useEffect(() => {
    if (categoriesCache) return;
    api
      .categories()
      .then((c) => {
        if (Array.isArray(c) && c.length) {
          categoriesCache = c;
          setCats(c);
        }
      })
      .catch(() => {});
  }, []);
  return cats;
}

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

export function ListingForm({
  value: v,
  onChange,
  errors,
}: {
  value: FormValues;
  onChange: (v: FormValues) => void;
  errors: FormErrors;
}) {
  const categories = useCategories();
  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) => onChange({ ...v, [k]: val });
  const setSpec = (i: number, patch: Partial<{ name: string; value: string }>) =>
    set(
      "specs",
      v.specs.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    );

  return (
    <View>
      <SectionTitle>Price & stock</SectionTitle>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 2 }}>
          <Field
            label="Price (Rs)"
            placeholder="e.g. 85000"
            keyboardType="number-pad"
            value={v.price}
            onChangeText={(t) => set("price", t.replace(/[^\d]/g, ""))}
            error={errors.price}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Stock"
            keyboardType="number-pad"
            value={v.stock}
            onChangeText={(t) => set("stock", t.replace(/[^\d]/g, ""))}
            error={errors.stock}
          />
        </View>
      </View>

      <SectionTitle>Product details</SectionTitle>
      <Field label="Title" value={v.title} onChangeText={(t) => set("title", t)} error={errors.title} maxLength={120} />

      <Text style={styles.label}>Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {categories.map((c) => (
          <Chip key={c.slug} label={c.name} selected={v.categorySlug === c.slug} onPress={() => set("categorySlug", c.slug)} />
        ))}
      </View>
      {errors.categorySlug ? <Text style={[styles.error, { marginTop: -2 }]}>{errors.categorySlug}</Text> : null}

      <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Brand" value={v.brand} onChangeText={(t) => set("brand", t)} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Model" value={v.model} onChangeText={(t) => set("model", t)} />
        </View>
      </View>

      <Text style={styles.label}>Condition</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
        {CONDITIONS.map((c) => (
          <Chip key={c.value} label={c.label} selected={v.condition === c.value} onPress={() => set("condition", c.value)} />
        ))}
      </View>

      <SectionTitle>Specs</SectionTitle>
      {v.specs.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1, fontSize: 14, paddingVertical: 9 }]}
            placeholder="e.g. RAM"
            placeholderTextColor="#94A3B8"
            value={s.name}
            onChangeText={(t) => setSpec(i, { name: t })}
          />
          <TextInput
            style={[styles.input, { flex: 1.4, fontSize: 14, paddingVertical: 9 }]}
            placeholder="e.g. 16GB"
            placeholderTextColor="#94A3B8"
            value={s.value}
            onChangeText={(t) => setSpec(i, { value: t })}
          />
          <Pressable
            hitSlop={8}
            onPress={() => set("specs", v.specs.filter((_, j) => j !== i))}
            accessibilityLabel="Remove spec"
          >
            <Text style={{ color: C.danger, fontSize: 20, paddingHorizontal: 4 }}>×</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => set("specs", [...v.specs, { name: "", value: "" }])} style={{ paddingVertical: 8, marginBottom: 8 }}>
        <Text style={{ color: C.primary, fontWeight: "600" }}>+ Add spec</Text>
      </Pressable>

      <Field label="Description" multiline value={v.description} onChangeText={(t) => set("description", t)} />
    </View>
  );
}
