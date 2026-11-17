import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';

export type ToastKind = 'default' | 'error';

export type ToastOptions = {
  kind?: ToastKind;
  /** Defaults to `check` (default) or `warning` (error), as in design-system.html. */
  icon?: IconName;
  /** Inline link after the message, e.g. "קביעת תור". Pressing it also dismisses the toast. */
  action?: { label: string; onPress: () => void };
  /** Auto-dismiss delay; defaults per kind (componentMetrics.toast). */
  durationMs?: number;
};

type ToastState = ToastOptions & { id: number; message: string };

type ToastApi = { show: (message: string, options?: ToastOptions) => void; hide: () => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Show a toast from anywhere under `ToastProvider`. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

/** Holds the current toast (a new one replaces it) and renders the host above the app at the toast z-index. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const hide = useCallback(() => setToast(null), []);
  const show = useCallback((message: string, options: ToastOptions = {}) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current, message });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.durationMs ?? (toast.kind === 'error' ? m.toast.errorDurationMs : m.toast.durationMs);
    const timer = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toast={toast} onDismiss={hide} />
    </ToastContext.Provider>
  );
}

/** Pinned under the top safe area (clear of the keyboard and the tab bar); lets touches pass around it. */
function ToastHost({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + t.spacing.sm,
        start: t.spacing.screenPadding,
        end: t.spacing.screenPadding,
        alignItems: 'center',
        zIndex: t.zIndex.toast,
        elevation: t.zIndex.toast,
      }}
    >
      <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
    </View>
  );
}

export type ToastProps = ToastOptions & { message: string; onDismiss?: () => void };

/** design-system.html `.toast` / `.toast.err` — inverted pill-card with a glyph and optional inline action. */
export function Toast({ message, kind = 'default', icon, action, onDismiss }: ToastProps) {
  const t = useTheme();
  const c = t.colors;
  const isError = kind === 'error';
  const bg = isError ? c.danger : c.text;
  const fg = isError ? c.onDanger : c.bg;

  return (
    <View
      // One spoken element unless there's an action, which must stay separately focusable.
      accessible={!action}
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: m.toast.gap,
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        backgroundColor: bg,
        borderRadius: t.radii.md,
        ...t.shadows.raised,
      }}
    >
      <Icon name={icon ?? (isError ? 'warning' : 'check')} size={m.toast.iconSize} tint={fg} />
      <Text style={{ flexShrink: 1, fontFamily: fontFace('500'), fontSize: m.toast.fontSize, color: fg }}>
        {message}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={t.spacing.md}
          onPress={() => {
            action.onPress();
            onDismiss?.();
          }}
          style={{ marginStart: m.toast.actionGap }}
        >
          <Text style={{ fontFamily: fontFace('700'), fontSize: m.toast.fontSize, color: fg }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
