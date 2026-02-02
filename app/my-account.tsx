import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { SafeAreaView } from "react-native-safe-area-context";

/* ================= SCREEN ================= */

export default function MyAccountScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      setUserId(data.user.id);
      setEmail(data.user.email ?? "");

      const { data: profile } = await supabase
        .from("staff_profile")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");

        // ✅ CACHE-BUST WHEN LOADING
        setAvatarUrl(
          profile.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : null,
        );
      }
    };

    loadProfile();
  }, []);

  /* ================= IMAGE PICK ================= */
  const pickImage = async () => {
    if (!editMode || !userId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Allow photo access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    replaceProfileImage(result.assets[0].uri);
  };

  /* ================= DELETE + UPLOAD + REFRESH ================= */
  const replaceProfileImage = async (uri: string) => {
    if (!userId) return;

    try {
      const filePath = `${userId}.jpg`;

      // 1️⃣ DELETE OLD IMAGE (ignore errors if not exists)
      await supabase.storage.from("avatars").remove([filePath]);

      // 2️⃣ READ NEW IMAGE
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // 3️⃣ UPLOAD NEW IMAGE
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, bytes, {
          contentType: "image/jpeg",
        });

      if (error) throw error;

      // 4️⃣ GET PUBLIC URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // 5️⃣ UPDATE DB (CLEAN URL)
      await supabase
        .from("staff_profile")
        .update({ avatar_url: data.publicUrl })
        .eq("id", userId);

      // 6️⃣ FORCE UI REFRESH
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);

      Alert.alert("Success", "Profile photo updated");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    if (!userId) return;

    setSaving(true);

    const { error } = await supabase
      .from("staff_profile")
      .update({
        full_name: fullName,
        phone,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) Alert.alert("Error", error.message);
    else {
      Alert.alert("Success", "Profile updated");
      setEditMode(false);
    }
  };

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    Alert.alert("Logout", "Do you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ================= HEADER ================= */}
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSub}>Manage your personal details</Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditMode(true)}
          >
            <Ionicons name="pencil" size={18} color="#2563EB" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ================= AVATAR ================= */}
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={pickImage}
          activeOpacity={editMode ? 0.7 : 1}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={42} color="#777" />
            </View>
          )}

          {editMode && (
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* ================= FIELDS ================= */}
        <ProfileField
          label="FULL NAME"
          value={fullName}
          editable={editMode}
          onChange={setFullName}
        />

        <ProfileField
          label="EMAIL"
          value={email}
          editable={false}
          helper="Email cannot be changed"
        />

        <ProfileField
          label="PHONE NUMBER"
          value={phone}
          editable={editMode}
          onChange={setPhone}
        />

        {/* ================= SAVE ================= */}
        <TouchableOpacity
          style={[styles.saveBtn, { opacity: editMode ? 1 : 0.4 }]}
          disabled={!editMode}
          onPress={saveProfile}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>

        {/* ================= LOGOUT ================= */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================= FOOTER ================= */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.replace("/my-role")}
        >
          <Ionicons name="home" size={22} color="#000" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.push("/dashboard")}
        >
          <Ionicons name="calendar-outline" size={22} color="#000" />
          <Text style={styles.footerText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.push("/my-account")}
        >
          <Ionicons name="person-outline" size={22} color="#000" />
          <Text style={styles.footerText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ================= FIELD ================= */

function ProfileField({ label, value, editable, onChange, helper }: any) {
  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChange}
        style={styles.fieldValue}
      />
      {helper && <Text style={styles.helperText}>{helper}</Text>}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  headerCard: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerSub: { color: "#64748B", marginTop: 4 },

  editBtn: {
    flexDirection: "row",
    gap: 6,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
  },

  editText: { color: "#2563EB", fontWeight: "700" },

  avatarWrap: {
    alignSelf: "center",
    marginVertical: 20,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  cameraIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "#000",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  fieldCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
  },

  fieldLabel: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 12,
  },

  fieldValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },

  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: "#94A3B8",
  },

  saveBtn: {
    backgroundColor: "#FFD700",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  saveText: { fontWeight: "800", fontSize: 16 },

  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  logoutText: { color: "#fff", fontWeight: "800" },

  footer: {
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  footerItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  footerText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
    color: "#000",
  },
});
