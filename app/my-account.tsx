import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from "react-native";
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
  const [gender, setGender] = useState<string | null>(null);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      setEmail(data.user.email ?? "");

      const { data: profile } = await supabase
        .from("staff_profile")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
        setGender(profile.gender ?? null);
        setAvatarUrl(
          profile.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : null,
        );
      }
    };

    loadProfile();
  }, []);

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

  /* ================= DEFAULT AVATAR ICON ================= */
  const renderDefaultAvatar = () => {
    if (gender === "male") {
      return <Ionicons name="man" size={48} color="#777" />;
    }
    if (gender === "female") {
      return <Ionicons name="woman" size={48} color="#777" />;
    }
    return <Ionicons name="person" size={48} color="#777" />;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ================= HEADER ================= */}
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSub}>Personal details (read only)</Text>
          </View>
        </View>

        {/* ================= AVATAR ================= */}
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              {renderDefaultAvatar()}
            </View>
          )}
        </View>

        {/* ================= READ ONLY FIELDS ================= */}
        <ProfileField label="FULL NAME" value={fullName} />
        <ProfileField
          label="EMAIL"
          value={email}
          helper="Email cannot be changed"
        />
        <ProfileField label="PHONE NUMBER" value={phone} />

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

function ProfileField({ label, value, helper }: any) {
  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "-"}</Text>
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
  },

  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerSub: { color: "#64748B", marginTop: 4 },

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

  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: "#FFD700",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
  },

  logoutText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },

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
