import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/Config';

const FEATURES = [
  {
    icon: 'map-outline',
    title: 'Smart Routing',
    desc: 'Routes pedestrians around identified high-crime-risk zones using synthetic crime dataset analysis.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Danger Zone Mapping',
    desc: 'Visualises high-risk areas on the map based on severity scores, risk index, and street lighting data.',
  },
  {
    icon: 'navigate-outline',
    title: 'Valhalla Engine',
    desc: 'Powered by the open-source Valhalla routing engine for accurate, pedestrian-optimised navigation.',
  },
  {
    icon: 'locate-outline',
    title: 'Live Location',
    desc: 'Uses device GPS to automatically set your current position as the route start point.',
  },
  {
    icon: 'git-branch-outline',
    title: 'Alternate Routes',
    desc: 'Suggests up to two alternate paths alongside the primary safe route for maximum flexibility.',
  },
  {
    icon: 'sunny-outline',
    title: 'Lighting Awareness',
    desc: 'Prefers well-lit streets during route calculation, helping you stay safer after dark.',
  },
];

const STACK = [
  { label: 'Frontend',    value: 'React Native · Expo SDK 56', color: COLORS.accent },
  { label: 'Routing',    value: 'Expo Router · File-based',    color: COLORS.accent },
  { label: 'Maps',       value: 'React Native Maps',           color: COLORS.accent },
  { label: 'Backend',    value: 'FastAPI · Python',            color: COLORS.secondary },
  { label: 'Engine',     value: 'Valhalla · Docker',           color: COLORS.secondary },
  { label: 'Dataset',    value: 'Bhubaneswar Crime (Synth.)', color: COLORS.safe },
];

const TIPS = [
  '🌟  Stay on well-lit routes, especially after dark.',
  '📱  Share your live location with a trusted contact.',
  '⚠️  Avoid red-zone areas shown on the map.',
  '🚶  Prefer busy streets with active foot traffic.',
  '📞  Keep emergency numbers saved and easy to reach.',
  '🤝  Travel with company when possible at night.',
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroLogo}>
            <Text style={styles.heroLogoText}>N</Text>
          </View>
          <Text style={styles.heroTitle}>NARI Nav</Text>
          <Text style={styles.heroTagline}>Navigating Against Risk Intelligence</Text>
          <Text style={styles.heroDesc}>
            A women's safety navigation system designed for Bhubaneswar, India. NARI Nav
            helps pedestrians find safer walking routes by actively avoiding high-risk
            crime zones identified through data analysis.
          </Text>
        </View>

        {/* ── How it works ── */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={20} color={COLORS.secondary} />
            </View>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        {/* ── Tech Stack ── */}
        <Text style={styles.sectionTitle}>Tech Stack</Text>
        <View style={styles.stackCard}>
          {STACK.map((item, i) => (
            <View
              key={i}
              style={[
                styles.stackRow,
                i === STACK.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.stackLabel}>{item.label}</Text>
              <Text style={[styles.stackValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Safety Tips ── */}
        <Text style={styles.sectionTitle}>Safety Tips</Text>
        <View style={styles.tipsCard}>
          {TIPS.map((tip, i) => (
            <Text key={i} style={styles.tip}>
              {tip}
            </Text>
          ))}
        </View>

        {/* ── Emergency ── */}
        <View style={styles.emergencyCard}>
          <Ionicons name="call" size={22} color={COLORS.danger} />
          <View style={styles.emergencyBody}>
            <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
            <Text style={styles.emergencyNumbers}>
              Police: 100 · Women Helpline: 1091 · Ambulance: 108
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:1091')}
            style={styles.callBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={14} color={COLORS.white} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <Text style={styles.footer}>NARI Nav v1.0.0 · Built with ❤️ for safety</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.dark },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 28 },
  heroLogo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.secondary,
    marginBottom: 16,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.6,
    shadowRadius: 18,
  },
  heroLogoText: { color: COLORS.white, fontWeight: '900', fontSize: 38 },
  heroTitle: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTagline: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heroDesc: {
    color: COLORS.subtext,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 340,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 6,
    letterSpacing: 0.4,
  },

  // Features
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(233,30,140,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233,30,140,0.25)',
  },
  featureBody: { flex: 1 },
  featureTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginBottom: 3 },
  featureDesc: { color: COLORS.subtext, fontSize: 12, lineHeight: 18 },

  // Stack
  stackCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
    overflow: 'hidden',
  },
  stackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123,45,139,0.18)',
  },
  stackLabel: { color: COLORS.muted, fontSize: 13 },
  stackValue: { fontSize: 12, fontWeight: '600', maxWidth: 220, textAlign: 'right' },

  // Tips
  tipsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 10,
  },
  tip: { color: COLORS.subtext, fontSize: 13, lineHeight: 20 },

  // Emergency
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(239,68,68,0.09)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.32)',
    marginBottom: 24,
  },
  emergencyBody: { flex: 1 },
  emergencyTitle: { color: COLORS.danger, fontWeight: '700', fontSize: 14 },
  emergencyNumbers: { color: COLORS.subtext, fontSize: 11, marginTop: 2 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  callBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },

  footer: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
});
