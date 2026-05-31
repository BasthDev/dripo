import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import Popup from '../components/ui/Popup';
import { Colors } from '../components/ui/theme';

type PopupAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
};

type PopupState = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  actions: PopupAction[];
};

type MessageOpts = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onConfirm: () => void;
};

export function useAppPopup() {
  const [popup, setPopup] = useState<PopupState | null>(null);

  const closePopup = useCallback(() => setPopup(null), []);

  const showMessage = useCallback(
    (opts: MessageOpts) => {
      setPopup({
        title: opts.title,
        description: opts.description,
        icon: opts.icon ?? 'checkmark-circle-outline',
        iconColor: opts.iconColor ?? Colors.success,
        actions: [
          {
            label: 'OK',
            variant: 'primary',
            onPress: closePopup,
          },
        ],
      });
    },
    [closePopup]
  );

  const showConfirm = useCallback(
    (opts: ConfirmOpts) => {
      setPopup({
        title: opts.title,
        description: opts.description,
        icon: opts.icon ?? (opts.destructive ? 'warning-outline' : 'help-circle-outline'),
        iconColor: opts.iconColor ?? (opts.destructive ? Colors.error : Colors.warning),
        actions: [
          {
            label: opts.cancelLabel ?? 'Cancel',
            variant: 'outline',
            onPress: closePopup,
          },
          {
            label: opts.confirmLabel ?? 'Confirm',
            variant: opts.destructive ? 'danger' : 'primary',
            onPress: () => {
              closePopup();
              opts.onConfirm();
            },
          },
        ],
      });
    },
    [closePopup]
  );

  const AppPopup = useMemo(
    () =>
      function AppPopupComponent() {
        return (
          <Popup
            visible={!!popup}
            onClose={closePopup}
            title={popup?.title}
            description={popup?.description}
            icon={popup?.icon}
            iconColor={popup?.iconColor}
            actions={popup?.actions ?? []}
            actionsLayout="row"
            dismissable
          />
        );
      },
    [popup, closePopup]
  );

  return { showMessage, showConfirm, closePopup, AppPopup };
}
