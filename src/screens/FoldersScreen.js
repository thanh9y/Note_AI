import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert } from "react-native";
import { router } from "expo-router";

import { colors, radius, space } from "../theme/tokens";
import { useAuth } from "../auth/AuthContext";
import { listenNotes, updateNote } from "../firestore/notesApi.js";

export default function FoldersScreen() {
  const { user, loading } = useAuth();

  const [notes, setNotes] = useState([]);

  // UI states
  const [newFolder, setNewFolder] = useState("");
  const [renameFrom, setRenameFrom] = useState(null);
  const [renameTo, setRenameTo] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsub = listenNotes(user.uid, (data) => setNotes(data));
    return unsub;
  }, [user, loading]);

  const folders = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => n.folder && set.add(n.folder));
    return Array.from(set).sort();
  }, [notes]);

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name) return;

    // Folder chỉ là "nhãn" của note, không có collection riêng.
    // Để folder xuất hiện ngay, bạn chỉ cần tạo note với folder đó.
    Alert.alert("Tạo folder", `Đã tạo folder "${name}". Hãy tạo note và chọn folder này.`);
    setNewFolder("");
  };

  const startRename = (oldName) => {
    setRenameFrom(oldName);
    setRenameTo(oldName);
  };

  const cancelRename = () => {
    setRenameFrom(null);
    setRenameTo("");
  };

  const confirmRename = async () => {
    if (!user) return;
    const from = renameFrom;
    const to = renameTo.trim();

    if (!from) return;
    if (!to) return Alert.alert("Lỗi", "Tên folder mới không được rỗng.");
    if (to === from) return cancelRename();

    // Đổi tên folder = update tất cả note có folder = from
    const list = notes.filter((n) => n.folder === from);
    if (list.length === 0) return cancelRename();

    try {
      const now = Date.now();
      await Promise.all(list.map((n) => updateNote(user.uid, n.id, { folder: to, updatedAt: now })));
      cancelRename();
      Alert.alert("Thành công", `Đã đổi "${from}" → "${to}"`);
    } catch (e) {
      Alert.alert("Lỗi", e.message);
    }
  };

  const deleteFolder = (name) => {
    if (!user) return;

    const list = notes.filter((n) => n.folder === name);
    Alert.alert(
      "Xoá folder?",
      `Xoá folder "${name}"?\nGhi chú sẽ bị bỏ folder (không xoá ghi chú).`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xoá",
          style: "destructive",
          onPress: async () => {
            try {
              const now = Date.now();
              await Promise.all(
                list.map((n) => updateNote(user.uid, n.id, { folder: "", updatedAt: now }))
              );
              Alert.alert("Đã xoá folder", `"${name}" đã được xoá.`);
            } catch (e) {
              Alert.alert("Lỗi", e.message);
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
      {/* Top bar */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Folder Manager</Text>

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

      {/* Create folder */}
      <Card>
        <Text style={{ fontWeight: "900", marginBottom: 8, color: colors.text }}>Tạo folder</Text>
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

        <Text style={{ marginTop: 8, color: colors.subtext, fontSize: 12 }}>
          * Folder được lưu như “tên folder” trong mỗi note. Khi bạn gán folder cho note thì folder sẽ
          xuất hiện trong danh sách.
        </Text>
      </Card>

      {/* Rename panel */}
      {renameFrom && (
        <Card>
          <Text style={{ fontWeight: "900", color: colors.text }}>
            Đổi tên folder: <Text style={{ color: colors.primary }}>{renameFrom}</Text>
          </Text>

          <TextInput
            value={renameTo}
            onChangeText={setRenameTo}
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

      {/* Folder list */}
      <Text style={{ fontWeight: "900", color: colors.text }}>Danh sách folder</Text>

      <FlatList
        data={folders}
        keyExtractor={(x) => x}
        contentContainerStyle={{ gap: 10, paddingBottom: 30 }}
        renderItem={({ item }) => {
          const count = notes.filter((n) => n.folder === item).length;

          return (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>
                    📁 {item}
                  </Text>
                  <Text style={{ color: colors.subtext, marginTop: 4 }}>{count} ghi chú</Text>
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
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: colors.subtext }}>
            Chưa có folder nào. Hãy tạo note và nhập Folder để folder xuất hiện.
          </Text>
        }
      />
    </View>
  );
}
