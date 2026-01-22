import React from "react";
import { View, Text, Pressable } from "react-native";
import { colors, space, typography } from "../theme/tokens";

export default function Header({ title, rightText, onRightPress }) {
  return (
    <View
      style={{
        paddingTop: space.lg,
        paddingBottom: space.sm,
        paddingHorizontal: space.md,
        backgroundColor: colors.bg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: typography.h1, fontWeight: "900", color: colors.text }}>
          {title}
        </Text>

        {!!rightText && (
          <Pressable onPress={onRightPress} style={{ paddingVertical: 8, paddingLeft: 12 }}>
            <Text style={{ fontWeight: "900", color: colors.primary }}>{rightText}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
