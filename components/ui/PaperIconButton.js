import { forwardRef } from 'react';
import { IconButton } from 'react-native-paper';
import { AppRadius } from '../../theme/tokens';

const PaperIconButton = forwardRef(function PaperIconButton({ style, ...props }, ref) {
  return <IconButton {...props} ref={ref} style={[style, { borderRadius: AppRadius.button }]} />;
});

export default PaperIconButton;
