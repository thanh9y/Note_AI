import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "HVT Note" }} />
        <Stack.Screen name="edit-note" options={{ title: "Ghi chú" }} />
        <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
        <Stack.Screen name="register" options={{ title: "Đăng ký" }} />
      </Stack>
    </AuthProvider>
  );
}
