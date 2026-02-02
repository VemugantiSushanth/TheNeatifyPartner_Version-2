import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
} from "react-native";
import { supabase } from "./supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    loadCompleted();
  }, []);

  /* ================= LOAD COMPLETED ================= */
  const loadCompleted = async (date?: string) => {
    const { data: user } = await supabase.auth.getUser();
    const email = user.user?.email;

    let query = supabase
      .from("bookings")
      .select("customer_name,email,work_ended_at")
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED")
      .order("work_ended_at", { ascending: false });

    if (date) {
      query = query
        .gte("work_ended_at", `${date}T00:00:00`)
        .lte("work_ended_at", `${date}T23:59:59`);
    }

    const { data } = await query;
    setData(data || []);
  };

  /* ================= FORMAT DATE ================= */
  const formatDateTime = (value: string) => {
    const d = new Date(value);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
        />

        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* ================= TOTAL COUNT ================= */}
      <View style={styles.countBox}>
        <Text style={styles.countText}>
          Total Completed: <Text style={styles.countNumber}>{data.length}</Text>
        </Text>
      </View>

      {/* ================= FILTER ================= */}
      <View style={styles.filterBox}>
        <Ionicons name="calendar-outline" size={18} color="#000" />
        <TextInput
          placeholder="YYYY-MM-DD"
          value={filterDate}
          onChangeText={(v) => {
            setFilterDate(v);
            if (v.length === 10) loadCompleted(v);
            if (v.length === 0) loadCompleted();
          }}
          style={styles.filterInput}
        />
      </View>

      {/* ================= BODY ================= */}
      <ScrollView contentContainerStyle={styles.body}>
        {data.length === 0 && (
          <Text style={styles.empty}>No completed services</Text>
        )}

        {data.map((item, i) => (
          <View key={i} style={styles.card}>
            <View>
              <Text style={styles.name}>{item.customer_name}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.date}>
                Completed: {formatDateTime(item.work_ended_at)}
              </Text>
            </View>

            <Text style={styles.completed}>COMPLETED</Text>
          </View>
        ))}
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

        <TouchableOpacity style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={22} color="#000" />
          <Text style={styles.footerTextActive}>Dashboard</Text>
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  header: {
    height: 72,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    width: 190,
    height: 64,
    resizeMode: "contain",
  },

  countBox: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#22c55e",
  },

  countText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065f46",
  },

  countNumber: {
    fontSize: 18,
    fontWeight: "800",
  },

  filterBox: {
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  filterInput: {
    flex: 1,
  },

  body: {
    padding: 20,
    paddingBottom: 90,
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#666",
    fontWeight: "600",
  },

  card: {
    borderWidth: 1.5,
    borderColor: "#22c55e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontWeight: "800",
    fontSize: 15,
  },

  email: {
    color: "#555",
  },

  date: {
    marginTop: 4,
    fontSize: 12,
    color: "#374151",
  },

  completed: {
    color: "#16a34a",
    fontWeight: "800",
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

  footerTextActive: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "800",
    color: "#000",
  },
});
