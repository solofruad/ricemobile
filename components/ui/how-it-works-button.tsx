import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';

type HowItWorksButtonProps = {
  onPress: () => void;
};

const COLOR = '#ff6d3f';

export default function HowItWorksButton({ onPress }: HowItWorksButtonProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Icon source="help-circle-outline" size={18} color={COLOR} />
      <Text style={styles.label}>¿Cómo funciona?</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR,
    backgroundColor: 'rgba(255, 109, 63, 0.08)',
  },
  label: {
    color: COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
});
