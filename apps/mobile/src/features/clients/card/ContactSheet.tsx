import * as Linking from 'expo-linking';
import { useCallback } from 'react';

import { Button, Modal, useToast } from '@/ui';

export const LINK_FAILED_MESSAGE = 'לא הצלחנו לפתוח את הקישור';

/** `tel:` the number as typed, keeping only digits and a leading `+` (AC3). */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** `https://wa.me/<international number>`: digits only, a leading `0` becoming `972` (AC3). */
export function whatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('0') ? `972${digits.slice(1)}` : digits}`;
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, '')}`;
}

/** Opens a URL in the phone / WhatsApp / browser app; an error toast when nothing can open it (AC3). */
export function useOpenLink() {
  const toast = useToast();
  return useCallback(
    async (url: string) => {
      try {
        await Linking.openURL(url);
      } catch {
        toast.show(LINK_FAILED_MESSAGE, { kind: 'error' });
      }
    },
    [toast],
  );
}

export interface ContactSheetProps {
  phone: string;
  onClose: () => void;
}

/**
 * The phone chip's sheet (AC3): "התקשרות" / "וואטסאפ" / "ביטול". No mockup: built from the design-system
 * modal and buttons only (Aya approves it from a screenshot, T12).
 */
export function ContactSheet({ phone, onClose }: ContactSheetProps) {
  const openLink = useOpenLink();
  const open = (url: string) => {
    onClose();
    void openLink(url);
  };

  return (
    <Modal
      visible
      title="יצירת קשר"
      onClose={onClose}
      footer={[<Button key="cancel" variant="secondary" block label="ביטול" onPress={onClose} />]}
    >
      <Button block icon="phone" label="התקשרות" onPress={() => open(telUrl(phone))} />
      <Button block variant="secondary" icon="whatsapp" label="וואטסאפ" onPress={() => open(whatsAppUrl(phone))} />
    </Modal>
  );
}
