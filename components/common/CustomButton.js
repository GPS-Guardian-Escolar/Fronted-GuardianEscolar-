import AppButton from '../ui/AppButton'

export default function CustomButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  mode = 'contained',
  style,
}) {
  const variant = mode === 'outlined' ? 'secondary' : mode === 'text' ? 'ghost' : 'primary'

  return (
    <AppButton
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      variant={variant}
      style={style}
    />
  )
}
