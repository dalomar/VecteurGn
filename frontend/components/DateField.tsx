import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';

interface DateFieldProps {
  value: string; // "yyyy-MM-dd"
  onChange: (isoDate: string) => void;
}

export default function DateField({ value, onChange }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={styles.text}>{format(parseISO(value), 'dd/MM/yyyy')}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={parseISO(value)}
          mode="date"
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              onChange(format(selectedDate, 'yyyy-MM-dd'));
            }
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#2B313A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3A404A',
  },
  text: {
    fontSize: 16,
    color: '#fff',
  },
});
