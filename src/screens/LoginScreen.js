import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useNavigation } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { colors, space } from "../theme/tokens";

export default function LoginScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const onLogin = async () => {
    const safeEmail = email.trim();

    if (!safeEmail || !pw) {
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập email và mật khẩu.");
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, safeEmail, pw);
      router.replace("/");
    } catch (e) {
      Alert.alert("Đăng nhập thất bại", e?.message || "Không thể đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: space.md,
          justifyContent: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 32, fontWeight: "900", color: colors.text }}>
            SIGN IN
          </Text>

          <Text style={{ color: colors.subtext }}>
            Đăng nhập để tiếp tục sử dụng HVT Note
          </Text>

          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "800", color: colors.text }}>Email</Text>
            <TextInput
              placeholder="Nhập email"
              placeholderTextColor={colors.subtext}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: colors.card,
                color: colors.text,
              }}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "800", color: colors.text }}>Mật khẩu</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                backgroundColor: colors.card,
                flexDirection: "row",
                alignItems: "center",
                paddingRight: 12,
              }}
            >
              <TextInput
                ref={passwordRef}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={colors.subtext}
                value={pw}
                onChangeText={setPw}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onLogin}
                style={{
                  flex: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: colors.text,
                }}
              />
              <Pressable onPress={() => setShowPw((prev) => !prev)}>
                <Text style={{ fontWeight: "800", color: colors.text }}>
                  {showPw ? "Ẩn" : "Hiện"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 999,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              {loading ? "Đang đăng nhập..." : "SIGN IN"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/register")}
            style={{ alignItems: "center" }}
          >
            <Text style={{ fontWeight: "800", color: colors.text }}>Sign up</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/forgot-password")}
            style={{ alignItems: "center" }}
          >
            <Text style={{ fontWeight: "800", color: colors.text }}>Forgot Password</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}