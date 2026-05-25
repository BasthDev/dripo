import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { InputField, Popup, Spacing } from '../ui';

type Props = {
  visible: boolean;
  productName: string;
  initialNote?: string;
  onClose: () => void;
  onSave: (note: string) => void;
};

export default function CartItemNotePopup({
  visible,
  productName,
  initialNote = '',
  onClose,
  onSave,
}: Props) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (visible) setNote(initialNote);
  }, [visible, initialNote]);

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      icon="create-outline"
      title="Item Note"
      description={`Add a note for "${productName}" (e.g. less ice, no sugar).`}
      dismissable
      actions={[
        {
          label: 'Save',
          variant: 'primary',
          icon: 'checkmark-outline',
          onPress: () => {
            onSave(note);
            onClose();
          },
        },
        {
          label: 'Clear note',
          variant: 'outline',
          onPress: () => {
            onSave('');
            onClose();
          },
        },
        { label: 'Cancel', variant: 'ghost', onPress: onClose },
      ]}
    >
      <View style={styles.field}>
        <InputField
          label="Note"
          placeholder="e.g. Less ice, extra shot..."
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  field: { width: '100%', marginTop: Spacing.sm },
});
