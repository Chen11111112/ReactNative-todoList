import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 預設提供選擇的顏色
const LIST_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D55'];

interface Category {
  id: string;
  title: string;
  color: string;
  count: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Modal 相關狀態
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempColor, setTempColor] = useState(LIST_COLORS[0]);

  // 每次畫面進入焦點時，重新讀取分類與動態計算數量
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    try {
      const storedCats = await AsyncStorage.getItem('@categories');
      let parsedCats: Category[] = storedCats ? JSON.parse(storedCats) : [];

      // 動態讀取每個分類底下的 todo 數量
      const updatedCats = await Promise.all(parsedCats.map(async (cat) => {
        const storedTodos = await AsyncStorage.getItem(`@todos_${cat.id}`);
        const todos = storedTodos ? JSON.parse(storedTodos) : [];
        return { ...cat, count: todos.length };
      }));

      setCategories(updatedCats);
    } catch (e) {
      console.error('讀取失敗', e);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingId(category.id);
      setTempTitle(category.title);
      setTempColor(category.color || LIST_COLORS[0]);
    } else {
      setEditingId(null);
      setTempTitle('');
      setTempColor(LIST_COLORS[0]);
    }
    setModalVisible(true);
  };

  const saveCategory = async () => {
    if (!tempTitle.trim()) {
      Alert.alert('提示', '請輸入清單名稱');
      return;
    }

    let newCategories = [...categories];

    if (editingId) {
      // 編輯模式
      newCategories = newCategories.map(cat => 
        cat.id === editingId ? { ...cat, title: tempTitle, color: tempColor } : cat
      );
    } else {
      // 新增模式
      const newCategory = {
        id: Date.now().toString(),
        title: tempTitle,
        color: tempColor,
        count: 0
      };
      newCategories.push(newCategory);
    }

    try {
      await AsyncStorage.setItem('@categories', JSON.stringify(newCategories));
      setCategories(newCategories);
      setModalVisible(false);
    } catch (e) {
      console.error('儲存失敗', e);
    }
  };

  const deleteCategory = async (id: string) => {
    Alert.alert('刪除清單', '確定要刪除這個清單及裡面所有的項目嗎？', [
      { text: '取消', style: 'cancel' },
      { 
        text: '刪除', 
        style: 'destructive',
        onPress: async () => {
          const newCategories = categories.filter(cat => cat.id !== id);
          await AsyncStorage.setItem('@categories', JSON.stringify(newCategories));
          await AsyncStorage.removeItem(`@todos_${id}`); // 同時刪除該清單下的 todos
          setCategories(newCategories);
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>我的列表</Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryItem}
            onPress={() =>
              router.push({
                pathname: "/list/[id]", 
                params: { id: item.id, title: item.title, color: item.color } 
              })
            }
            onLongPress={() => openModal(item)} // 長按觸發編輯
          >
            <View style={styles.leftSection}>
              <Ionicons name="list-circle" size={30} color={item.color || "#007AFF"} />
              <Text style={styles.categoryTitle}>{item.title}</Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>{item.count}</Text>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
        <Ionicons name="add-circle" size={24} color="#007AFF" />
        <Text style={styles.addButtonText}>新增列表</Text>
      </TouchableOpacity>

      {/* 彈跳視窗 Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? '編輯清單' : '新增清單'}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="清單名稱"
              value={tempTitle}
              onChangeText={setTempTitle}
              autoFocus
            />

            <View style={styles.colorPicker}>
              {LIST_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorCircle, { backgroundColor: color }, tempColor === color && styles.colorSelected]}
                  onPress={() => setTempColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              {editingId && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => { setModalVisible(false); deleteCategory(editingId); }}>
                  <Text style={styles.deleteButtonText}>刪除</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveCategory}>
                <Text style={styles.saveButtonText}>儲存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingHorizontal: 20 },
  header: { fontSize: 34, fontWeight: 'bold', marginTop: 60, marginBottom: 20 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 10 },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  categoryTitle: { fontSize: 17, marginLeft: 10, fontWeight: '500' },
  countBadge: { flexDirection: 'row', alignItems: 'center' },
  countText: { fontSize: 17, color: '#8E8E93', marginRight: 5 },
  addButton: { flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: 40, left: 20 },
  addButtonText: { color: '#007AFF', fontSize: 17, fontWeight: '600', marginLeft: 5 },
  
  // Modal 樣式
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 14, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  modalInput: { width: '100%', backgroundColor: '#F2F2F7', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 20 },
  colorPicker: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  colorCircle: { width: 30, height: 30, borderRadius: 15, opacity: 0.5 },
  colorSelected: { opacity: 1, borderWidth: 3, borderColor: '#E5E5EA' },
  modalActions: { flexDirection: 'row', width: '100%', marginTop: 10 },
  cancelButton: { padding: 10, marginRight: 10 },
  cancelButtonText: { fontSize: 16, color: '#007AFF' },
  saveButton: { padding: 10 },
  saveButtonText: { fontSize: 16, color: '#007AFF', fontWeight: 'bold' },
  deleteButton: { padding: 10 },
  deleteButtonText: { fontSize: 16, color: '#FF3B30' },
});