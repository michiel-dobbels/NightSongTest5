import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PostCard from "../components/PostCard";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../../AuthContext";
import { useFollowCounts } from "../hooks/useFollowCounts";
import { colors } from "../styles/colors";

import { supabase } from "../../lib/supabase";

const COUNT_STORAGE_KEY = "cached_reply_counts";

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    profile,
    profileImageUri,
    setProfileImageUri,
    bannerImageUri,
    setBannerImageUri,
    myPosts: posts,
    fetchMyPosts,
  } = useAuth() as any;

  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const subscriptions = useRef<any[]>([]);

  const { followers, following } = useFollowCounts(profile?.id ?? null);

  useFocusEffect(
    useCallback(() => {
      const loadCounts = async () => {
        const stored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
        if (stored) {
          try {
            setReplyCounts(JSON.parse(stored));
          } catch (e) {
            console.error("Failed to parse cached counts", e);
          }
        }
      };
      loadCounts();
      fetchMyPosts();
    }, [fetchMyPosts]),
  );

  useEffect(() => {
    subscriptions.current.forEach((sub) => supabase.removeSubscription(sub));
    subscriptions.current = [];

    posts.forEach((p) => {
      if (!p.id) return;
      const sub = supabase
        .from(`replies:post_id=eq.${p.id}`)
        .on("INSERT", () => {
          setReplyCounts((prev) => {
            const current = prev[p.id] ?? p.reply_count ?? 0;
            const updated = { ...prev, [p.id]: current + 1 };
            AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
        })
        .on("DELETE", () => {
          setReplyCounts((prev) => {
            const current = prev[p.id] ?? p.reply_count ?? 0;
            const updated = { ...prev, [p.id]: Math.max(0, current - 1) };
            AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
        })
        .subscribe();
      subscriptions.current.push(sub);
    });

    return () => {
      subscriptions.current.forEach((sub) => supabase.removeSubscription(sub));
      subscriptions.current = [];
    };
  }, [posts]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access photos is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      setProfileImageUri(`data:image/jpeg;base64,${base64}`);
    }
  };

  const pickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access photos is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      setBannerImageUri(`data:image/jpeg;base64,${base64}`);
    }
  };

  if (!profile) return null;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {bannerImageUri ? (
        <Image source={{ uri: bannerImageUri }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, styles.placeholder]} />
      )}
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.profileRow}>
        {profileImageUri ? (
          <Image source={{ uri: profileImageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.name && <Text style={styles.name}>{profile.name}</Text>}
        </View>
      </View>
      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("FollowList", {
              userId: profile.id,
              mode: "followers",
            })
          }
        >
          <Text style={styles.statsText}>{followers ?? 0} Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("FollowList", {
              userId: profile.id,
              mode: "following",
            })
          }
        >
          <Text style={styles.statsText}>{following ?? 0} Following</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={pickImage} style={styles.uploadLink}>
        <Text style={styles.uploadText}>Upload Profile Picture</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={pickBanner} style={styles.uploadLink}>
        <Text style={styles.uploadText}>Upload Banner</Text>
      </TouchableOpacity>

      {/* Removed duplicate post list */}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      data={posts}
      extraData={replyCounts}
      ListHeaderComponent={renderHeader}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const count = replyCounts[item.id];
        const postWithCount = {
          ...item,
          reply_count: count ?? item.reply_count,
        };

        return (
          <PostCard
            post={postWithCount}
            isMe={true}
            avatarUri={profileImageUri || undefined}
            displayName={profile.name || profile.username}
            userName={profile.username}
            onPress={() => navigation.navigate("PostDetail", { post: item })}
            onAvatarPress={() => {}}
            onReplyPress={() =>
              navigation.navigate("PostDetail", { post: item })
            }
            rounded
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 0,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  banner: {
    width: "100%",
    height: Dimensions.get("window").height * 0.25,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholder: {
    backgroundColor: "#ffffff20",
  },
  textContainer: {
    marginLeft: 15,
  },
  username: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  name: {
    color: "white",
    fontSize: 20,
    marginTop: 4,
  },
  uploadLink: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#ffffff10",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  uploadText: { color: "white" },
  statsRow: { flexDirection: "row", marginLeft: 15, marginBottom: 20 },
  statsText: { color: "white", marginRight: 15 },
  postItem: {
    backgroundColor: "#ffffff10",
    borderRadius: 0,
    padding: 10,
    paddingBottom: 30,
    marginBottom: 0,
    borderBottomColor: "gray",
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  postContent: { color: "white" },
  postUsername: { fontWeight: "bold", color: "white" },
  row: { flexDirection: "row", alignItems: "flex-start" },
  postAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  timestamp: { fontSize: 10, color: "gray" },
  timestampMargin: { marginLeft: 6 },
  replyCountContainer: {
    position: "absolute",
    bottom: 6,
    left: 66,
    flexDirection: "row",
    alignItems: "center",
  },
  replyCountLarge: { fontSize: 15, color: "gray" },

  headerContainer: {
    padding: 20,
  },
});
