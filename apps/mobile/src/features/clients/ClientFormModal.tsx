import * as Crypto from 'expo-crypto';
import { useState } from 'react';

import { ApiError } from '@/api/client';
import type { Client, ClientInput } from '@/api/clients';
import { Button, Field, Modal } from '@/ui';

import { conflictCurrent, useSaveClient } from './useClients';

type FieldName = 'name' | 'phone' | 'email' | 'instagram' | 'notes';
type Values = Record<FieldName, string>;

/** Inline Hebrew messages for the server's `validation_failed` fields (AC2). */
const FIELD_ERRORS: Record<FieldName, string> = {
  name: 'יש להזין שם, עד 100 תווים',
  phone: 'מספר טלפון לא תקין',
  email: 'כתובת אימייל לא תקינה',
  instagram: 'שם משתמש לא תקין: אותיות באנגלית, ספרות, נקודה וקו תחתון',
  notes: 'עד 2000 תווים',
};

function valuesOf(client: Client | null): Values {
  return {
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    instagram: client?.instagram ?? '',
    notes: client?.notes ?? '',
  };
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

export interface ClientFormModalProps {
  /** The client being edited; null = creating a new one. */
  client: Client | null;
  onClose: () => void;
}

/**
 * Create / edit a client (AC1–AC3) in the CalendarNewAppointment.html modal pattern: title + close,
 * five fields, footer "ביטול" / "שמירה". No mockup for the form itself; built from Modal and Field only.
 * Mount it fresh for each open (key it), so a new client gets one device UUID that retries reuse.
 */
export function ClientFormModal({ client, onClose }: ClientFormModalProps) {
  const [id] = useState(() => client?.id ?? Crypto.randomUUID());
  const [version, setVersion] = useState<number | undefined>(client?.version);
  const [values, setValues] = useState<Values>(() => valuesOf(client));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const save = useSaveClient();

  const set = (field: FieldName) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const onSave = async () => {
    const input: ClientInput = {
      name: values.name.trim(),
      phone: orNull(values.phone),
      email: orNull(values.email),
      instagram: orNull(values.instagram),
      notes: orNull(values.notes),
      ...(version === undefined ? {} : { version }),
    };
    try {
      await save.mutateAsync({ id, input });
      onClose();
    } catch (error) {
      // The hook already showed the conflict / offline toast; here the form reacts.
      const current = conflictCurrent(error);
      if (current) {
        setValues(valuesOf(current));
        setVersion(current.version);
        setErrors({});
        return;
      }
      if (error instanceof ApiError && error.code === 'validation_failed') {
        const fields = (error.details?.fields ?? {}) as Record<string, unknown>;
        const next: Partial<Record<FieldName, string>> = {};
        for (const field of Object.keys(FIELD_ERRORS) as FieldName[]) {
          if (field in fields) next[field] = FIELD_ERRORS[field];
        }
        setErrors(next);
      }
    }
  };

  return (
    <Modal
      visible
      title={client ? 'עריכת לקוח' : 'לקוח חדש'}
      onClose={onClose}
      // An array, not a fragment: Modal lays out each footer child side by side, and a fragment counts as one child.
      footer={[
        <Button key="cancel" variant="secondary" block label="ביטול" onPress={onClose} />,
        <Button
          key="save"
          block
          label="שמירה"
          loading={save.isPending}
          disabled={!values.name.trim()}
          onPress={() => void onSave()}
        />,
      ]}
    >
      <Field label="שם" value={values.name} onChangeText={set('name')} error={errors.name} maxLength={100} />
      <Field
        label="טלפון"
        value={values.phone}
        onChangeText={set('phone')}
        error={errors.phone}
        keyboardType="phone-pad"
      />
      <Field
        label="אימייל"
        value={values.email}
        onChangeText={set('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field
        label="אינסטגרם"
        value={values.instagram}
        onChangeText={set('instagram')}
        error={errors.instagram}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field label="הערות" value={values.notes} onChangeText={set('notes')} error={errors.notes} multiline maxLength={2000} />
    </Modal>
  );
}
