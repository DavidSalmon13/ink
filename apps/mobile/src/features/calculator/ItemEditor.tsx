import type { ReactNode } from 'react';
import { TextInput, View } from 'react-native';

import type { Settings } from '@/api/settings';
import {
  calibrationHint,
  estimateItemMinutes,
  type Detail,
  type DesignSource,
  type Shading,
  type Size,
} from '@/pricing';
import { componentMetrics as m, fontFace, Text, useTheme } from '@/theme';
import { Card, Chip, Chips, Field, IconButton, SegmentedControl, type Segment } from '@/ui';

import { PLACEMENTS, toQuoteItem, type ItemState } from './item';

const SIZES: readonly Segment<Size>[] = [
  { value: 'XS', label: 'XS', sublabel: 'עד 3 ס״מ' },
  { value: 'S', label: 'S', sublabel: '3–7' },
  { value: 'M', label: 'M', sublabel: '7–12' },
  { value: 'L', label: 'L', sublabel: '12–20' },
  { value: 'XL', label: 'XL', sublabel: '20+' },
];
const DETAILS: readonly Segment<Detail>[] = [
  { value: 'simple', label: 'פשוטה' },
  { value: 'medium', label: 'בינונית' },
  { value: 'high', label: 'גבוהה' },
];
const SHADINGS: readonly Segment<Shading>[] = [
  { value: 'none', label: 'ללא' },
  { value: 'light', label: 'עדינות' },
  { value: 'full', label: 'מלאות' },
];
const DESIGN_SOURCES: readonly Segment<DesignSource>[] = [
  { value: 'artist_sketch', label: 'סקיצה קיימת' },
  { value: 'client_reference', label: 'רפרנס לקוח' },
  { value: 'custom_design', label: 'עיצוב מותאם חדש' },
];

/** A `.field` label above a control that isn't a Field (segmented controls, the placement chips). */
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing.xs + 2 }}>
      <Text style={{ fontFamily: fontFace('600'), fontSize: m.field.labelFontSize, color: t.colors.textMuted }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export interface ItemEditorProps {
  item: ItemState;
  settings: Settings;
  /** Zero-based; shown as "קעקוע N". */
  index: number;
  onChange: (patch: Partial<ItemState>) => void;
  /** Omitted when a single item can't be removed. */
  onRemove?: () => void;
}

/**
 * One tattoo card (Calculator.html `.item`): size / detail / shading / design-source segmented controls,
 * placement chips, the "שעות עיצוב" field (only for עיצוב מותאם חדש), and the "זמן משוער" field prefilled
 * with the live estimate — editable to set the override — with the "דומה:" hint beside it. Every control
 * recomputes the estimate live. Controlled: changes are reported via `onChange`.
 */
export function ItemEditor({ item, settings, index, onChange, onRemove }: ItemEditorProps) {
  const t = useTheme();
  const c = t.colors;

  const estimate = estimateItemMinutes(toQuoteItem(item), settings.estimateTables);
  const hint = calibrationHint(estimate, settings.calibrationPoints);
  const minutesValue = item.minutesOverride ?? String(estimate);
  const designRate = Math.round(settings.designHourlyRateAgorot / 100);

  return (
    <Card style={{ padding: 14, gap: t.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
        <Text variant="headline" color="textMuted">{`קעקוע ${index + 1} · `}</Text>
        <TextInput
          value={item.description}
          onChangeText={(description) => onChange({ description })}
          placeholder="תיאור הקעקוע"
          placeholderTextColor={c.textMuted}
          accessibilityLabel={`תיאור קעקוע ${index + 1}`}
          style={{ flex: 1, ...t.text.headline, color: c.text, writingDirection: 'rtl', padding: 0 }}
        />
        {onRemove ? <IconButton icon="trash" accessibilityLabel="הסרת הקעקוע" onPress={onRemove} /> : null}
      </View>

      <Labeled label="גודל">
        <SegmentedControl accessibilityLabel="גודל" segments={SIZES} value={item.size} onChange={(size) => onChange({ size })} />
      </Labeled>
      <Labeled label="רמת פירוט">
        <SegmentedControl
          accessibilityLabel="רמת פירוט"
          segments={DETAILS}
          value={item.detail}
          onChange={(detail) => onChange({ detail })}
        />
      </Labeled>
      <Labeled label="הצללות">
        <SegmentedControl
          accessibilityLabel="הצללות"
          segments={SHADINGS}
          value={item.shading}
          onChange={(shading) => onChange({ shading })}
        />
      </Labeled>
      <Labeled label="מיקום בגוף">
        <Chips accessibilityLabel="מיקום בגוף">
          {PLACEMENTS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={item.placement === p.id}
              onPress={() => onChange({ placement: p.id })}
            />
          ))}
        </Chips>
      </Labeled>
      <Labeled label="מקור הסקיצה">
        <SegmentedControl
          accessibilityLabel="מקור הסקיצה"
          segments={DESIGN_SOURCES}
          value={item.designSource}
          onChange={(designSource) => onChange({ designSource })}
        />
      </Labeled>

      {item.designSource === 'custom_design' ? (
        <Field
          label="שעות עיצוב"
          value={item.designHours}
          onChangeText={(designHours) => onChange({ designHours })}
          keyboardType="decimal-pad"
          ltr
          unit={`שעות × ${designRate} ₪`}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: t.spacing.md, alignItems: 'flex-start' }}>
        <Field
          label="זמן משוער"
          value={minutesValue}
          // Keep whatever is typed, including "" — don't coerce empty back to null, or the field would
          // snap to the estimate the moment it's cleared and could never be emptied. An empty field reads
          // as "use the estimate" (the placeholder shows it, and toQuoteItem falls back to it for pricing).
          onChangeText={(text) => onChange({ minutesOverride: text })}
          placeholder={String(estimate)}
          keyboardType="number-pad"
          ltr
          unit="דק׳"
          style={{ width: 132 }}
        />
        <View style={{ flex: 1, paddingTop: 24, gap: 2 }}>
          <Text variant="callout" color="textMuted">
            {hint}
          </Text>
          <Text variant="callout" color="textMuted">
            אפשר לערוך ידנית
          </Text>
        </View>
      </View>
    </Card>
  );
}
