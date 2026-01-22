import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { colors, radius, space, shadow, noteColors } from "../theme/tokens";

function formatDateTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

function repeatLabel(r) {
  if (r === "daily") return "Hàng ngày";
  if (r === "weekly") return "Hàng tuần";
  return "1 lần";
}

export default function NoteCard({ note, onPress, onDelete, onTogglePin }) {
  const theme = noteColors?.[note?.color] ?? noteColors.gray;

  const reminderText = useMemo(() => {
    if (!note?.reminderAt) return null;
    return `${formatDateTime(note.reminderAt)} • ${repeatLabel(note.reminderRepeat)}`;
  }, [note?.reminderAt, note?.reminderRepeat]);

  const hasImages = Array.isArray(note?.images) && note.images.length > 0;
  const hasAudios = Array.isArray(note?.audios) && note.audios.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.bg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: theme.border,
        padding: space.md,
        gap: 8,
        ...shadow.card,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontWeight: "900", fontSize: 18, color: colors.text }}>
            {note?.title || "(Không tiêu đề)"}
          </Text>

          {!!reminderText && (
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              ⏰ {reminderText}
            </Text>
          )}
        </View>

        <Pressable
          onPress={onTogglePin}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.muted,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "900" }}>{note?.isPinned ? "📌" : "📍"}</Text>
        </Pressable>
      </View>

      {/* Content preview */}
      {!!note?.content && (
        <Text numberOfLines={2} style={{ color: colors.subtext }}>
          {note.content}
        </Text>
      )}

      {/* Badges: folder/tags + attachments */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {!!note?.folder && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.muted,
            }}
          >
            <Text style={{ fontWeight: "800" }}>📁 {note.folder}</Text>
          </View>
        )}

        {(note?.tags || []).slice(0, 4).map((t) => (
          <View
            key={t}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.muted,
            }}
          >
            <Text style={{ fontWeight: "800" }}>#{t}</Text>
          </View>
        ))}

        {(hasImages || hasAudios) && (
          <View style={{ flexDirection: "row", gap: 8, marginLeft: 2 }}>
            {hasImages && (
              <Text style={{ fontWeight: "900", color: colors.text }}>🖼️ {note.images.length}</Text>
            )}
            {hasAudios && (
              <Text style={{ fontWeight: "900", color: colors.text }}>🎙️ {note.audios.length}</Text>
            )}
          </View>
        )}
      </View>

      {/* Delete */}
      <Pressable onPress={onDelete} style={{ marginTop: 6 }}>
        <Text style={{ color: "#D11A2A", fontWeight: "900" }}>Xoá</Text>
      </Pressable>
    </Pressable>
  );
}
