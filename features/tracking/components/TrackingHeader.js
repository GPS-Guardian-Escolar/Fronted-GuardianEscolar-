import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, IconButton, Surface, Text } from 'react-native-paper';
import { getInitials } from '../../../utils/studentStorage';

export default function TrackingHeader({ student, status, onRefresh, colors, t }) {
  return (
    <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
      <View style={styles.profile}>
        <Avatar.Text
          size={40}
          label={student ? getInitials(student.nombre) : '??'}
          backgroundColor={colors.primary}
          color={colors.textOnPrimary}
        />
        <View>
          <Text style={[styles.name, { color: colors.text }]}>
            {student?.nombre || t('trackSelectStudent')}
          </Text>
          <Text style={[styles.status, { color: colors.textSecondary }]}>
            {status}
          </Text>
        </View>
      </View>
      <IconButton
        icon="refresh"
        size={20}
        style={[styles.refresh, { backgroundColor: colors.surfaceSecondary }]}
        iconColor={colors.textSecondary}
        onPress={onRefresh}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 12,
  },
  refresh: {
    borderRadius: 8,
  },
});