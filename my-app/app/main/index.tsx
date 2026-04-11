import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([
    { id: '1', title: '工作', count: 5 },
    { id: '2', title: '購物', count: 2 },
  ]);

  const addCategory = () => {
    // 這裡可以彈出一個 Alert.prompt 或導向新增頁面
    const newId = Date.now().toString();
    setCategories([...categories, { id: newId, title: '新分類', count: 0 }]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>我的清單</Text>
      
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.categoryItem}
            // 點擊整列進入該分類的詳細頁面
            onPress={() => router.push(`/list/${item.id}`)}
          >
            <View style={styles.leftSection}>
              <Ionicons name="list-circle" size={30} color="#007AFF" />
              <Text style={styles.categoryTitle}>{item.title}</Text>
            </View>
            
            {/* 右側僅作為計數顯示，不再觸發其他動作 */}
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{item.count}</Text>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* iPhone 風格的底部新增按鈕 */}
      <TouchableOpacity style={styles.addButton} onPress={addCategory}>
        <Ionicons name="add-circle" size={24} color="#007AFF" />
        <Text style={styles.addButtonText}>新增清單</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS 系統灰色背景
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 17,
    marginLeft: 10,
    fontWeight: '500',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: 17,
    color: '#8E8E93',
    marginRight: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 20,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 5,
  },
});