/**
 * Modal — bottom-sheet con backdrop. Para diálogos modales (Review,
 * pickers, confirmaciones). Tap fuera o tap en X cierra.
 */

import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Si true, el contenido scrollea internamente. Default true. */
  scroll?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  scroll = true,
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <Pressable
          onPress={onClose}
          className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%]">
              {title ? (
                <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Text className="text-base font-semibold text-slate-800 dark:text-white">
                    {title}
                  </Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={8}
                    className="w-8 h-8 rounded-full items-center justify-center">
                    <X size={18} color="#475569" />
                  </Pressable>
                </View>
              ) : null}
              {scroll ? (
                <ScrollView className="max-h-[60vh]" keyboardShouldPersistTaps="handled">
                  <View className="px-5 py-4">{children}</View>
                </ScrollView>
              ) : (
                <View className="px-5 py-4">{children}</View>
              )}
              {footer ? (
                <View className="px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                  {footer}
                </View>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
