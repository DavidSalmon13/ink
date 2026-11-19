import { Text } from '@/theme';
import { Button, Modal } from '@/ui';

export interface MoreActionsSheetProps {
  onDelete: () => void;
  onClose: () => void;
}

/** "עוד פעולות" (AC7): for now only "מחיקת לקוח". No mockup: design-system modal and buttons only. */
export function MoreActionsSheet({ onDelete, onClose }: MoreActionsSheetProps) {
  return (
    <Modal visible title="עוד פעולות" onClose={onClose}>
      <Button block variant="secondary" icon="trash" label="מחיקת לקוח" onPress={onDelete} />
    </Modal>
  );
}

export interface DeleteClientDialogProps {
  name: string;
  /** The DELETE is in flight. */
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "למחוק את <name>?" (AC7) with "ביטול" / "מחיקה" (destructive). Built on the `src/ui` Modal, not `Alert`,
 * which does nothing on web. No mockup: Aya approves it from a screenshot (T12).
 */
export function DeleteClientDialog({ name, deleting, onConfirm, onCancel }: DeleteClientDialogProps) {
  return (
    <Modal
      visible
      title={`למחוק את ${name}?`}
      onClose={onCancel}
      footer={[
        <Button key="cancel" variant="secondary" block label="ביטול" onPress={onCancel} />,
        <Button key="delete" variant="destructive" block label="מחיקה" loading={deleting} onPress={onConfirm} />,
      ]}
    >
      <Text>הלקוח יוסר מהרשימה ומהחיפוש.</Text>
    </Modal>
  );
}
