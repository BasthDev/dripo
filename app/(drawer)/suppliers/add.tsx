import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Colors, Header, InputField, Spacing } from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';

export default function AddSupplierScreen() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const suppliers = usePosStore(s => s.suppliers);
  const addSupplier = usePosStore(s => s.addSupplier);
  const updateSupplier = usePosStore(s => s.updateSupplier);
  const deleteSupplier = usePosStore(s => s.deleteSupplier);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!id) return;
    const s = suppliers.find(x => x.id === id);
    if (s) {
      setName(s.name);
      setPhone(s.phone ?? '');
      setEmail(s.email ?? '');
      setAddress(s.address ?? '');
      setNote(s.note ?? '');
    }
  }, [id, suppliers]);

  const save = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      note: note.trim() || undefined,
    };
    if (id) updateSupplier(id, payload);
    else addSupplier(payload);
    router.back();
  };

  const remove = () => {
    if (!id) return;
    showConfirm({
      title: 'Delete supplier',
      description: 'Remove this supplier?',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        const ok = deleteSupplier(id);
        if (ok) router.back();
        else {
          showMessage({
            title: 'Cannot delete',
            description: 'Linked to purchase orders or stock-in documents.',
            icon: 'alert-circle-outline',
            iconColor: Colors.error,
          });
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header title={id ? 'Edit supplier' : 'New supplier'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <InputField label="Name" value={name} onChangeText={setName} placeholder="Supplier name" />
        <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="Optional" />
        <InputField label="Email" value={email} onChangeText={setEmail} placeholder="Optional" />
        <InputField label="Address" value={address} onChangeText={setAddress} placeholder="Optional" multiline />
        <InputField label="Note" value={note} onChangeText={setNote} placeholder="Optional" multiline />
        <Button label="Save" variant="primary" onPress={save} disabled={!name.trim()} />
        {id ? <Button label="Delete supplier" variant="danger" onPress={remove} /> : null}
      </ScrollView>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
});
