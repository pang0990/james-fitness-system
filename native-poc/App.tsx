import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { createNativeSqliteTrainingDatabase } from "../app-source/src/lib/training-offline/native-sqlite-adapter";
import { saveTrainingOffline, readyTrainingCommands } from "../app-source/src/lib/training-offline/protocol";
import type { Session } from "../app-source/src/lib/training-core/types";

const DEMO_ACCOUNT = "00000000-0000-4000-8000-000000000088";
const SESSION_ID = "native-synthetic-session";
const offlineDatabase = createNativeSqliteTrainingDatabase(SQLite.openDatabaseAsync);

export default function App() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("準備載入原生 SQLite");
  const [queue, setQueue] = useState(0);
  const [sessionName, setSessionName] = useState("尚無本機示範訓練");

  const refresh = useCallback(async () => {
    try {
      const snapshot = await offlineDatabase.transact(tx =>
        tx.getSnapshot(DEMO_ACCOUNT, SESSION_ID));
      const commands = await offlineDatabase.transact(tx =>
        tx.listCommands(DEMO_ACCOUNT));
      setSessionName(snapshot?.payload.name ?? "尚無本機示範訓練");
      setQueue(commands.length);
      setStatus("本機 SQLite 已讀取。未連接真正 Supabase 開發帳戶。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "讀取失敗");
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const storeSyntheticSession = useCallback(async () => {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const count = await offlineDatabase.transact(async tx =>
        (await tx.listCommands(DEMO_ACCOUNT)).length);
      const date = now.slice(0, 10);
      const item: Session = {
        id: SESSION_ID, date, name: "示範訓練 " + (count + 1),
        status: "in_progress", createdAt: now,
        exercises: [{ id: "synthetic-squat", name: "Squat", sets: [] }],
      };
      await saveTrainingOffline(offlineDatabase, {
        ownerId: DEMO_ACCOUNT, commandId: Crypto.randomUUID(),
        session: item, now,
      });
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "寫入失敗");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return <SafeAreaView style={styles.shell}>
    <ScrollView contentContainerStyle={styles.inner}>
      <Text style={styles.eyebrow}>JAMES FITNESS SYSTEM / NATIVE</Text>
      <Text style={styles.heading}>Training-first</Text>
      <Text style={styles.warning}>DEVELOPMENT POC · 虛構帳戶 · 僅本機離線</Text>
      <Text style={styles.cardTitle}>Active Training Snapshot</Text>
      <View style={styles.card}>
        <Text style={styles.value}>{sessionName}</Text>
        <Text style={styles.meta}>待同步指令：{queue}</Text>
        <Text style={styles.meta}>資料庫：Expo SQLite（原生裝置儲存）</Text>
      </View>
      <Pressable accessibilityRole="button" disabled={busy}
        onPress={() => { void storeSyntheticSession(); }} style={styles.button}>
        <Text style={styles.buttonLabel}>新增虛構訓練離線紀錄</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy}
        onPress={() => { void refresh(); }} style={styles.secondaryButton}>
        <Text style={styles.buttonLabel}>重新讀取本機資料</Text>
      </Pressable>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.note}>
        此測試 App 尚無 Google 登入、線上資料同步、Cycle 雲端推進或正式訓練 UI。
        不要輸入或匯入真實健康資料；iOS／Android 真機測試尚待驗收。
      </Text>
      {busy ? <ActivityIndicator color="white"/> : null}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  shell:{flex:1,backgroundColor:"#08080a"},
  inner:{paddingHorizontal:24,paddingTop:48,paddingBottom:60,gap:14},
  eyebrow:{fontSize:11,color:"#a1a1aa",letterSpacing:2},
  heading:{fontSize:31,fontWeight:"700",color:"white",marginBottom:12},
  warning:{fontSize:12,color:"#f3d5b9",marginBottom:18},
  cardTitle:{fontSize:16,color:"white",fontWeight:"600"},
  card:{backgroundColor:"#202025",borderRadius:18,padding:22,gap:12,marginBottom:12},
  value:{fontSize:24,color:"white",fontWeight:"650"},
  meta:{fontSize:13,color:"#c9c9cd"},
  button:{backgroundColor:"#3e3e46",borderRadius:14,padding:17},
  secondaryButton:{backgroundColor:"#24242a",borderRadius:14,padding:17},
  buttonLabel:{color:"white",fontSize:15,fontWeight:"600",textAlign:"center"},
  status:{fontSize:13,color:"#cacacd",marginTop:14},
  note:{fontSize:12,color:"#a1a1aa",lineHeight:20,marginTop:22},
});
