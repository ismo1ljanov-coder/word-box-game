import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const router = useRouter();
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!displayName.trim() || !phone.trim() || !password) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 belgidan iborat bo'lishi kerak");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await register(phone.trim(), password, displayName.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("409") || msg.includes("already")) {
        setError("Bu telefon raqam allaqachon ro'yxatdan o'tgan");
      } else {
        setError("Xatolik yuz berdi. Qayta urinib ko'ring");
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad + 24, paddingBottom: Math.max(insets.bottom, 34) + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoRow}>
          <View style={[s.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="book" size={32} color="#fff" />
          </View>
          <Text style={[s.logoText, { color: colors.foreground }]}>Wordbox</Text>
        </View>

        <Text style={[s.title, { color: colors.foreground }]}>Ro'yxatdan o'tish</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
          Ingliz lug'atini o'rganishni boshlang
        </Text>

        {error ? (
          <View style={[s.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive }]}>
            <Ionicons name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>
          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>Ismingiz</Text>
            <View style={[s.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.foreground }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ism familiya"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>Telefon raqam</Text>
            <View style={[s.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                ref={phoneRef}
                style={[s.input, { color: colors.foreground }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+998 90 000 00 00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>Parol</Text>
            <View style={[s.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[s.input, { color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Kamida 6 belgi"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              s.btn,
              { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 },
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Ro'yxatdan o'tish</Text>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>
            Hisobingiz bormi?{" "}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[s.footerLink, { color: colors.primary }]}>Kirish</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: 24 },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
    logoBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    logoText: { fontSize: 24, fontWeight: "800" as const, fontFamily: "Nunito_800ExtraBold" },
    title: { fontSize: 28, fontWeight: "800" as const, fontFamily: "Nunito_800ExtraBold", marginBottom: 6 },
    subtitle: { fontSize: 15, marginBottom: 24, fontFamily: "Nunito_400Regular" },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    errorText: { fontSize: 13, flex: 1, fontFamily: "Nunito_600SemiBold" },
    form: { gap: 16 },
    field: { gap: 6 },
    label: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
    inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, fontFamily: "Nunito_400Regular" },
    eyeBtn: { padding: 4 },
    btn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28 },
    footerText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
    footerLink: { fontSize: 14, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
  });
