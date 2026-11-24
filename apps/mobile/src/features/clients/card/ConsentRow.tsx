import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import type { Client, ConsentAction } from '@/api/clients';
import { fontFace, Num, Text, useTheme } from '@/theme';
import { Button, formatDayDate, Modal } from '@/ui';

import { useChangeConsent } from './useConsent';

/**
 * ClientCard.html / .ipad.html `.consent` metrics that tokens.json doesn't carry: 12px below the
 * next-appointment line (iPhone) or the stats (iPad), a hairline top border with 10px above the content,
 * and 14px text.
 */
const consentMetrics = {
  marginTop: 12,
  paddingTop: 10,
  fontSize: 14,
} as const;

export const CONSENT_LABEL = 'הסכמה לדיוור:';

/** The bold value: "ניתנה · <date>", "בוטלה · <date>" or "לא ניתנה" (AC5); the date is its own LTR run. */
function consentValue({ marketingConsent: state, consentUpdatedAt: at }: Client): ReactNode {
  if (state === 'none' || !at) return 'לא ניתנה';
  return [
    state === 'granted' ? 'ניתנה · ' : 'בוטלה · ',
    <Num key="at" style={{ fontFamily: fontFace('700'), fontSize: consentMetrics.fontSize }}>
      {formatDayDate(at)}
    </Num>,
  ];
}

export interface ConsentRowProps {
  client: Client;
  /** The card's horizontal inset (iPhone screen padding, or the iPad pane's). */
  inset: number;
}

/**
 * "הסכמה לדיוור" (marketing-consent AC5–AC7): the current state and its date, with "ביטול הסכמה" when
 * granted and "מתן הסכמה" otherwise. Each opens a confirmation built on the `src/ui` Modal (no mockup,
 * like DeleteClientDialog); confirming POSTs and the row follows the cached client.
 */
export function ConsentRow({ client, inset }: ConsentRowProps) {
  const t = useTheme();
  const [confirm, setConfirm] = useState<ConsentAction | null>(null);
  const change = useChangeConsent(client.id);
  const granted = client.marketingConsent === 'granted';

  const submit = (action: ConsentAction) =>
    change.mutate(action, {
      // Success or failure, the dialog closes; the hook's toast says which (AC6).
      onSettled: () => setConfirm(null),
    });

  return (
    <View style={{ paddingHorizontal: inset }}>
      <View
        style={{
          marginTop: consentMetrics.marginTop,
          paddingTop: consentMetrics.paddingTop,
          borderTopWidth: t.borderWidth.hairline,
          borderTopColor: t.colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: t.spacing.sm,
        }}
      >
        <Text style={{ fontSize: consentMetrics.fontSize, flexShrink: 1 }}>
          {`${CONSENT_LABEL} `}
          <Text style={{ fontFamily: fontFace('700'), fontSize: consentMetrics.fontSize }}>
            {consentValue(client)}
          </Text>
        </Text>
        <Button
          variant="ghost"
          small
          label={granted ? 'ביטול הסכמה' : 'מתן הסכמה'}
          onPress={() => setConfirm(granted ? 'revoked' : 'granted')}
        />
      </View>
      {confirm === 'granted' ? (
        <Modal
          visible
          title="לרשום הסכמה לדיוור?"
          onClose={() => setConfirm(null)}
          footer={[
            <Button key="cancel" variant="secondary" block label="ביטול" onPress={() => setConfirm(null)} />,
            <Button key="ok" block label="אישור" loading={change.isPending} onPress={() => submit('granted')} />,
          ]}
        >
          {null}
        </Modal>
      ) : null}
      {confirm === 'revoked' ? (
        <Modal
          visible
          title="לבטל את ההסכמה לדיוור?"
          onClose={() => setConfirm(null)}
          footer={[
            <Button key="cancel" variant="secondary" block label="ביטול" onPress={() => setConfirm(null)} />,
            <Button
              key="revoke"
              variant="destructive"
              block
              label="ביטול הסכמה"
              loading={change.isPending}
              onPress={() => submit('revoked')}
            />,
          ]}
        >
          {null}
        </Modal>
      ) : null}
    </View>
  );
}
