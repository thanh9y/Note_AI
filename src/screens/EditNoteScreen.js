import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";

import { useAuth } from "../auth/AuthContext";
import { addNote, updateNote } from "../firestore/notesApi.js";
import { scheduleReminder, cancelReminder } from "../notifications/reminders.js";
import { uploadUriAsync, getUrlFromPath } from "../firebase/storage.js";

import { colors, radius, space, typography } from "../theme/tokens";

function formatDateTime(ms) {
  if (!ms) return "Chưa chọn";
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function repeatLabel(r) {
  if (r === "daily") return "Hàng ngày";
  if (r === "weekly") return "Hàng tuần";
  return "Không lặp";
}

function mmss(ms) {
  if (!ms && ms !== 0) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function EditNoteScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { user, loading } = useAuth();

  const note = useMemo(() => {
    if (!params?.note) return null;
    try {
      return JSON.parse(params.note);
    } catch {
      return null;
    }
  }, [params]);

  // ====== Basic fields ======
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [folder, setFolder] = useState(note?.folder ?? "");
  const [tagsText, setTagsText] = useState((note?.tags ?? []).join(", "));
  const [color, setColor] = useState(note?.color ?? "gray");

  // ====== Reminder ======
  const [reminderOn, setReminderOn] = useState(!!note?.reminderAt);
  const [reminderAt, setReminderAt] = useState(note?.reminderAt ?? null);
  const [reminderRepeat, setReminderRepeat] = useState(note?.reminderRepeat ?? "none");

  // Android picker 2 bước
  const [pickerMode, setPickerMode] = useState(null); // "date" | "time" | null
  const [tempDate, setTempDate] = useState(null);

  // ====== Attachments ======
  const [images, setImages] = useState(() => {
    const remote = Array.isArray(note?.images) ? note.images : [];
    return remote.map((it) => ({
      url: it?.url ?? null,
      path: it?.path ?? null,
      localUri: null,
    }));
  });

  const [audios, setAudios] = useState(() => {
    const remote = Array.isArray(note?.audios) ? note.audios : [];
    return remote.map((it) => ({
      url: it?.url ?? null,
      path: it?.path ?? null,
      localUri: null,
      durationMs: it?.durationMs ?? null,
    }));
  });

  // ✅ Preview ảnh phóng to
  const [previewUri, setPreviewUri] = useState(null);

  // Recording
  const recordingRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("");
  const [recordingMs, setRecordingMs] = useState(0);
  const timerRef = useRef(null);

  // Playback
  const soundRef = useRef(null);
  const [playingIndex, setPlayingIndex] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: note ? "Sửa ghi chú" : "Tạo ghi chú" });
  }, [navigation, note]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading]);

  // cleanup sound + interval
  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {}
      })();
    };
  }, []);

  // ✅ Refresh URL từ path để tránh URL cũ (.firebasestorage.app) bị 400
  useEffect(() => {
    let cancelled = false;

    const refreshUrls = async () => {
      const nextImages = await Promise.all(
        images.map(async (it) => {
          if (it.localUri) return it;

          const badUrl = typeof it.url === "string" && it.url.includes(".firebasestorage.app");
          if ((!it.url || badUrl) && it.path) {
            try {
              const url = await getUrlFromPath(it.path);
              return { ...it, url };
            } catch {
              return it;
            }
          }
          return it;
        })
      );

      const nextAudios = await Promise.all(
        audios.map(async (it) => {
          if (it.localUri) return it;

          const badUrl = typeof it.url === "string" && it.url.includes(".firebasestorage.app");
          if ((!it.url || badUrl) && it.path) {
            try {
              const url = await getUrlFromPath(it.path);
              return { ...it, url };
            } catch {
              return it;
            }
          }
          return it;
        })
      );

      if (!cancelled) {
        setImages(nextImages);
        setAudios(nextAudios);
      }
    };

    refreshUrls();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseTags = () => {
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    return Array.from(new Set(tags));
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
      }}
    >
      <Text style={{ color: active ? "white" : colors.text, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );

  // ====== Reminder picker ======
  const openDatePicker = () => {
    const base = reminderAt ?? Date.now() + 5 * 60 * 1000;
    setReminderAt(base);
    setTempDate(new Date(base));
    setPickerMode("date");
  };

  // ====== Image picker ======
  const ensureImagePerm = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền truy cập", "Bạn cần cho phép truy cập thư viện ảnh.");
      return false;
    }
    return true;
  };

  const ensureCameraPerm = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền camera", "Bạn cần cho phép camera.");
      return false;
    }
    return true;
  };

  const pickFromGallery = async () => {
    const ok = await ensureImagePerm();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });

    if (result.canceled) return;

    const assets = result.assets || [];
    setImages((prev) => [...prev, ...assets.map((a) => ({ localUri: a.uri, url: null, path: null }))]);
  };

  const takePhoto = async () => {
    const ok = await ensureCameraPerm();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });

    if (result.canceled) return;

    const a = result.assets?.[0];
    if (!a?.uri) return;
    setImages((prev) => [...prev, { localUri: a.uri, url: null, path: null }]);
  };

  const removeImageAt = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ====== Audio recording/playback ======
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Quyền micro", "Bạn cần cho phép micro để ghi âm.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      setRecordingStatus("Đang chuẩn bị...");
      setRecordingMs(0);

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingStatus("Đang ghi...");

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(async () => {
        try {
          const st = await recording.getStatusAsync();
          if (st?.isRecording) setRecordingMs(st.durationMillis ?? 0);
        } catch {}
      }, 300);
    } catch (e) {
      console.log("startRecording error:", e);
      Alert.alert("Lỗi", "Không thể bắt đầu ghi âm.");
    }
  };

  const stopRecording = async () => {
    try {
      const rec = recordingRef.current;
      if (!rec) return;

      setRecordingStatus("Đang lưu...");

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await rec.stopAndUnloadAsync();

      const uri = rec.getURI();
      let durationMsLocal = recordingMs;

      try {
        const st = await rec.getStatusAsync();
        durationMsLocal = st?.durationMillis ?? durationMsLocal ?? null;
      } catch {}

      recordingRef.current = null;
      setIsRecording(false);
      setRecordingStatus("");
      setRecordingMs(0);

      if (uri) {
        setAudios((prev) => [
          ...prev,
          { localUri: uri, url: null, path: null, durationMs: durationMsLocal ?? null },
        ]);
      }
    } catch (e) {
      console.log("stopRecording error:", e);
      Alert.alert("Lỗi", "Không thể dừng ghi âm.");
      setIsRecording(false);
      setRecordingStatus("");
      setRecordingMs(0);
    }
  };

  const playAudioAt = async (idx) => {
    const item = audios[idx];
    const uri = item?.localUri || item?.url;
    if (!uri) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      if (playingIndex === idx && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingIndex(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });

      soundRef.current = sound;
      setPlayingIndex(idx);

      sound.setOnPlaybackStatusUpdate((st) => {
        if (!st.isLoaded) return;
        if (st.didJustFinish) {
          (async () => {
            try {
              await sound.unloadAsync();
            } catch {}
            soundRef.current = null;
            setPlayingIndex(null);
          })();
        }
      });
    } catch (e) {
      console.log("playAudio error:", e);
      Alert.alert("Lỗi", "Không thể phát ghi âm.");
    }
  };

  const removeAudioAt = async (idx) => {
    if (playingIndex === idx && soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
      setPlayingIndex(null);
    }
    setAudios((prev) => prev.filter((_, i) => i !== idx));
  };

  // ====== Upload attachments ======
  const uploadPendingImages = async (uid) => {
    const next = [];
    for (const it of images) {
      if (it.url && it.path && !it.localUri) {
        next.push({ url: it.url, path: it.path });
        continue;
      }
      if (it.localUri) {
        const uploaded = await uploadUriAsync({ uri: it.localUri, userId: uid, folder: "images" });
        next.push({ url: uploaded.url, path: uploaded.path });
      }
    }
    return next;
  };

  const uploadPendingAudios = async (uid) => {
    const next = [];
    for (const it of audios) {
      if (it.url && it.path && !it.localUri) {
        next.push({ url: it.url, path: it.path, durationMs: it.durationMs ?? null });
        continue;
      }
      if (it.localUri) {
        const uploaded = await uploadUriAsync({ uri: it.localUri, userId: uid, folder: "audios" });
        next.push({ url: uploaded.url, path: uploaded.path, durationMs: it.durationMs ?? null });
      }
    }
    return next;
  };

  const onSave = async () => {
    if (!user) return router.replace("/login");
    if (isSaving) return;

    const now = Date.now();
    const uniqueTags = parseTags();

    if (reminderOn && reminderRepeat === "none") {
      const nextReminderAt = reminderAt;
      if (!nextReminderAt || nextReminderAt <= now + 3000) {
        return Alert.alert("Nhắc nhở", "Bạn cần chọn thời gian nhắc trong tương lai.");
      }
    }

    setIsSaving(true);

    try {
      if (note?.reminderId && !reminderOn) await cancelReminder(note.reminderId);

      let newReminderId = note?.reminderId ?? null;
      let nextReminderAt = reminderOn ? reminderAt : null;

      if (reminderOn) {
        if (note?.reminderId) await cancelReminder(note.reminderId);
        const dateMs = nextReminderAt ?? Date.now() + 5 * 60 * 1000;
        nextReminderAt = dateMs;

        newReminderId = await scheduleReminder({
          title: title?.trim() ? title.trim() : "Nhắc nhở ghi chú",
          body: content?.trim() ? content.trim().slice(0, 80) : "Đến giờ xem lại ghi chú",
          dateMs,
          repeat: reminderRepeat,
        });
      }

      const uploadedImages = await uploadPendingImages(user.uid);
      const uploadedAudios = await uploadPendingAudios(user.uid);

      const data = {
        title,
        content,
        folder: folder.trim(),
        tags: uniqueTags,
        color,
        images: uploadedImages,
        audios: uploadedAudios,
        reminderAt: reminderOn ? nextReminderAt : null,
        reminderRepeat: reminderOn ? reminderRepeat : "none",
        reminderId: reminderOn ? newReminderId : null,
        updatedAt: now,
      };

      if (note) {
        await updateNote(user.uid, note.id, data);
      } else {
        await addNote(user.uid, { ...data, isPinned: false, createdAt: now });
      }

      router.back();
    } catch (e) {
      console.log("save error full:", e);
      console.log("code:", e?.code);
      console.log("message:", e?.message);
      console.log("serverResponse:", e?.serverResponse);
      Alert.alert("Lỗi", e?.message || "Không thể lưu ghi chú.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space.md, gap: space.sm, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>Tiêu đề</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Nhập tiêu đề..."
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.card,
          }}
        />

        {/* Folder */}
        <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>Thư mục (Folder)</Text>
        <TextInput
          value={folder}
          onChangeText={setFolder}
          placeholder='VD: "Công việc", "Học tập"...'
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.card,
          }}
        />

        {/* Tags */}
        <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>
          Tags (phân cách bằng dấu phẩy)
        </Text>
        <TextInput
          value={tagsText}
          onChangeText={setTagsText}
          placeholder='VD: "react, firebase, ui"'
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.card,
          }}
        />

        {/* Color */}
        <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>Màu ghi chú</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["gray", "yellow", "blue", "green", "pink"].map((c) => (
            <Chip key={c} label={c} active={color === c} onPress={() => setColor(c)} />
          ))}
        </View>

        {/* Images */}
        <View style={{ marginTop: 8, gap: 8 }}>
          <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>Ảnh đính kèm</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={pickFromGallery}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ fontWeight: "900", color: colors.text }}>+ Gallery</Text>
            </Pressable>

            <Pressable
              onPress={takePhoto}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ fontWeight: "900", color: colors.text }}>📷 Camera</Text>
            </Pressable>
          </View>

          {images.length === 0 ? (
            <Text style={{ color: colors.subtext }}>Chưa có ảnh.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {images.map((it, idx) => {
                const uri = it.localUri || it.url;
                return (
                  <View key={`${uri || "img"}_${idx}`} style={{ width: 110, gap: 6 }}>
                    <Pressable onPress={() => uri && setPreviewUri(uri)}>
                      <Image
                        source={uri ? { uri } : undefined}
                        onError={(e) => console.log("Image load error:", uri, e?.nativeEvent)}
                        style={{ width: 110, height: 110, borderRadius: 14, backgroundColor: colors.muted }}
                      />
                    </Pressable>

                    <Pressable onPress={() => removeImageAt(idx)}>
                      <Text style={{ color: "#D11A2A", fontWeight: "900" }}>Xoá ảnh</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Audio */}
        <View style={{ marginTop: 8, gap: 8 }}>
          <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>Ghi âm đính kèm</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {!isRecording ? (
              <Pressable
                onPress={startRecording}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Text style={{ fontWeight: "900", color: colors.text }}>🎙️ Ghi âm</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={stopRecording}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: "#D11A2A",
                  backgroundColor: colors.card,
                }}
              >
                <Text style={{ fontWeight: "900", color: "#D11A2A" }}>⏹ Dừng</Text>
              </Pressable>
            )}

            {!!recordingStatus && (
              <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                {recordingStatus} {isRecording ? `(${mmss(recordingMs)})` : ""}
              </Text>
            )}
          </View>

          {audios.length === 0 ? (
            <Text style={{ color: colors.subtext }}>Chưa có ghi âm.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {audios.map((it, idx) => {
                const isPlaying = playingIndex === idx;
                return (
                  <View
                    key={`${it.localUri || it.url || "audio"}_${idx}`}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                      backgroundColor: colors.card,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: colors.text }}>
                      🎧 Ghi âm {idx + 1} {it.durationMs ? `• ${mmss(it.durationMs)}` : ""}
                    </Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Pressable
                        onPress={() => playAudioAt(idx)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.muted,
                        }}
                      >
                        <Text style={{ fontWeight: "900" }}>{isPlaying ? "⏸ Stop" : "▶ Play"}</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => removeAudioAt(idx)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: "#D11A2A",
                          backgroundColor: colors.card,
                        }}
                      >
                        <Text style={{ fontWeight: "900", color: "#D11A2A" }}>Xoá</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Reminder */}
        <View style={{ marginTop: 10, gap: 8 }}>
          <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>Nhắc nhở (Reminder)</Text>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Pressable
              onPress={() => {
                const next = !reminderOn;
                setReminderOn(next);
                if (next && !reminderAt) setReminderAt(Date.now() + 5 * 60 * 1000);
                if (!next) setReminderRepeat("none");
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: reminderOn ? colors.primary : colors.border,
                backgroundColor: reminderOn ? colors.primary : colors.card,
              }}
            >
              <Text style={{ fontWeight: "900", color: reminderOn ? "white" : colors.text }}>
                {reminderOn ? "Đang bật" : "Đang tắt"}
              </Text>
            </Pressable>

            <Pressable
              onPress={openDatePicker}
              disabled={!reminderOn}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: reminderOn ? colors.card : colors.muted,
                opacity: reminderOn ? 1 : 0.6,
              }}
            >
              <Text style={{ fontWeight: "900", color: colors.text }}>{formatDateTime(reminderAt)}</Text>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "900", color: colors.text }}>Lặp lại: {repeatLabel(reminderRepeat)}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Không lặp" active={reminderRepeat === "none"} onPress={() => setReminderRepeat("none")} />
              <Chip label="Hàng ngày" active={reminderRepeat === "daily"} onPress={() => setReminderRepeat("daily")} />
              <Chip label="Hàng tuần" active={reminderRepeat === "weekly"} onPress={() => setReminderRepeat("weekly")} />
            </View>
          </View>

          {pickerMode && (
            <DateTimePicker
              value={tempDate ?? new Date(reminderAt ?? Date.now())}
              mode={pickerMode}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selected) => {
                if (event.type === "dismissed") {
                  setPickerMode(null);
                  return;
                }

                if (pickerMode === "date") {
                  const d = selected ?? tempDate ?? new Date();
                  setTempDate(d);
                  setPickerMode("time");
                  return;
                }

                if (pickerMode === "time") {
                  const datePart = tempDate ?? new Date();
                  const timePart = selected ?? new Date();

                  const merged = new Date(
                    datePart.getFullYear(),
                    datePart.getMonth(),
                    datePart.getDate(),
                    timePart.getHours(),
                    timePart.getMinutes(),
                    0,
                    0
                  );

                  setReminderAt(merged.getTime());
                  setPickerMode(null);
                }
              }}
            />
          )}
        </View>

        {/* Content */}
        <Text style={{ fontSize: typography.small, fontWeight: "900", color: colors.text }}>Nội dung</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Nhập nội dung..."
          multiline
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: 12,
            minHeight: 220,
            textAlignVertical: "top",
            backgroundColor: colors.card,
          }}
        />

        {/* Save/Cancel */}
        <Pressable
          onPress={onSave}
          disabled={isSaving}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: radius.lg,
            alignItems: "center",
            marginTop: 6,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>{isSaving ? "Đang lưu..." : "Lưu"}</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            borderRadius: radius.lg,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ fontWeight: "900", color: colors.text }}>Huỷ</Text>
        </Pressable>
      </ScrollView>

      {/* ✅ Modal phóng to ảnh */}
      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
          <View
            style={{
              paddingTop: 50,
              paddingHorizontal: 16,
              flexDirection: "row",
              justifyContent: "flex-end",
            }}
          >
            <Pressable onPress={() => setPreviewUri(null)} style={{ padding: 10 }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>Đóng</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 12 }}>
            {!!previewUri && (
              <Image source={{ uri: previewUri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
