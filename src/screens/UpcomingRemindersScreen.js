import React, { useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "../auth/AuthContext";
import { listenNotes } from "../firestore/notesApi.js";
import NoteCard from "../components/NoteCard";
import { colors, space, typography } from "../theme/tokens";

function nextOccurrenceMs(note) {
  if (!note?.reminderAt) return null;

  const repeat = note.reminderRepeat ?? "none";
  const base = new Date(note.reminderAt);
  const now = new Date();

  const hour = base.getHours();
  const minute = base.getMinutes();

  if (repeat === "none") {
    return note.reminderAt > Date.now() ? note.reminderAt : null;
  }

  if (repeat === "daily") {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0
    );
    if (candidate.getTime() > Date.now()) return candidate.getTime();
    candidate.setDate(candidate.getDate() + 1);
    return candidate.getTime();
  }

  if (repeat === "weekly") {
    // JS: 0..6 (Sun..Sat)
    const targetDow = base.getDay();
    const todayDow = now.getDay();
    let diff = targetDow - todayDow;
    if (diff < 0) diff += 7;

    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0
    );
    candidate.setDate(candidate.getDate() + diff);

    // nếu cùng ngày nhưng giờ đã qua -> +7 ngày
    if (candidate.getTime() <= Date.now()) candidate.setDate(candidate.getDate() + 7);

    return candidate.getTime();
  }

  return null;
}

export default function UpcomingRemindersScreen() {
  const { user, loading } = useAuth();
  const [notes, setNotes] = useState([]);

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

  const upcoming = useMemo(() => {
    const arr = notes
      .map((n) => ({ ...n, _next: nextOccurrenceMs(n) }))
      .filter((n) => !!n._next)
      .sort((a, b) => a._next - b._next);

    return arr;
  }, [notes]);

  const openEdit = (note) => {
    router.push({
      pathname: "/edit-note",
      params: { note: JSON.stringify(note) },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.md, gap: space.sm }}>
      <Text style={{ fontSize: typography.h1, fontWeight: "900", color: colors.text }}>
        Upcoming Reminders
      </Text>

      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24, paddingTop: 6 }}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => openEdit(item)}
            onDelete={() => {}}
            onTogglePin={() => {}}
          />
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 24 }}>
            <Text style={{ color: colors.subtext }}>Chưa có nhắc nhở nào.</Text>
          </View>
        }
      />
    </View>
  );
}
