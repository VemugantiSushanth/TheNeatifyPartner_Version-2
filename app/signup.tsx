import { router } from "expo-router";
import { Lock, Mail, Phone, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "./supabase";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !phone || !password) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      await supabase.from("staff_profile").insert({
        id: data.user?.id,
        full_name: fullName,
        email,
        phone,
      });

      Alert.alert("Success", "Please verify your email.");
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Signup Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
          />
        </View>

        <Input
          icon={<User />}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />
        <Input
          icon={<Mail />}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          icon={<Phone />}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
        />
        <Input
          icon={<Lock />}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ icon, ...props }: any) {
  return (
    <View style={styles.inputContainer}>
      {icon}
      <TextInput
        style={styles.input}
        placeholderTextColor="#9ca3af"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 25,
    paddingTop: 150,
    backgroundColor: "#FFFFFF",
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 300,
    height: 150,
    resizeMode: "contain",
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
    color: "#000000", // ✅ REQUIRED
  },
  primaryBtn: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "700",
  },
});
