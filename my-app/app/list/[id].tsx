import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoListScreen() {
  // 確實取得 id 作為儲存時的辨識 Key
  const { id, title, color } = useLocalSearchParams<{ id: string; title: string; color: string }>();
  const [todos, setTodos] = useState<Todo[]>([]);
  
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  // 1. 畫面載入時，從 AsyncStorage 讀取資料
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const storedTodos = await AsyncStorage.getItem(`@todos_${id}`);
        if (storedTodos) {
          setTodos(JSON.parse(storedTodos));
        }
      } catch (e) {
        console.error('讀取 Todos 失敗', e);
      }
    };
    loadTodos();
  }, [id]);

  // 2. 自訂一個儲存與更新 state 的函數
  const saveAndSetTodos = async (newTodos: Todo[]) => {
    setTodos(newTodos);
    try {
      await AsyncStorage.setItem(`@todos_${id}`, JSON.stringify(newTodos));
    } catch (e) {
      console.error('儲存 Todos 失敗', e);
    }
  };

  const addTodo = () => {
    const newId = Date.now().toString();
    const newTodo = { id: newId, text: '', completed: false };
    
    // 使用新的儲存函數
    saveAndSetTodos([...todos, newTodo]);

    setTimeout(() => {
      if (inputRefs.current[newId]) {
        inputRefs.current[newId]?.focus();
      }
    }, 100); 
  };

  const toggleTodo = (todoId: string) => {
    const newTodos = todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    saveAndSetTodos(newTodos);
  };

  const deleteTodo = (todoId: string) => {
    const newTodos = todos.filter(t => t.id !== todoId);
    saveAndSetTodos(newTodos);
  };

  const updateTodoText = (todoId: string, newText: string) => {
    const newTodos = todos.map(t => t.id === todoId ? { ...t, text: newText } : t);
    saveAndSetTodos(newTodos);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: color }]}>{title}</Text>
      </View>

      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <TouchableOpacity onPress={() => toggleTodo(item.id)}>
              <Ionicons 
                name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
                size={24} 
                color={item.completed ? color : "#C7C7CC"} 
              />
            </TouchableOpacity>
            
            <TextInput 
              ref={(el) => {inputRefs.current[item.id] = el}}
              style={[styles.todoText, item.completed && styles.completedText]}
              value={item.text}
              placeholder="輸入內容..."
              onChangeText={(newText) => updateTodoText(item.id, newText)}
              onSubmitEditing={addTodo}
            />
            
            <TouchableOpacity onPress={() => deleteTodo(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Ionicons name="add-circle" size={60} color={color} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: 20 },
  title: { fontSize: 34, fontWeight: 'bold' },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  todoText: { flex: 1, marginLeft: 10, fontSize: 17 },
  completedText: { color: '#8E8E93', textDecorationLine: 'line-through' },
  inputContainer: { 
    padding: 20, 
    borderTopWidth: 0.5, 
    borderTopColor: '#E5E5EA',
    backgroundColor: 'white' 
  },
  addButton: { flexDirection: 'row', alignItems: 'center' },
  addText: { fontSize: 17, marginLeft: 10, fontWeight: '600' }
});