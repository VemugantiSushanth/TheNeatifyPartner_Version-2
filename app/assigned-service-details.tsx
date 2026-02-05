import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Linking,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "./supabase";

export default function AssignedServiceDetails() {
  const params = useLocalSearchParams();
  const booking = params.booking ? JSON.parse(params.booking as string) : null;

  const [startOtp, setStartOtp] = useState("");
  const [endOtp, setEndOtp] = useState("");

  const [startVerified, setStartVerified] = useState(false);
  const [endVerified, setEndVerified] = useState(false);

  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [workStopped, setWorkStopped] = useState(false);

  const [uploading, setUploading] = useState(false);

  /* ✅ ADDED */
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const timerRef = useRef<number | null>(null);

  /* ✅ ADDED */
  const scrollRef = useRef<ScrollView>(null);

  if (!booking) return null;

  /* ================= KEYBOARD LISTENER (ADDED) ================= */
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const formatDuration = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  /* ================= MAP ================= */
  const openMaps = (address: string) =>
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address,
      )}`,
    );

  /* ================= CAMERA ================= */
  const openCamera = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) {
      Alert.alert("Camera permission required");
      return null;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    return r.canceled ? null : r.assets[0].uri;
  };

  /* ================= IMAGE UPLOAD ================= */
  const uploadImage = async (localUri: string, type: "start" | "end") => {
    try {
      setUploading(true);

      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) return;

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: "base64",
      });

      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const filePath = `staff_uploads/${email}/${booking.id}/${type}_${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("work-photos")
        .upload(filePath, byteArray, {
          contentType: "image/jpeg",
        });

      if (error) {
        Alert.alert("Upload failed", error.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("work-photos")
        .getPublicUrl(filePath);

      const imageUrl = publicData.publicUrl;

      if (type === "start") {
        setBeforeImages((prev) => [...prev, localUri]);

        await supabase
          .from("bookings")
          .update({
            start_photo_url: [...(booking.start_photo_url || []), imageUrl],
          })
          .eq("id", booking.id);
      } else {
        setAfterImages((prev) => [...prev, localUri]);

        await supabase
          .from("bookings")
          .update({
            end_photo_url: [...(booking.end_photo_url || []), imageUrl],
          })
          .eq("id", booking.id);
      }
    } catch (err: any) {
      Alert.alert("Upload failed", err.message || "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number, type: "start" | "end") => {
    if (type === "start") {
      setBeforeImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAfterImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  /* ================= OTP ================= */
  const verifyStartOtp = () => {
    if (startOtp !== booking.startotp) {
      Alert.alert("Invalid Start OTP");
      return;
    }
    Keyboard.dismiss();
    setStartVerified(true);
  };

  const verifyEndOtp = () => {
    if (endOtp !== booking.endotp) {
      Alert.alert("Invalid End OTP");
      return;
    }
    Keyboard.dismiss();
    setEndVerified(true);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      {uploading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loaderText}>Uploading image...</Text>
        </View>
      )}

      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
        />
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "android" ? "height" : "padding"}
        keyboardVerticalOffset={Platform.OS === "android" ? 60 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: 80, minHeight: "100%" },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>{booking.customer_name}</Text>
            <Text>Time: {booking.booking_time}</Text>
            <Text>Address: {booking.full_address}</Text>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => {
                if (!booking.phone_number) {
                  Alert.alert("Phone number not available");
                  return;
                }
                Linking.openURL(`tel:${booking.phone_number}`);
              }}
            >
              <Ionicons name="call" size={18} color="#ffffff" />
              <Text style={styles.callText}>Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => openMaps(booking.full_address)}
            >
              <Text>Navigate</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Start OTP</Text>
            <TextInput
              style={styles.otpInput}
              value={startOtp}
              onChangeText={setStartOtp}
              keyboardType="number-pad"
              maxLength={6}
            />

            {startVerified && (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={16} color="green" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}

            {!startVerified && (
              <TouchableOpacity style={styles.btn} onPress={verifyStartOtp}>
                <Text style={styles.btnText}>Verify Start OTP</Text>
              </TouchableOpacity>
            )}

            {startVerified && (
              <>
                <View style={styles.imageRow}>
                  {beforeImages.map((uri, i) => (
                    <View key={i} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.preview} />
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeImage(i, "start")}
                      >
                        <Ionicons name="close-circle" size={18} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={async () => {
                    const uri = await openCamera();
                    if (uri) uploadImage(uri, "start");
                  }}
                >
                  <Text>
                    {beforeImages.length === 0
                      ? "Upload Image"
                      : "Upload Another Image"}
                  </Text>
                  <Ionicons name="camera" size={18} />
                </TouchableOpacity>
              </>
            )}

            {beforeImages.length > 0 && !running && !workStopped && (
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => {
                  Alert.alert(
                    "You Are Ready To Go 🚀",
                    "Click OK to start work",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "OK",
                        onPress: async () => {
                          await supabase
                            .from("bookings")
                            .update({
                              work_started_at: new Date().toISOString(),
                            })
                            .eq("id", booking.id);

                          setRunning(true);
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={styles.btnText}>Start Work</Text>
              </TouchableOpacity>
            )}

            {running && (
              <Text style={styles.timer}>{formatDuration(seconds)}</Text>
            )}

            {running && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => {
                  setRunning(false);
                  setWorkStopped(true);
                }}
              >
                <Text>Work Complete</Text>
              </TouchableOpacity>
            )}

            {workStopped && (
              <Text style={styles.timer}>
                Worked Time: {formatDuration(seconds)}
              </Text>
            )}

            {workStopped && (
              <>
                <View style={styles.imageRow}>
                  {afterImages.map((uri, i) => (
                    <View key={i} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.preview} />
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeImage(i, "end")}
                      >
                        <Ionicons name="close-circle" size={18} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={async () => {
                    const uri = await openCamera();
                    if (uri) uploadImage(uri, "end");
                  }}
                >
                  <Text>
                    {afterImages.length === 0
                      ? "Upload Image"
                      : "Upload Another Image"}
                  </Text>
                  <Ionicons name="camera" size={18} />
                </TouchableOpacity>

                {afterImages.length > 0 && (
                  <>
                    <Text style={styles.label}>End OTP</Text>
                    <TextInput
                      style={styles.otpInput}
                      value={endOtp}
                      onChangeText={setEndOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      /* ✅ ADDED */
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollToEnd({ animated: true });
                        }, 300);
                      }}
                    />

                    {endVerified && (
                      <View style={styles.verifiedRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="green"
                        />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}

                    {!endVerified && (
                      <TouchableOpacity
                        style={styles.btn}
                        onPress={verifyEndOtp}
                      >
                        <Text style={styles.btnText}>Verify End OTP</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}

            {endVerified && afterImages.length > 0 && (
              <TouchableOpacity
                style={styles.serviceDone}
                onPress={async () => {
                  await supabase
                    .from("bookings")
                    .update({
                      work_status: "COMPLETED",
                      worked_duration: seconds,
                      work_ended_at: new Date().toISOString(),
                    })
                    .eq("id", booking.id);

                  Alert.alert("Well Done! 🎉", "You have completed a service", [
                    {
                      text: "OK",
                      onPress: () => router.replace("/dashboard"),
                    },
                  ]);
                }}
              >
                <Text style={styles.serviceDoneText}>Service Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ✅ FOOTER LOCKED */}
      {!isKeyboardVisible && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerItem}>
            <Ionicons name="home" size={22} color="#000" />
            <Text style={styles.footerTextActive}>Home</Text>
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
      )}
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  header: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 190, height: 64, resizeMode: "contain" },
  body: { padding: 20 },
  card: { borderWidth: 2, borderRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: "800" },
  label: { marginTop: 16, fontWeight: "700" },
  otpInput: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6 },
  verifiedRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  verifiedText: { color: "green", fontWeight: "700" },
  btn: {
    marginTop: 10,
    backgroundColor: "#FFD700",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#000000", fontWeight: "700" },
  imageRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  preview: { width: 60, height: 60, borderRadius: 8 },
  uploadBtn: {
    marginTop: 10,
    backgroundColor: "#e5e7eb",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  startBtn: {
    marginTop: 14,
    backgroundColor: "#FFD700",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  completeBtn: {
    marginTop: 10,
    backgroundColor: "#FFD700",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  timer: { marginTop: 10, fontWeight: "800", textAlign: "center" },
  mapBtn: {
    backgroundColor: "#FFD700",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  callBtn: {
    marginTop: 10,
    backgroundColor: "#000000",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  callText: { fontWeight: "700", color: "#ffffff" },
  serviceDone: {
    marginTop: 24,
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  serviceDoneText: { color: "#fff", fontWeight: "800" },
  imageWrapper: { position: "relative" },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loaderText: { marginTop: 10, fontWeight: "700" },
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
