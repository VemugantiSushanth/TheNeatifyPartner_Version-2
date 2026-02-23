import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "./supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sessionExists, setSessionExists] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // 🔹 OTP STATES
  const [loginMode, setLoginMode] = useState<"email" | "mobile">("email");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setSessionExists(true);
        } else {
          setSessionExists(false);
        }
        setCheckingSession(false);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔹 Handle Android Back
  useEffect(() => {
    const backAction = () => {
      if (loginMode === "mobile") {
        setLoginMode("email");
        setOtpSent(false);
        setMobile("");
        setOtp("");
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [loginMode]);

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      setSessionExists(true);
    }

    setCheckingSession(false);
  };

  const verifyDeviceSecurity = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) return true;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Neatify Staff",
        fallbackLabel: "Use PIN",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
        requireConfirmation: false,
      });

      return result.success;
    } catch {
      return true;
    }
  };

  // 🔑 EMAIL LOGIN (UNCHANGED)
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password required");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const verified = await verifyDeviceSecurity();

      if (!verified) {
        await supabase.auth.signOut();
        Alert.alert("Verification Failed", "Device verification required.");
        return;
      }

      router.replace("./my-role");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CLEAN MOBILE (remove spaces, symbols)
  const getCleanMobile = () => mobile.replace(/\D/g, "");

  // 🔹 CHECK NUMBER EXISTS (DB STORES WITHOUT +91)
  const checkIfMobileRegistered = async () => {
    const cleanedMobile = getCleanMobile();

    if (cleanedMobile.length !== 10) {
      Alert.alert("Error", "Enter valid 10 digit mobile number");
      return false;
    }

    const { data } = await supabase
      .from("staff_profile")
      .select("phone")
      .eq("phone", cleanedMobile)
      .maybeSingle();

    if (!data) {
      Alert.alert("Error", "Number not registered yet");
      return false;
    }

    return true;
  };

  // 🔹 SEND OTP (SUPABASE REQUIRES +91)
  const handleSendOtp = async () => {
    const exists = await checkIfMobileRegistered();
    if (!exists) return;

    const cleanedMobile = getCleanMobile();

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${cleanedMobile}`,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setOtpSent(true);
      Alert.alert("Success", "OTP sent successfully");
    }
  };

  // 🔹 VERIFY OTP
  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert("Error", "Enter OTP");
      return;
    }

    const cleanedMobile = getCleanMobile();

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${cleanedMobile}`,
      token: otp,
      type: "sms",
    });

    if (error) {
      setLoading(false);
      Alert.alert("Error", "Invalid OTP");
      return;
    }

    const verified = await verifyDeviceSecurity();

    if (!verified) {
      await supabase.auth.signOut();
      Alert.alert("Verification Failed");
      setLoading(false);
      return;
    }

    router.replace("./my-role");
  };

  const handleUnlock = async () => {
    const verified = await verifyDeviceSecurity();

    if (verified) {
      router.replace("./my-role");
    } else {
      Alert.alert("Verification Failed", "Unable to unlock.");
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (sessionExists) {
    return (
      <View style={styles.unlockContainer}>
        <StatusBar barStyle="dark-content" />
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlock}>
          <Text style={styles.primaryBtnText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
          />
          <Text style={styles.subtitle}>Partner Login</Text>
        </View>

        {loginMode === "email" && (
          <>
            <View style={styles.inputContainer}>
              <Mail size={20} />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Log In</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>OR</Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setLoginMode("mobile")}
            >
              <Text style={styles.primaryBtnText}>
                Login With Mobile Number
              </Text>
            </TouchableOpacity>
          </>
        )}

        {loginMode === "mobile" && !otpSent && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Mobile Number"
                keyboardType="phone-pad"
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {loginMode === "mobile" && otpSent && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter OTP"
                keyboardType="number-pad"
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {loginMode === "mobile" && (
          <TouchableOpacity
            onPress={() => {
              setLoginMode("email");
              setOtpSent(false);
              setMobile("");
              setOtp("");
            }}
            style={styles.backContainer}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
  },
  unlockContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 25,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 100,
    resizeMode: "contain",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  primaryBtn: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "700",
  },
  orText: {
    textAlign: "center",
    marginVertical: 15,
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  backContainer: {
    marginTop: 25,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
