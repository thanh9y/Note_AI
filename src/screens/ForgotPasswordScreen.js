import React, { useEffect, useState } from "react";
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
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { colors, space } from "../theme/tokens";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const onSendReset = async () => {
    const safeEmail = email.trim();

    if (!safeEmail) {
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập email.");
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, safeEmail);
      Alert.alert(
        "Đã gửi email",
        "Firebase đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư của bạn."
      );
      router.back();
    } catch (e) {
      Alert.alert("Gửi thất bại", e?.message || "Không thể gửi email reset mật khẩu.");
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
            FORGOT PASSWORD
          </Text>

          <Text style={{ color: colors.subtext }}>
            Nhập email để nhận liên kết đặt lại mật khẩu
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
              returnKeyType="done"
              onSubmitEditing={onSendReset}
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

          <Pressable
            onPress={onSendReset}
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
              {loading ? "Đang gửi..." : "SEND REQUEST"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ alignItems: "center" }}>
            <Text style={{ fontWeight: "800", color: colors.text }}>Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}