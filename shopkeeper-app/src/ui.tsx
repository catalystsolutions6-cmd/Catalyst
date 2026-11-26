import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { BRAND } from "./brand";

export const C = BRAND.colors;

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary" ? C.primary : variant === "danger" ? C.danger : variant === "secondary" ? C.primarySoft : "transparent";
  const fg = variant === "primary" || variant === "danger" ? "#fff" : C.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: C.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }]}>
          {icon ? `${icon}  ` : ""}
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: "top" }, error && { borderColor: C.danger }, props.style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: C.primary, borderColor: C.primary }]}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function formatPKR(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

export const styles = StyleSheet.create({
  btn: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", color: C.text, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: C.text,
  },
  hint: { fontSize: 12, color: C.muted, marginTop: 4 },
  error: { fontSize: 12, color: C.danger, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 14, color: C.text, fontWeight: "500" },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  section: { fontSize: 13, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 6 },
});
