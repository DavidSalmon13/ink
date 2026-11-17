import { Children, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { componentMetrics as m, Text, useTheme, type Theme } from '@/theme';

import { IconButton } from './Button';

export type ModalProps = {
  visible: boolean;
  title: string;
  /** Close button ("סגירה") and the Android back gesture. */
  onClose: () => void;
  children: ReactNode;
  /** Footer actions, e.g. ביטול + שמירה; each direct child gets an equal share (`.modal-f .btn`); pass `block` buttons. */
  footer?: ReactNode;
  /** Spoken label of the close button. */
  closeLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** iPad gets the wider tokens.json `modalMaxWidth.tablet`; everything else (iPhone, web preview) the phone width. */
export function modalMaxWidth(layout: Theme['layout'], isPad: boolean): number {
  return isPad ? layout.modalMaxWidth.tablet : layout.modalMaxWidth.phone;
}

const isPad = Platform.OS === 'ios' && Platform.isPad;

/**
 * design-system.html `.backdrop` + `.modal` — always a centered card over the scrim, never a bottom
 * sheet; same layout on iPhone and iPad apart from the max width. Built on RN `Modal`, which gives
 * modal semantics (focus stays inside, VoiceOver ignores what's behind).
 */
export function Modal({ visible, title, onClose, children, footer, closeLabel = 'סגירה', style }: ModalProps) {
  const t = useTheme();
  const c = t.colors;
  const { spacing } = t;

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, zIndex: t.zIndex.backdrop }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          {/* The scrim token is a color plus an opacity: drawn as its own layer so the card stays opaque. */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: c.scrim, opacity: c.scrimOpacity }}
          />
          <View
            accessibilityViewIsModal
            aria-modal
            role="dialog"
            accessibilityLabel={title}
            style={[
              {
                width: '100%',
                maxWidth: modalMaxWidth(t.layout, isPad),
                maxHeight: m.modal.maxHeight,
                backgroundColor: c.surface,
                borderRadius: m.modal.radius,
                zIndex: t.zIndex.modal,
                ...t.shadows.modal,
              },
              style,
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: spacing.md,
                paddingBottom: spacing.sm,
                paddingStart: spacing.xl,
                paddingEnd: spacing.sm,
              }}
            >
              <Text variant="title2" accessibilityRole="header">
                {title}
              </Text>
              <IconButton icon="close" accessibilityLabel={closeLabel} onPress={onClose} />
            </View>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{
                paddingTop: spacing.xs,
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.lg,
                gap: spacing.md,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {footer ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: m.modal.footerGap,
                  paddingTop: m.modal.footerPaddingTop,
                  paddingHorizontal: spacing.xl,
                  paddingBottom: spacing.xl,
                  borderTopWidth: t.borderWidth.hairline,
                  borderTopColor: c.border,
                }}
              >
                {Children.map(footer, (action) => (
                  <View style={{ flex: 1 }}>{action}</View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
