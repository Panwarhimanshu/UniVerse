/* Design tokens. Brand palette: blue #1453A5, cyan #21BFD3, navy #16347B, green #47B378, lime #7EFF00 */

export const colors = {
  bg: '#FFFFFF',
  surface: '#F6F8FB',
  text: '#16347B', // navy
  muted: '#6B7C90',
  faint: '#A3B1C2',
  line: '#E7ECF2',
  primary: '#1453A5', // brand blue: buttons, selected states, the main cards
  secondary: '#21BFD3', // brand sky blue: highlights and accents next to the primary
  secondaryTint: '#E2F6F9',
  green: '#47B378', // brand green: success fills and charts
  lime: '#7EFF00', // brand lime (the leaf in the logo): small accents on blue only
  accent: '#1453A5', // same as primary (older name, kept so existing screens keep working)
  accentTint: '#E8EFF9',
  positive: '#1E7E39',
  positiveTint: '#E8F5EC',
  warning: '#B45309',
  warningTint: '#FDF3E3',
  danger: '#B42318',
  dangerTint: '#FCEDEC',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.6, color: colors.text },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.text },
  heading: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: colors.muted },
};

export const statusTone: Record<string, { fg: string; bg: string }> = {
  Completed: { fg: colors.positive, bg: colors.positiveTint },
  'In Progress': { fg: colors.accent, bg: colors.accentTint },
  Pending: { fg: colors.warning, bg: colors.warningTint },
  'On Hold': { fg: colors.danger, bg: colors.dangerTint },
  verified: { fg: colors.positive, bg: colors.positiveTint },
  review: { fg: colors.accent, bg: colors.accentTint },
  missing: { fg: colors.warning, bg: colors.warningTint },
};
