import { forwardRef } from 'react';
import { Button } from 'react-native-paper';
import { AppRadius } from '../../theme/tokens';

// Preserve Paper behavior while giving every text button the same shape.
const PaperButton = forwardRef(function PaperButton({ style, ...props }, ref) {
  return <Button {...props} ref={ref} style={[style, { borderRadius: AppRadius.button }]} />;
});

export default PaperButton;
