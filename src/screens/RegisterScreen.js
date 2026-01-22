import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { colors, radius, space } from "../theme/tokens";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const onRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pw);
      router.replace("/");
    } catch (e) {
      Alert.alert("Đăng ký thất bại", e.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.md, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Đăng ký</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 }}
      />
      <TextInput
        placeholder="Mật khẩu (>= 6 ký tự)"
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 }}
      />

      <Pressable onPress={onRegister} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: radius.lg, alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "900" }}>Tạo tài khoản</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ padding: 10, alignItems: "center" }}>
        <Text style={{ fontWeight: "900" }}>Quay lại</Text>
      </Pressable>
    </View>
  );
}
