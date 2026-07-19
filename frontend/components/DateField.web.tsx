import React from 'react';

interface DateFieldProps {
  value: string; // "yyyy-MM-dd"
  onChange: (isoDate: string) => void;
}

export default function DateField({ value, onChange }: DateFieldProps) {
  return (
    <input
      type="date"
      value={value}
      max={new Date().toISOString().slice(0, 10)}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: '#2B313A',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#fff',
        border: '1px solid #3A404A',
        width: '100%',
        boxSizing: 'border-box',
        colorScheme: 'dark',
        fontFamily: 'inherit',
      }}
    />
  );
}
