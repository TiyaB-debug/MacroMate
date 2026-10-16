import { ReactNode, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type } from '@/theme';

// ---------- Button ----------

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'light' | 'danger';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** primary = dark green, soft = muted green ("Get Started"), light = white pill ("Log Out") */
export function Button({ title, onPress, variant = 'primary', disabled, icon }: ButtonProps) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
      <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: colors.textOnPrimary },
  soft: { bg: '#7FAE76', fg: colors.textOnPrimary },
  light: { bg: colors.surface, fg: colors.text },
  danger: { bg: colors.surface, fg: colors.danger },
};

// ---------- Field label ----------

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

// ---------- Text input ----------

type TextFieldProps = TextInputProps & { suffix?: string; icon?: keyof typeof Ionicons.glyphMap };

export function TextField({ suffix, icon, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.input}>
      <TextInput placeholderTextColor={colors.textMuted} style={[styles.inputText, style]} {...rest} />
      {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      {icon ? <Ionicons name={icon} size={18} color={colors.text} /> : null}
    </View>
  );
}

// ---------- Select (dropdown) ----------

type SelectProps<T extends string | number> = {
  value: T | '';
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

/** Dropdown that opens a bottom sheet of options. */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select',
  accessibilityLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        style={styles.input}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={[styles.inputText, !selected && { color: colors.textMuted }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.text} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <FlatList
            data={options}
            keyExtractor={(o) => String(o.value)}
            initialScrollIndex={Math.max(0, options.findIndex((o) => o.value === value))}
            getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, item.value === value && { fontWeight: '700' }]}>{item.label}</Text>
                {item.value === value ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

// ---------- Checkbox ----------

export function Checkbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <Pressable
      style={styles.choiceRow}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={colors.surface} /> : null}
      </View>
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

/**
 * List of checkboxes where one option (e.g. "None" / "No preference")
 * clears the others, and picking anything else clears it.
 */
export function CheckboxGroup({
  options,
  selected,
  onChange,
  exclusive,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  exclusive?: string;
}) {
  const toggle = (opt: string) => {
    if (opt === exclusive) return onChange([opt]);
    const without = selected.filter((s) => s !== opt && s !== exclusive);
    const next = selected.includes(opt) ? without : [...without, opt];
    onChange(next.length ? next : exclusive ? [exclusive] : []);
  };
  return (
    <View style={{ gap: spacing.xs }}>
      {options.map((o) => (
        <Checkbox key={o} label={o} checked={selected.includes(o)} onToggle={() => toggle(o)} />
      ))}
    </View>
  );
}

// ---------- Radio ----------

export function RadioOption({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.choiceRow} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View style={styles.radio}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceText}>{label}</Text>
        {description ? <Text style={styles.choiceDesc}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

// ---------- Toggle ----------

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#8DA889', true: colors.text }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  label: { ...type.body, color: colors.text, marginBottom: spacing.sm },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  inputText: { flex: 1, ...type.body, color: colors.text, paddingVertical: spacing.md },
  suffix: { ...type.body, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    maxHeight: '50%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  option: {
    height: 48,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { ...type.body, color: colors.text },
  choiceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.text,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: colors.text },
  choiceText: { ...type.body, color: colors.text },
  choiceDesc: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.text,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md },
  toggleLabel: { ...type.body, color: colors.text },
});
