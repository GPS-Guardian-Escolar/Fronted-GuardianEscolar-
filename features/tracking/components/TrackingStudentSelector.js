import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { getInitials } from '../../../utils/studentStorage';
import { COLORS } from '../../../constants/colors';

export default function TrackingStudentSelector({ students, selectedStudent, onSelect, colors }) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {students.map((student) => {
          const selected = selectedStudent?.id === student.id;
          return (
            <TouchableOpacity
              key={student.id}
              onPress={() => onSelect(student)}
              style={[
                styles.item,
                { backgroundColor: colors.surface },
                selected && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              <Avatar.Text
                size={42}
                label={getInitials(student.nombre)}
                backgroundColor={COLORS.PRIMARIO}
                color={COLORS.TEXTO_CONTRASTE}
              />
              <Text
                style={[
                  styles.label,
                  { color: selected ? colors.primary : colors.textSecondary },
                  selected && styles.selectedLabel,
                ]}
                numberOfLines={1}
              >
                {student.nombre.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scroll: {
    gap: 12,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 12,
    width: 75,
    elevation: 1,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
  selectedLabel: {
    fontWeight: 'bold',
  },
});
