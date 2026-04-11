import React, { useState, useRef } from 'react'; // 1. 引入 useRef
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoListScreen() {
  const { title, color } = useLocalSearchParams<{ title: string; color: string }>();
  const [todos, setTodos] = useState<Todo[]>([]);
  
  // 2. 建立一個 Ref 容器，用來存放所有的 TextInput 引用
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  const addTodo = () => {
    const newId = Date.now().toString();
    const newTodo = { id: newId, text: '', completed: false };
    
    setTodos([...todos, newTodo]);

    // 3. 重點：等 React 渲染完新項目後，讓該項目聚焦
    setTimeout(() => {
      if (inputRefs.current[newId]) {
        inputRefs.current[newId]?.focus();
      }
    }, 100); // 給予 100ms 的緩衝時間確保組件已掛載
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
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
              // 4. 將每個 TextInput 的引用存入 inputRefs 物件中
              ref={(el) => (inputRefs.current[item.id] = el)}
              style={[styles.todoText, item.completed && styles.completedText]}
              value={item.text}
              placeholder="輸入內容..."
              onChangeText={(newText) => {
                setTodos(todos.map(t => t.id === item.id ? { ...t, text: newText } : t));
              }}
              // 按下鍵盤完成時，可以自動新增下一行 (選配)
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