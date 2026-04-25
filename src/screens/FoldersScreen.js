import React, { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { colors, radius, space } from "../theme/tokens";
import { useAuth } from "../auth/AuthContext";
import { listenFolders, addFolder, updateFolder, removeFolder } from "../firestore/foldersApi";

export default function FoldersScreen() {
  const { user, loading } = useAuth();

  const [folders, setFolders] = useState([]);
  const [newFolder, setNewFolder] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      if (loading) return;
      if (!user) {
        router.replace("/login");
        return;
      }

      const unsub = listenFolders(user.uid, (data) => setFolders(data));
      return unsub;
    }, [user, loading])
  );

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name) return Alert.alert("Lỗi", "Tên folder không được để trống.");

    const exists = folders.some((f) => f.name.toLowerCase() === name.toLowerCase());
    if (exists) return Alert.alert("Lỗi", "Folder này đã tồn tại.");

    try {
      await addFolder(user.uid, name);
      setNewFolder("");
      Alert.alert("Thành công", `Đã tạo folder "${name}"`);
    } catch (e) {
      console.log("addFolder error:", e);
      Alert.alert("Lỗi", "Không thể tạo folder.");
    }
  };

  const startRename = (folder) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const confirmRename = async () => {
    const name = editingName.trim();
    if (!name) return Alert.alert("Lỗi", "Tên folder mới không được để trống.");

    const exists = folders.some(
      (f) => f.id !== editingId && f.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) return Alert.alert("Lỗi", "Tên folder đã tồn tại.");

    try {
      await updateFolder(user.uid, editingId, name);
      cancelRename();
      Alert.alert("Thành công", "Đã đổi tên folder.");
    } catch (e) {
      console.log("updateFolder error:", e);
      Alert.alert("Lỗi", "Không thể đổi tên folder.");
    }
  };

  const deleteFolder = (folder) => {
    Alert.alert(
      "Xóa folder?",
      `Bạn có chắc muốn xóa folder "${folder.name}"?`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFolder(user.uid, folder.id);
            } catch (e) {
              console.log("removeFolder error:", e);
              Alert.alert("Lỗi", "Không thể xóa folder.");
            }
          },
        },
      ]
    );
  };

  const Card = ({ children }) => (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: 12,
      }}
    >
      {children}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.md, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>
          Folder Manager
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ fontWeight: "900", color: colors.text }}>Back</Text>
        </Pressable>
      </View>

      <Card>
        <Text style={{ fontWeight: "900", marginBottom: 8, color: colors.text }}>
          Tạo folder
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={newFolder}
            onChangeText={setNewFolder}
            placeholder='VD: "Học tập"'
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: colors.bg,
            }}
          />
          <Pressable
            onPress={createFolder}
            style={{
              paddingHorizontal: 14,
              borderRadius: radius.lg,
              backgroundColor: colors.primary,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Tạo</Text>
          </Pressable>
        </View>
      </Card>

      {editingId && (
        <Card>
          <Text style={{ fontWeight: "900", color: colors.text }}>Đổi tên folder</Text>

          <TextInput
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Nhập tên mới..."
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: colors.bg,
            }}
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable
              onPress={confirmRename}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: radius.lg,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Lưu</Text>
            </Pressable>

            <Pressable
              onPress={cancelRename}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 12,
                borderRadius: radius.lg,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: colors.text }}>Huỷ</Text>
            </Pressable>
          </View>
        </Card>
      )}

      <Text style={{ fontWeight: "900", color: colors.text }}>Danh sách folder</Text>

      <FlatList
        data={folders}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>
                  📁 {item.name}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable onPress={() => startRename(item)}>
                  <Text style={{ fontWeight: "900", color: colors.text }}>Rename</Text>
                </Pressable>
                <Pressable onPress={() => deleteFolder(item)}>
                  <Text style={{ fontWeight: "900", color: colors.danger }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.subtext }}>Chưa có folder nào.</Text>
        }
      />
    </View>
  );
}