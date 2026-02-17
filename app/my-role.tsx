import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, usePathname } from "expo-router"; // ✅ added usePathname
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "./supabase";

const { height, width } = Dimensions.get("window");
const SLIDER_HEIGHT = height * 0.42;

export default function MyRoleScreen() {
  const pathname = usePathname(); // ✅ added

  const [newCount, setNewCount] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [slides, setSlides] = useState<string[]>([]);

  const sliderRef = useRef<FlatList>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ================= BACK HANDLER ================= */
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/login");
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => sub.remove();
    }, []),
  );

  /* ================= FETCH SLIDES ================= */
  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from("hero_images")
      .select("image_path")
      .eq("screen", "home")
      .order("title", { ascending: true });

    if (!error && data) {
      setSlides(data.map((item) => item.image_path));
    }
  };

  /* ================= COUNTS ================= */
  const fetchCounts = async () => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) return;

    const { count: notif } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("assigned_staff_email", email)
      .eq("is_viewed", false);

    const { count: assigned } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("assigned_staff_email", email)
      .neq("work_status", "COMPLETED");

    const { count: completed } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED");

    setNewCount(notif || 0);
    setAssignedCount(assigned || 0);
    setCompletedCount(completed || 0);
  };

  useEffect(() => {
    fetchCounts();
    fetchSlides();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCounts();
    setRefreshing(false);
  }, []);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (slides.length === 0) return;

    autoScrollRef.current = setInterval(() => {
      const next = (activeSlide + 1) % slides.length;
      sliderRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveSlide(next);
    }, 3000);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [activeSlide, slides.length]);

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleCustomerCare = () => {
    Alert.alert("Customer Care", "+91 7617618567", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => Linking.openURL("tel:+917617618567"),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={[{ key: "main" }]}
        contentContainerStyle={{ paddingBottom: 200 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={() => (
          <View style={styles.container}>
            <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

            {/* HEADER */}
            <View style={styles.header}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logo}
              />

              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.bellIcon}
                  onPress={() => router.push("/new-services")}
                >
                  <Ionicons name="notifications" size={26} color="#000" />
                  {newCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{newCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowMenu(true)}>
                  <Ionicons
                    name="person-circle-outline"
                    size={34}
                    color="#000"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* SLIDER + SUMMARY (UNCHANGED) */}
            <View style={styles.sliderWrapper}>
              <FlatList
                ref={sliderRef}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => i.toString()}
                onMomentumScrollEnd={(e) =>
                  setActiveSlide(
                    Math.round(e.nativeEvent.contentOffset.x / width),
                  )
                }
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.slideImage} />
                )}
              />

              <View style={styles.dots}>
                {slides.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, activeSlide === i && styles.activeDot]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryBox, styles.assignedBox]}>
                <Text style={styles.summaryTitle}>Assigned</Text>
                <Text style={[styles.summaryCount, { color: "#f97316" }]}>
                  {assignedCount}
                </Text>
              </View>

              <View style={[styles.summaryBox, styles.completedBox]}>
                <Text style={styles.summaryTitle}>Completed</Text>
                <Text style={[styles.summaryCount, { color: "#16a34a" }]}>
                  {completedCount}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* CUSTOMER CARE */}
      <View style={styles.customerCareWrapper}>
        <TouchableOpacity
          style={styles.customerCareBtn}
          onPress={handleCustomerCare}
          activeOpacity={0.8}
        >
          <Ionicons name="headset-outline" size={18} color="#000" />
          <Text style={styles.customerCareText}>Customer Care</Text>
        </TouchableOpacity>
      </View>

      {/* MY ASSIGNED SERVICES */}
      <View style={styles.fixedButtonWrapper}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/assigned-services")}
        >
          <Text style={styles.primaryBtnText}>My Assigned Services</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ UPDATED FOOTER ONLY */}
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

/* ================= STYLES (UNCHANGED) ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 72,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 190, height: 64, resizeMode: "contain" },
  bellIcon: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#000",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFD700",
    fontWeight: "800",
    fontSize: 12,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  menu: {
    position: "absolute",
    top: 72,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 6,
    width: 150,
    zIndex: 20,
  },
  menuItem: { padding: 14 },
  menuText: { fontSize: 15, fontWeight: "600" },
  sliderWrapper: {
    height: SLIDER_HEIGHT,
    margin: 16,
    borderRadius: 18,
    overflow: "hidden",
  },
  slideImage: { width: width - 32, height: SLIDER_HEIGHT },
  dots: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeDot: { backgroundColor: "#000" },
  summaryRow: { flexDirection: "row", marginHorizontal: 16, gap: 12 },
  summaryBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
  },
  assignedBox: { borderColor: "#f97316" },
  completedBox: { borderColor: "#16a34a" },
  summaryTitle: { fontWeight: "700", marginBottom: 6 },
  summaryCount: { fontSize: 22, fontWeight: "800" },
  customerCareWrapper: {
    alignItems: "flex-end",
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  customerCareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "#fff",
  },
  customerCareText: { fontSize: 14, fontWeight: "800" },
  fixedButtonWrapper: {
    paddingHorizontal: 40,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: { fontWeight: "800", fontSize: 15 },
  footer: {
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  footerItem: { alignItems: "center" },
  footerText: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  footerTextActive: { fontSize: 12, marginTop: 4, fontWeight: "800" },
});
