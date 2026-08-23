import { Platform } from 'react-native';

/**
 * Backend API base URL.
 * Android Emulator → http://10.0.2.2:8000
 * Physical Device  → http://<YOUR_LAN_IP>:8000
 * iOS Simulator    → http://localhost:8000
 * Web              → http://localhost:8000
 */
export const API_BASE_URL: string = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
}) as string;

export const BHUBANESWAR_CENTER = {
  latitude: 20.2961,
  longitude: 85.8245,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export const COLORS = {
  primary:       '#7B2D8B',
  primaryDark:   '#5A1F68',
  primaryLight:  '#9B4DCA',
  secondary:     '#E91E8C',
  accent:        '#00BCD4',
  danger:        '#EF4444',
  dangerFill:    'rgba(239, 68, 68, 0.20)',
  dangerStroke:  '#EF4444',
  safe:          '#10B981',
  safeFill:      'rgba(16, 185, 129, 0.15)',
  warning:       '#F59E0B',
  dark:          '#0D0521',
  darker:        '#070313',
  surface:       '#1A0A35',
  card:          '#1E0D3E',
  cardBorder:    'rgba(123, 45, 139, 0.45)',
  inputBg:       '#2A1450',
  text:          '#F3E8FF',
  subtext:       '#C4B5FD',
  muted:         '#7C6F94',
  white:         '#FFFFFF',
};
