import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth";
import { BRAND } from "../brand";
import { IS_DEMO } from "../api";
import { Button, C, Field } from "../ui";

export default function Login() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!phone.trim() || !password) {
      setError("Enter your phone number and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 36 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: C.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 34 }}>📷</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: C.text }}>{BRAND.appName}</Text>
            <Text style={{ fontSize: 15, color: C.muted, marginTop: 6, textAlign: "center" }}>{BRAND.tagline}</Text>
          </View>

          <Field
            label="Phone number"
            placeholder="03XX XXXXXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
          />
          <Field
            label="Password"
            placeholder="Your shop password"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          {error ? <Text style={{ color: C.danger, marginBottom: 12, fontSize: 14 }}>{error}</Text> : null}
          <Button title="Log in" onPress={submit} loading={loading} />
          {IS_DEMO ? (
            <Text style={{ color: C.primaryDark, backgroundColor: C.primarySoft, borderRadius: 10, padding: 10, fontSize: 13, textAlign: "center", marginTop: 16 }}>
              Preview with sample data: type any phone number and password.
            </Text>
          ) : null}
          <Text style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 20 }}>
            No account yet? Ask the {BRAND.marketplaceName} team to set up your shop.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
