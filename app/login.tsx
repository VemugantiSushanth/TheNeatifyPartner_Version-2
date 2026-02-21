import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useEffect, useState } from "react"; // 🔹 CHANGE
import {
  ActivityIndicator,
  Alert,
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

  // 🔹 CHANGE: session tracking
  const [sessionExists, setSessionExists] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  /**
   * 🔹 CHANGE: Check session AND listen to auth state
   */
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

  /**
   * 🔹 CHANGE: Check existing session
   */
  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      setSessionExists(true);
    }

    setCheckingSession(false);
  };

  /**
   * 🔹 CHANGE: Proper biometric / PIN / no-lock handling
   */
  const verifyDeviceSecurity = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // ✅ If no lock at all → allow access
      if (!hasHardware || !isEnrolled) {
        return true;
      }

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

  /**
   * 🔑 Login Handler
   */
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

  /**
   * 🔹 CHANGE: Unlock handler (no email/password)
   */
  const handleUnlock = async () => {
    const verified = await verifyDeviceSecurity();

    if (verified) {
      router.replace("./my-role");
    } else {
      Alert.alert("Verification Failed", "Unable to unlock.");
    }
  };

  /**
   * 🔹 CHANGE: Loader while checking session
   */
  if (checkingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  /**
   * 🔹 CHANGE: Show Unlock screen if session exists
   */
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

  /**
   * DEFAULT: Login Screen
   */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
          />
          <Text style={styles.subtitle}>Partner Login</Text>
        </View>

        {/* EMAIL */}
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

        {/* PASSWORD */}
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

        {/* LOGIN BUTTON */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Styles
 */
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
});
