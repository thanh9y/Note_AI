import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable } from "react-native";
import { router, useFocusEffect, useNavigation } from "expo-router";

import NoteCard from "../components/NoteCard";
import { colors, space, radius } from "../theme/tokens";

import { useAuth } from "../auth/AuthContext";
import { listenNotes, removeNote, updateNote } from "../firestore/notesApi.js";
import { listenFolders } from "../firestore/foldersApi.js";

import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { cancelReminder } from "../notifications/reminders.js";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, loading } = useAuth();

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [q, setQ] = useState("");

  const [folderFilter, setFolderFilter] = useState("Tất cả");
  const [tagFilter, setTagFilter] = useState("Tất cả");
  const [showFolders, setShowFolders] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const [sortBy, setSortBy] = useState("updatedAt");

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      if (loading) return;

      if (!user?.uid) {
        router.replace("/login");
        return;
      }

      const unsubNotes = listenNotes(user.uid, (data) => setNotes(data));
      const unsubFolders = listenFolders(user.uid, (data) => setFolders(data));

      return () => {
        if (typeof unsubNotes === "function") unsubNotes();
        if (typeof unsubFolders === "function") unsubFolders();
      };
    }, [user?.uid, loading])
  );

  const onLogout = async () => {
    try {
      setNotes([]);
      setFolders([]);
      await signOut(auth);
      router.replace("/login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  const folderNames = useMemo(() => {
    const set = new Set();

    folders.forEach((f) => {
      if (f?.name?.trim()) set.add(f.name.trim());
    });

    notes.forEach((n) => {
      if (n?.folder?.trim()) set.add(n.folder.trim());
    });

    return ["Tất cả", ...Array.from(set).sort()];
  }, [folders, notes]);

  const tags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return ["Tất cả", ...Array.from(set).sort()];
  }, [notes]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return notes.filter((n) => {
      const okSearch =
        !s ||
        (n.title || "").toLowerCase().includes(s) ||
        (n.content || "").toLowerCase().includes(s) ||
        (n.folder || "").toLowerCase().includes(s) ||
        (n.tags || []).some((tag) => tag.toLowerCase().includes(s));

      const okFolder = folderFilter === "Tất cả" || n.folder === folderFilter;
      const okTag = tagFilter === "Tất cả" || (n.tags || []).includes(tagFilter);

      return okSearch && okFolder && okTag;
    });
  }, [q, notes, folderFilter, tagFilter]);

  const visibleNotes = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const ap = a.isPinned ? 1 : 0;
      const bp = b.isPinned ? 1 : 0;
      if (bp !== ap) return bp - ap;

      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }

      const ka = sortBy === "createdAt" ? (a.createdAt || 0) : (a.updatedAt || 0);
      const kb = sortBy === "createdAt" ? (b.createdAt || 0) : (b.updatedAt || 0);

      return kb - ka;
    });

    return arr;
  }, [filtered, sortBy]);

  const onDelete = async (id) => {
    if (!user?.uid) return;

    const n = notes.find((x) => x.id === id);
    if (n?.reminderId) {
      await cancelReminder(n.reminderId);
    }

    await removeNote(user.uid, id);
  };

  const onTogglePin = async (id) => {
    if (!user?.uid) return;

    const n = notes.find((x) => x.id === id);
    await updateNote(user.uid, id, {
      isPinned: !(n?.isPinned ?? false),
      updatedAt: Date.now(),
    });
  };

  const openCreate = () => router.push("/edit-note");

  const openEdit = (note) => {
    router.push({
      pathname: "/edit-note",
      params: { note: JSON.stringify(note) },
    });
  };

  const Chip = ({ active, label, onPress }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.muted,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color: active ? "white" : colors.text,
          fontWeight: "800",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user?.uid) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Đang chuyển đến đăng nhập...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.md, gap: 10 }}>
      <View
  style={{
    gap: 10,
    marginTop: 14,
  }}
>
  {/* Hàng trên: title + logout */}
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    }}
  >
    <Text
      style={{
        fontSize: 20,
        fontWeight: "900",
        color: colors.text,
        flexShrink: 1,
      }}
    >
      HVT Note
    </Text>

    <Pressable
      onPress={onLogout}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontWeight: "900", color: colors.text }}>Logout</Text>
    </Pressable>
  </View>

  {/* Hàng dưới: folders + reminders */}
  <View
    style={{
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    }}
  >
    <Pressable
      onPress={() => router.push("/folders")}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontWeight: "900", color: colors.text }}>Folders</Text>
    </Pressable>

    <Pressable
      onPress={() => router.push("/reminders")}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontWeight: "900", color: colors.text }}>⏰ Reminders</Text>
    </Pressable>
  </View>
</View>

      <TextInput
        placeholder="Tìm kiếm..."
        value={q}
        onChangeText={setQ}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.card,
        }}
      />

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={() => {
            setShowFolders((prev) => !prev);
            setShowTags(false);
          }}
          style={{ paddingVertical: 10, gap: 4 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 16 }}>Folder</Text>
            <Text style={{ fontWeight: "800" }}>
              {showFolders ? "Thu gọn ▲" : "Chọn folder ▼"}
            </Text>
          </View>

          <Text style={{ color: colors.subtext }}>Đang chọn: {folderFilter}</Text>
        </Pressable>

        {showFolders && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {folderNames.map((f) => (
              <Chip
                key={f}
                label={f}
                active={folderFilter === f}
                onPress={() => {
                  setFolderFilter(f);
                  setShowFolders(false);
                }}
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={() => {
            setShowTags((prev) => !prev);
            setShowFolders(false);
          }}
          style={{ paddingVertical: 10, gap: 4 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 16 }}>Tag</Text>
            <Text style={{ fontWeight: "800" }}>
              {showTags ? "Thu gọn ▲" : "Chọn tag ▼"}
            </Text>
          </View>

          <Text style={{ color: colors.subtext }}>
            Đang chọn: {tagFilter === "Tất cả" ? "Tất cả" : `#${tagFilter}`}
          </Text>
        </Pressable>

        {showTags && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {tags.map((t) => (
              <Chip
                key={t}
                label={t === "Tất cả" ? "Tất cả" : `#${t}`}
                active={tagFilter === t}
                onPress={() => {
                  setTagFilter(t);
                  setShowTags(false);
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "900", fontSize: 16, color: colors.text }}>Sắp xếp</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip
            label="Mới cập nhật"
            active={sortBy === "updatedAt"}
            onPress={() => setSortBy("updatedAt")}
          />
          <Chip
            label="Mới tạo"
            active={sortBy === "createdAt"}
            onPress={() => setSortBy("createdAt")}
          />
          <Chip
            label="A-Z"
            active={sortBy === "title"}
            onPress={() => setSortBy("title")}
          />
        </View>
      </View>

      <Pressable
        onPress={openCreate}
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 12,
          borderRadius: radius.lg,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>+ Tạo ghi chú</Text>
      </Pressable>

      <FlatList
        data={visibleNotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24, paddingTop: 6 }}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => openEdit(item)}
            onDelete={() => onDelete(item.id)}
            onTogglePin={() => onTogglePin(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 24 }}>
            <Text style={{ color: colors.subtext }}>
              Chưa có ghi chú nào. Hãy bấm “+ Tạo ghi chú”.
            </Text>
          </View>
        }
      />
    </View>
  );
}