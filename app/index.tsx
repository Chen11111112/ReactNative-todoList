import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [searchQuery, setSearchQuery] = useState(''); // 搜尋狀態

  
  // 總計資料狀態
  const [stats, setStats] = useState({
    today: 0,
    scheduled: 0,
    all: 0,
    flagged: 0,
    completed: 0,
  });
  
  // Modal 相關狀態
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempColor, setTempColor] = useState(LIST_COLORS[0]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    try {
      const storedCats = await AsyncStorage.getItem('@categories');
      let parsedCats: Category[] = storedCats ? JSON.parse(storedCats) : [];

      let totalAll = 0;
      let totalCompleted = 0;
      let totalToday = 0;
      let totalScheduled = 0;
      const todayStr = new Date().toISOString().split('T')[0];

      // 動態讀取每個分類底下的 todo 數量
      const updatedCats = await Promise.all(parsedCats.map(async (cat) => {
        const storedTodos = await AsyncStorage.getItem(`@todos_${cat.id}`);
        const todos = storedTodos ? JSON.parse(storedTodos) : [];
        
        // 重新計算總計數據
        todos.forEach((t: any) => {
          totalAll++;
          if (t.completed) {
            totalCompleted++;
          } else {
            // 未完成的項目才計入「今天」和「已排程」
            if (t.date === todayStr) totalToday++;
            if (t.date) totalScheduled++; 
          }
        });

        // 清單旁邊的數字只顯示「未完成」的數量
        return { ...cat, count: todos.filter((t: any) => !t.completed).length }; 
      }));

      setCategories(updatedCats);
      setStats({
        today: totalToday,
        scheduled: totalScheduled,
        all: totalAll,
        flagged: 0,       
        completed: totalCompleted,
      });

    } catch (e) {
      console.error('讀取失敗', e);
    }
  };

  // 實作搜尋過濾
  const filteredCategories = categories.filter(cat =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      newCategories = newCategories.map(cat => 
        cat.id === editingId ? { ...cat, title: tempTitle, color: tempColor } : cat
      );
    } else {
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
      setSearchQuery(''); // 儲存後清空搜尋
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
          await AsyncStorage.removeItem(`@todos_${id}`);
          setCategories(newCategories);
          loadCategories(); // 重新計算總數
        }
      }
    ]);
  };

  // 渲染上方預設分類卡片的區塊
  const renderListHeader = () => (
    <View style={styles.topSection}>
      <View style={styles.gridRow}>
        <TouchableOpacity 
          style={[styles.dashboardCard, { backgroundColor: '#007AFF', marginRight: 15 }]}
          onPress={() => router.push({ pathname: '/filter/[type]', params: { type: 'today', title: '今天', color: '#007AFF' } })}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            </View>
            <Text style={styles.cardCount}>{stats.today}</Text>
          </View>
          <Text style={styles.cardTitle}>今天</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dashboardCard, { backgroundColor: '#FF3B30' }]}
          onPress={() => router.push({ pathname: '/filter/[type]', params: { type: 'scheduled', title: '已排程', color: '#FF3B30' } })}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar" size={24} color="#FF3B30" />
            </View>
            <Text style={styles.cardCount}>{stats.scheduled}</Text>
          </View>
          <Text style={styles.cardTitle}>已排程</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity 
          style={[styles.dashboardCard, { backgroundColor: '#48484A', marginRight: 15 }]}
          onPress={() => router.push({ pathname: '/filter/[type]', params: { type: 'all', title: '全部', color: '#48484A' } })}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconContainer}>
              {/* 這裡已修正為正確的 icon 名稱 */}
              <Ionicons name="file-tray-outline" size={24} color="#48484A" />
            </View>
            <Text style={styles.cardCount}>{stats.all}</Text>
          </View>
          <Text style={styles.cardTitle}>全部</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dashboardCard, { backgroundColor: '#8E8E93'}]}
          onPress={() => router.push({ pathname: '/filter/[type]', params: { type: 'completed', title: '已完成', color: '#8E8E93' } })}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark" size={24} color="#8E8E93" />
            </View>
            <Text style={styles.cardCount}>{stats.completed}</Text>
          </View>
          <Text style={styles.cardTitle}>已完成</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        
      </View>

      <Text style={styles.header}>我的列表</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>我的列表</Text>

      {/* 搜尋欄 */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color="#8E8E93" />
        <TextInput
          style={styles.searchBarInput}
          placeholder="搜尋清單"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* <FlatList
        data={filteredCategories} */}
      <FlatList
        ListHeaderComponent={renderListHeader}
        data={categories}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // 預留底部按鈕空間
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryItem}
            onPress={() =>
              router.push({
                pathname: "/list/[id]", 
                params: { id: item.id, title: item.title, color: item.color } 
              })
            }
            onLongPress={() => openModal(item)}
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

      {/* Modal 保持不變 */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <div style={styles.modalContent as any}>
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
          </div>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingHorizontal: 20 },
  header: { fontSize: 34, fontWeight: 'bold', marginTop: 60, marginBottom: 10 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 20,
  },
  searchBarInput: { flex: 1, marginLeft: 8, fontSize: 17 },
  
  // Dashboard 區塊樣式
  topSection: { marginTop: 60 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  dashboardCard: { flex: 1, borderRadius: 12, padding: 12, height: 90, justifyContent: 'space-between' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconContainer: { backgroundColor: 'white', borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  cardCount: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: 'white' },

  // header: { fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 15, color: '#000' },
  categoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 10 },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  categoryTitle: { fontSize: 17, marginLeft: 10, fontWeight: '500' },
  countBadge: { flexDirection: 'row', alignItems: 'center' },
  countText: { fontSize: 17, color: '#8E8E93', marginRight: 5 },
  addButton: { flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: 40, left: 20 },
  addButtonText: { color: '#007AFF', fontSize: 17, fontWeight: '600', marginLeft: 5 },
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