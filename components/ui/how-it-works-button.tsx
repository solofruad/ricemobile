import EditorActionButton from '@/app/monitoring/components/EditorActionButton';
import EditorPanel from '@/app/monitoring/components/EditorPanel';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Icon, IconButton } from 'react-native-paper';

type HowItWorksButtonProps = {
  onPress: () => void;
};

const COLOR = '#3d3b3a';

export default function HowItWorksButton({ onPress }: HowItWorksButtonProps) {
  return (
    // <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
              <EditorPanel flexDirection="row">
                <EditorActionButton icon="help" action={onPress} />
              </EditorPanel>
    // </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,

    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR,
    backgroundColor: 'rgba(255, 109, 63)',
  },
  label: {
    color: COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
});
