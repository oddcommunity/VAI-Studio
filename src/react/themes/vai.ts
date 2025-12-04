/**
 * VAI Theme - Pure Blue Base
 * Primary: hsl(215, 83%, 50%) - Clean, professional blue
 * Secondary: Cool gray neutrals with blue tint
 * Accent: Orange for CTAs and highlights
 * Tertiary: Teal for decorative elements
 */

export const vaiTheme = {
  // PRIMARY - Pure Blue Brand Color (12-step scale)
  primary1: 'hsl(215, 83%, 10%)',
  primary2: 'hsl(215, 83%, 15%)',
  primary3: 'hsl(215, 83%, 20%)',
  primary4: 'hsl(215, 83%, 30%)',
  primary5: 'hsl(215, 83%, 40%)',
  primary6: 'hsl(215, 83%, 50%)', // Base brand color
  primary7: 'hsl(215, 83%, 60%)',
  primary8: 'hsl(215, 83%, 70%)',
  primary9: 'hsl(215, 83%, 80%)',
  primary10: 'hsl(215, 83%, 90%)',
  primary11: 'hsl(215, 83%, 95%)',
  primary12: 'hsl(215, 83%, 98%)',

  // SECONDARY - Cool Gray Neutrals (12-step scale)
  secondary1: 'hsl(215, 15%, 10%)',
  secondary2: 'hsl(215, 15%, 15%)',
  secondary3: 'hsl(215, 15%, 25%)',
  secondary4: 'hsl(215, 15%, 35%)',
  secondary5: 'hsl(215, 15%, 45%)',
  secondary6: 'hsl(215, 15%, 55%)',
  secondary7: 'hsl(215, 15%, 65%)',
  secondary8: 'hsl(215, 15%, 75%)',
  secondary9: 'hsl(215, 15%, 85%)',
  secondary10: 'hsl(215, 15%, 92%)',
  secondary11: 'hsl(215, 15%, 96%)',
  secondary12: 'hsl(215, 15%, 99%)',

  // ACCENT - Orange (10-step scale)
  accent1: 'hsl(30, 90%, 15%)',
  accent2: 'hsl(30, 90%, 25%)',
  accent3: 'hsl(30, 90%, 35%)',
  accent4: 'hsl(30, 90%, 45%)',
  accent5: 'hsl(30, 90%, 55%)',
  accent6: 'hsl(30, 90%, 65%)',
  accent7: 'hsl(30, 90%, 75%)',
  accent8: 'hsl(30, 90%, 85%)',
  accent9: 'hsl(30, 90%, 92%)',
  accent10: 'hsl(30, 90%, 96%)',

  // TERTIARY - Teal (10-step scale)
  tertiary1: 'hsl(180, 70%, 15%)',
  tertiary2: 'hsl(180, 70%, 25%)',
  tertiary3: 'hsl(180, 70%, 35%)',
  tertiary4: 'hsl(180, 70%, 45%)',
  tertiary5: 'hsl(180, 70%, 55%)',
  tertiary6: 'hsl(180, 70%, 65%)',
  tertiary7: 'hsl(180, 70%, 75%)',
  tertiary8: 'hsl(180, 70%, 85%)',
  tertiary9: 'hsl(180, 70%, 92%)',
  tertiary10: 'hsl(180, 70%, 96%)',

  // SEMANTIC COLORS - Status/Feedback
  // Success - Green
  success: 'hsl(142, 76%, 36%)',
  successBackground: 'hsla(142, 76%, 36%, 0.1)',
  successBorder: 'hsl(142, 76%, 36%)',
  successText: 'hsl(142, 76%, 36%)',

  // Error - Red
  error: 'hsl(0, 84%, 60%)',
  errorBackground: 'hsla(0, 84%, 60%, 0.1)',
  errorBorder: 'hsl(0, 84%, 60%)',
  errorText: 'hsl(0, 84%, 60%)',

  // Warning - Amber/Orange
  warning: 'hsl(38, 92%, 50%)',
  warningBackground: 'hsla(38, 92%, 50%, 0.1)',
  warningBorder: 'hsl(38, 92%, 50%)',
  warningText: 'hsl(38, 92%, 50%)',

  // Info - Blue
  info: 'hsl(215, 83%, 50%)',
  infoBackground: 'hsla(215, 83%, 50%, 0.1)',
  infoBorder: 'hsl(215, 83%, 50%)',
  infoText: 'hsl(215, 83%, 50%)',

  // Recording - Red for recording indicator
  recording: 'hsl(0, 84%, 60%)',
  recordingBackground: 'hsla(0, 84%, 60%, 0.15)',

  // CTA - Orange for call-to-action buttons
  cta: 'hsl(28, 100%, 58%)',
  ctaHover: 'hsl(28, 100%, 62%)',
  ctaPress: 'hsl(28, 100%, 66%)',

  // Semantic color mappings (Tamagui compatibility)
  background: 'hsl(215, 15%, 99%)',
  backgroundHover: 'hsl(215, 15%, 96%)',
  backgroundPress: 'hsl(215, 15%, 92%)',
  backgroundFocus: 'hsl(215, 15%, 96%)',
  backgroundTransparent: 'rgba(0,0,0,0)',

  color: 'hsl(215, 15%, 10%)',
  colorHover: 'hsl(215, 15%, 15%)',
  colorPress: 'hsl(215, 15%, 15%)',
  colorFocus: 'hsl(215, 15%, 10%)',
  colorTransparent: 'rgba(0,0,0,0)',

  borderColor: 'hsl(215, 15%, 85%)',
  borderColorHover: 'hsl(215, 15%, 75%)',
  borderColorPress: 'hsl(215, 15%, 85%)',
  borderColorFocus: 'hsl(215, 15%, 75%)',

  placeholderColor: 'hsl(215, 15%, 55%)',

  primary: 'hsl(215, 83%, 50%)',

  outlineColor: 'hsl(215, 83%, 50%)',

  shadowColor: 'hsla(215, 83%, 10%, 0.085)',
  shadowColorHover: 'hsla(215, 83%, 10%, 0.15)',
  shadowColorPress: 'hsla(215, 83%, 10%, 0.085)',
  shadowColorFocus: 'hsla(215, 83%, 10%, 0.085)',
}

/**
 * VAI Dark Theme
 * Inverted color scheme for dark mode
 */
export const vaiDarkTheme = {
  // PRIMARY - Pure Blue (same as light)
  primary1: 'hsl(215, 83%, 10%)',
  primary2: 'hsl(215, 83%, 15%)',
  primary3: 'hsl(215, 83%, 20%)',
  primary4: 'hsl(215, 83%, 30%)',
  primary5: 'hsl(215, 83%, 40%)',
  primary6: 'hsl(215, 83%, 50%)',
  primary7: 'hsl(215, 83%, 60%)',
  primary8: 'hsl(215, 83%, 70%)',
  primary9: 'hsl(215, 83%, 80%)',
  primary10: 'hsl(215, 83%, 90%)',
  primary11: 'hsl(215, 83%, 95%)',
  primary12: 'hsl(215, 83%, 98%)',

  // SECONDARY - Cool Gray Neutrals
  secondary1: 'hsl(215, 15%, 10%)',
  secondary2: 'hsl(215, 15%, 15%)',
  secondary3: 'hsl(215, 15%, 25%)',
  secondary4: 'hsl(215, 15%, 35%)',
  secondary5: 'hsl(215, 15%, 45%)',
  secondary6: 'hsl(215, 15%, 55%)',
  secondary7: 'hsl(215, 15%, 65%)',
  secondary8: 'hsl(215, 15%, 75%)',
  secondary9: 'hsl(215, 15%, 85%)',
  secondary10: 'hsl(215, 15%, 92%)',
  secondary11: 'hsl(215, 15%, 96%)',
  secondary12: 'hsl(215, 15%, 99%)',

  // ACCENT - Orange
  accent1: 'hsl(30, 90%, 15%)',
  accent2: 'hsl(30, 90%, 25%)',
  accent3: 'hsl(30, 90%, 35%)',
  accent4: 'hsl(30, 90%, 45%)',
  accent5: 'hsl(30, 90%, 55%)',
  accent6: 'hsl(30, 90%, 65%)',
  accent7: 'hsl(30, 90%, 75%)',
  accent8: 'hsl(30, 90%, 85%)',
  accent9: 'hsl(30, 90%, 92%)',
  accent10: 'hsl(30, 90%, 96%)',

  // TERTIARY - Teal
  tertiary1: 'hsl(180, 70%, 15%)',
  tertiary2: 'hsl(180, 70%, 25%)',
  tertiary3: 'hsl(180, 70%, 35%)',
  tertiary4: 'hsl(180, 70%, 45%)',
  tertiary5: 'hsl(180, 70%, 55%)',
  tertiary6: 'hsl(180, 70%, 65%)',
  tertiary7: 'hsl(180, 70%, 75%)',
  tertiary8: 'hsl(180, 70%, 85%)',
  tertiary9: 'hsl(180, 70%, 92%)',
  tertiary10: 'hsl(180, 70%, 96%)',

  // SEMANTIC COLORS - Status/Feedback (same as light, work well on dark)
  // Success - Green
  success: 'hsl(142, 76%, 36%)',
  successBackground: 'hsla(142, 76%, 36%, 0.15)',
  successBorder: 'hsl(142, 76%, 36%)',
  successText: 'hsl(142, 76%, 46%)',

  // Error - Red
  error: 'hsl(0, 84%, 60%)',
  errorBackground: 'hsla(0, 84%, 60%, 0.15)',
  errorBorder: 'hsl(0, 84%, 60%)',
  errorText: 'hsl(0, 84%, 70%)',

  // Warning - Amber/Orange
  warning: 'hsl(38, 92%, 50%)',
  warningBackground: 'hsla(38, 92%, 50%, 0.15)',
  warningBorder: 'hsl(38, 92%, 50%)',
  warningText: 'hsl(38, 92%, 60%)',

  // Info - Blue
  info: 'hsl(215, 83%, 50%)',
  infoBackground: 'hsla(215, 83%, 50%, 0.15)',
  infoBorder: 'hsl(215, 83%, 50%)',
  infoText: 'hsl(215, 83%, 65%)',

  // Recording - Red for recording indicator
  recording: 'hsl(0, 84%, 60%)',
  recordingBackground: 'hsla(0, 84%, 60%, 0.2)',

  // CTA - Orange for call-to-action buttons
  cta: 'hsl(28, 100%, 58%)',
  ctaHover: 'hsl(28, 100%, 62%)',
  ctaPress: 'hsl(28, 100%, 66%)',

  // Semantic color mappings (INVERTED for dark mode)
  background: 'hsl(215, 15%, 10%)',
  backgroundHover: 'hsl(215, 15%, 15%)',
  backgroundPress: 'hsl(215, 15%, 25%)',
  backgroundFocus: 'hsl(215, 15%, 15%)',
  backgroundTransparent: 'rgba(0,0,0,0)',

  color: 'hsl(215, 15%, 96%)',
  colorHover: 'hsl(215, 15%, 92%)',
  colorPress: 'hsl(215, 15%, 92%)',
  colorFocus: 'hsl(215, 15%, 96%)',
  colorTransparent: 'rgba(0,0,0,0)',

  borderColor: 'hsl(215, 15%, 25%)',
  borderColorHover: 'hsl(215, 15%, 35%)',
  borderColorPress: 'hsl(215, 15%, 25%)',
  borderColorFocus: 'hsl(215, 15%, 35%)',

  placeholderColor: 'hsl(215, 15%, 55%)',

  primary: 'hsl(215, 83%, 50%)',

  outlineColor: 'hsl(215, 83%, 50%)',

  shadowColor: 'hsla(215, 83%, 0%, 0.3)',
  shadowColorHover: 'hsla(215, 83%, 0%, 0.4)',
  shadowColorPress: 'hsla(215, 83%, 0%, 0.3)',
  shadowColorFocus: 'hsla(215, 83%, 0%, 0.3)',
}
