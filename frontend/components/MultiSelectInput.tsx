'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface MultiSelectInputProps {
  values: string[] | any;
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectInput({
  values: rawValues,
  onChange,
  suggestions,
  placeholder,
  disabled = false,
}: MultiSelectInputProps) {
  // Normalizar valores - asegurar que siempre sea un array
  const values = Array.isArray(rawValues)
    ? rawValues
    : rawValues?.values && Array.isArray(rawValues.values)
    ? rawValues.values
    : rawValues?.values && typeof rawValues.values === 'string'
    ? [rawValues.values]  // Si values es un string, convertirlo a array de un elemento
    : [];

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue('');
    }
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const filteredSuggestions =
    suggestions?.filter(
      (s) =>
        s.toLowerCase().includes(inputValue.toLowerCase()) &&
        !values.includes(s),
    ) || [];

  return (
    <div className="relative">
      {/* Tags seleccionados */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((value, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {value}
              {!disabled && (
                <button
                  onClick={() => removeValue(index)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      {!disabled && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addValue(inputValue);
                }
              }}
            />
            <button
              type="button"
              onClick={() => addValue(inputValue)}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Sugerencias desplegables */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors"
                  onMouseDown={() => addValue(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
