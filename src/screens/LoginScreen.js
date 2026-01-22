import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { colors, radius, space } from "../theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const onLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      router.replace("/");
    } catch (e) {
      Alert.alert("Đăng nhập thất bại", e.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.md, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Đăng nhập</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 }}
      />
      <TextInput
        placeholder="Mật khẩu"
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 }}
      />

      <Pressable onPress={onLogin} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: radius.lg, alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "900" }}>Đăng nhập</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/register")} style={{ padding: 10, alignItems: "center" }}>
        <Text style={{ fontWeight: "900" }}>Chưa có tài khoản? Đăng ký</Text>
      </Pressable>
    </View>
  );
}
