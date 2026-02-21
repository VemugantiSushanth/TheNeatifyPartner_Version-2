import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router"; // ✅ added usePathname
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "./supabase";

export default function Dashboard() {
  const pathname = usePathname(); // ✅ added

  const [data, setData] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "date" | "name">("recent");

  useEffect(() => {
    loadCompleted();
  }, []);

  useEffect(() => {
    loadCompleted(filterDate || undefined);
  }, [sortBy]);

  /* ================= LOAD COMPLETED ================= */
  const loadCompleted = async (date?: string) => {
    const { data: user } = await supabase.auth.getUser();
    const email = user.user?.email;

    let query = supabase
      .from("bookings")
      .select("customer_name,email,work_ended_at,worked_duration")
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED");
    if (sortBy === "recent") {
      query = query.order("work_ended_at", { ascending: false });
    } else if (sortBy === "date") {
      query = query.order("work_ended_at", { ascending: true });
    } else if (sortBy === "name") {
      query = query.order("customer_name", { ascending: true });
    }

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
      <View style={styles.filterRow}>
        <View style={styles.filterBox}>
          <Ionicons name="calendar-outline" size={18} color="#000" />
          <TextInput
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#000"
            value={filterDate}
            onChangeText={(v) => {
              setFilterDate(v);
              if (v.length === 10) loadCompleted(v);
              if (v.length === 0) loadCompleted();
            }}
            style={styles.filterInput}
          />
        </View>

        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() =>
            setSortBy(
              sortBy === "recent"
                ? "date"
                : sortBy === "date"
                  ? "name"
                  : "recent",
            )
          }
        >
          <Text style={styles.sortText}>
            {sortBy === "recent"
              ? "Recent"
              : sortBy === "date"
                ? "Oldest"
                : "Name"}
          </Text>
        </TouchableOpacity>
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
              {item.worked_duration && (
                <Text style={styles.worked}>
                  Worked Time: {item.worked_duration}
                </Text>
              )}
            </View>

            <Text style={styles.completed}>COMPLETED</Text>
          </View>
        ))}
      </ScrollView>

      {/* ================= UPDATED FOOTER ONLY ================= */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.replace("/my-role")}
        >
          <Ionicons
            name={pathname === "/my-role" ? "home" : "home-outline"}
            size={22}
            color="#000"
          />
          <Text
            style={
              pathname === "/my-role"
                ? styles.footerTextActive
                : styles.footerText
            }
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.replace("/dashboard")}
        >
          <Ionicons
            name={pathname === "/dashboard" ? "calendar" : "calendar-outline"}
            size={22}
            color="#000"
          />
          <Text
            style={
              pathname === "/dashboard"
                ? styles.footerTextActive
                : styles.footerText
            }
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.replace("/my-account")}
        >
          <Ionicons
            name={pathname === "/my-account" ? "person" : "person-outline"}
            size={22}
            color="#000"
          />
          <Text
            style={
              pathname === "/my-account"
                ? styles.footerTextActive
                : styles.footerText
            }
          >
            Profile
          </Text>
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
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
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

  worked: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
  },

  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#000",
    marginLeft: 10,
  },

  sortText: {
    fontWeight: "700",
  },
});
