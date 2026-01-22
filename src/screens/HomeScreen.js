import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";

import NoteCard from "../components/NoteCard";
import { colors, space, typography, radius } from "../theme/tokens";

import { useAuth } from "../auth/AuthContext";
import { listenNotes, removeNote, updateNote } from "../firestore/notesApi.js";

import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { cancelReminder } from "../notifications/reminders.js";

export default function HomeScreen() {
  const { user, loading } = useAuth();

  const [notes, setNotes] = useState([]);
  const [q, setQ] = useState("");

  // Filter
  const [folderFilter, setFolderFilter] = useState("Tất cả");
  const [tagFilter, setTagFilter] = useState("Tất cả");

  // Sort
  const [sortBy, setSortBy] = useState("updatedAt"); // updatedAt | createdAt | title

  // Firestore realtime sync
  useFocusEffect(
    React.useCallback(() => {
      if (loading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const unsub = listenNotes(user.uid, (data) => setNotes(data));
      return unsub;
    }, [user, loading])
  );

  const onLogout = async () => {
    try {
      setNotes([]);
      await signOut(auth);
      router.replace("/login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  const folders = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => n.folder && set.add(n.folder));
    return ["Tất cả", ...Array.from(set).sort()];
  }, [notes]);

  const tags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return ["Tất cả", ...Array.from(set).sort()];
  }, [notes]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return notes.filter((n) => {
      // search
      const okSearch =
        !s ||
        (n.title || "").toLowerCase().includes(s) ||
        (n.content || "").toLowerCase().includes(s);

      // folder
      const okFolder = folderFilter === "Tất cả" || n.folder === folderFilter;

      // tag
      const okTag = tagFilter === "Tất cả" || (n.tags || []).includes(tagFilter);

      return okSearch && okFolder && okTag;
    });
  }, [q, notes, folderFilter, tagFilter]);

  const visibleNotes = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      // pinned first
      const ap = a.isPinned ? 1 : 0;
      const bp = b.isPinned ? 1 : 0;
      if (bp !== ap) return bp - ap;

      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }

      const ka = sortBy === "createdAt" ? (a.createdAt || 0) : (a.updatedAt || 0);
      const kb = sortBy === "createdAt" ? (b.createdAt || 0) : (b.updatedAt || 0);
      return kb - ka; // newest first
    });

    return arr;
  }, [filtered, sortBy]);

  const onDelete = async (id) => {
  if (!user) return;
  const n = notes.find((x) => x.id === id);
  if (n?.reminderId) await cancelReminder(n.reminderId);
  await removeNote(user.uid, id);
};


  const onTogglePin = async (id) => {
    if (!user) return;
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
      <Text style={{ color: active ? "white" : colors.text, fontWeight: "800", fontSize: 12 }}>
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.md, gap: space.sm }}>
      {/* Header row: title left, buttons right */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: typography.h1, fontWeight: "900", color: colors.text }}>
          HVT Note
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => router.push("/folders")}
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 12,
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
            onPress={onLogout}
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text style={{ fontWeight: "900", color: colors.text }}>Logout</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/reminders")}
            style={{
            paddingHorizontal: 12,
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

      {/* Search */}
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

      {/* Filters */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "900", color: colors.text }}>Folder</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {folders.map((f) => (
            <Chip
              key={f}
              label={f}
              active={folderFilter === f}
              onPress={() => setFolderFilter(f)}
            />
          ))}
        </View>

        <Text style={{ fontWeight: "900", marginTop: 6, color: colors.text }}>Tag</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {tags.map((t) => (
            <Chip
              key={t}
              label={t === "Tất cả" ? "Tất cả" : `#${t}`}
              active={tagFilter === t}
              onPress={() => setTagFilter(t)}
            />
          ))}
        </View>

        <Text style={{ fontWeight: "900", marginTop: 10, color: colors.text }}>Sắp xếp</Text>
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
          <Chip label="A-Z" active={sortBy === "title"} onPress={() => setSortBy("title")} />
        </View>
      </View>

      {/* Create */}
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

      {/* List */}
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
