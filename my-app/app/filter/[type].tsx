import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SectionList, FlatList, TouchableOpacity, 
  KeyboardAvoidingView, Platform, TextInput, Modal, Alert, Switch, ScrollView 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker'; // 引入日期套件

interface SmartTodo {
  id: string;
  text: string;
  notes?: string;
  completed: boolean;
  categoryId: string;
  categoryTitle: string;
  date?: string; 
  time?: string; 
}

export default function FilterListScreen() {
  const router = useRouter();
  const { type, title, color } = useLocalSearchParams<{ type: string; title: string; color: string }>();
  
  const [todos, setTodos] = useState<SmartTodo[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [isQuickAddVisible, setQuickAddVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);

  const [draftText, setDraftText] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  
  // 日期與時間狀態
  const [hasDate, setHasDate] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  const getTodayString = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      const storedCats = await AsyncStorage.getItem('@categories');
      const parsedCats = storedCats ? JSON.parse(storedCats) : [];
      setCategories(parsedCats);

      let allTodos: SmartTodo[] = [];
      for (const cat of parsedCats) {
        const storedTodos = await AsyncStorage.getItem(`@todos_${cat.id}`);
        if (storedTodos) {
          const parsedTodos = JSON.parse(storedTodos);
          const todosWithCategory = parsedTodos.map((t: any) => ({
            ...t,
            categoryId: cat.id,
            categoryTitle: cat.title,
          }));
          allTodos = [...allTodos, ...todosWithCategory];
        }
      }
      setTodos(allTodos);
    } catch (e) {
      console.error('讀取失敗', e);
    }
  };

  const toggleTodo = async (todoId: string, categoryId: string) => {
    const newTodos = todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    setTodos(newTodos);

    try {
      const storedTodos = await AsyncStorage.getItem(`@todos_${categoryId}`);
      if (storedTodos) {
        const targetListTodos = JSON.parse(storedTodos);
        const updatedListTodos = targetListTodos.map((t: any) => 
          t.id === todoId ? { ...t, completed: !t.completed } : t
        );
        await AsyncStorage.setItem(`@todos_${categoryId}`, JSON.stringify(updatedListTodos));
      }
    } catch (e) {
      console.error('更新失敗', e);
    }
  };

  const openDetailModal = () => {
    setQuickAddVisible(false);
    setDateObj(new Date()); // 重置為現在時間
    setDetailModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!draftText.trim()) {
      setQuickAddVisible(false);
      setDetailModalVisible(false);
      return;
    }
    if (categories.length === 0) {
      Alert.alert('提示', '請先在首頁建立至少一個清單！');
      return;
    }

    const defaultCategory = categories[0]; 
    const finalDate = hasDate ? dateObj.toISOString().split('T')[0] : (type === 'today' ? getTodayString() : undefined);
    const finalTime = hasTime ? `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}` : undefined;

    const newTodo: SmartTodo = { 
      id: Date.now().toString(), 
      text: draftText, 
      notes: draftNotes,
      completed: false,
      categoryId: defaultCategory.id,
      categoryTitle: defaultCategory.title,
      date: finalDate,
      time: finalTime
    };

    try {
      const storedTodos = await AsyncStorage.getItem(`@todos_${defaultCategory.id}`);
      const targetListTodos = storedTodos ? JSON.parse(storedTodos) : [];
      targetListTodos.push(newTodo);
      await AsyncStorage.setItem(`@todos_${defaultCategory.id}`, JSON.stringify(targetListTodos));

      setTodos([...todos, newTodo]);
      
      setDraftText('');
      setDraftNotes('');
      setHasDate(false);
      setHasTime(false);
      setQuickAddVisible(false);
      setDetailModalVisible(false);
    } catch (e) {
      console.error('新增失敗', e);
    }
  };

  // ----------------- 渲染區塊 -----------------

  const renderTodoItem = ({ item }: { item: SmartTodo }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity onPress={() => toggleTodo(item.id, item.categoryId)}>
        <Ionicons name={item.completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={item.completed ? color : "#C7C7CC"} />
      </TouchableOpacity>
      <View style={styles.textContainer}>
        <Text style={[styles.todoText, item.completed && styles.completedText]}>{item.text}</Text>
        <Text style={styles.categoryLabel}>
          {item.categoryTitle} {item.date && type !== 'today' ? item.date : ''} {item.time ? item.time : ''}
        </Text>
        {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
      </View>
    </View>
  );

  const renderTodayView = () => {
    const todayStr = getTodayString();
    const todayTodos = todos.filter(t => t.date === todayStr && !t.completed);

    const morning: SmartTodo[] = [];
    const afternoon: SmartTodo[] = [];
    const evening: SmartTodo[] = [];

    todayTodos.forEach(t => {
      if (!t.time) { morning.push(t); } 
      else {
        const hour = parseInt(t.time.split(':')[0], 10);
        if (hour < 12) morning.push(t);
        else if (hour < 18) afternoon.push(t);
        else evening.push(t);
      }
    });

    const sections = [];
    if (morning.length > 0) sections.push({ title: '早上', data: morning });
    if (afternoon.length > 0) sections.push({ title: '下午', data: afternoon });
    if (evening.length > 0) sections.push({ title: '晚上', data: evening });

    return (
      <View style={{ flex: 1 }}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderTodoItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{section.title}</Text></View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
        {todayTodos.length === 0 && <View style={styles.emptyContainer}><Text style={styles.emptyText}>沒有提醒事項</Text></View>}
        <TouchableOpacity style={[styles.fab, { backgroundColor: color || '#007AFF' }]} onPress={() => setQuickAddVisible(true)}>
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderScheduledView = () => {
    const scheduledTodos = todos.filter(t => t.date && !t.completed);
    const groups: { [key: string]: SmartTodo[] } = {};
    
    scheduledTodos.forEach(t => {
      if (t.date) {
        if (!groups[t.date]) groups[t.date] = [];
        groups[t.date].push(t);
      }
    });

    const sections = Object.keys(groups).sort().map(date => ({
      title: date === getTodayString() ? '今天' : date,
      data: groups[date],
      isToday: date === getTodayString()
    }));

    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderTodoItem}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, section.isToday && styles.sectionHeaderToday]}>
            <Text style={[styles.sectionTitle, section.isToday ? { color: '#000', fontSize: 22, fontWeight: 'bold' } : {}]}>{section.title}</Text>
          </View>
        )}
      />
    );
  };

  // 補回「全部」與「已完成」的列表渲染
  const renderDefaultView = () => {
    let displayTodos = todos;
    if (type === 'completed') displayTodos = todos.filter(t => t.completed);

    return (
      <FlatList
        data={displayTodos}
        keyExtractor={item => item.id}
        renderItem={renderTodoItem}
        contentContainerStyle={{ paddingBottom: 50, paddingTop: 10 }}
        ListEmptyComponent={<View style={{marginTop: 100, alignItems: 'center'}}><Text style={styles.emptyText}>沒有項目</Text></View>}
      />
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.navBar}>
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: color }]}>{title}</Text>
      </View>

      {/* 根據不同 type 渲染不同的列表 */}
      {type === 'today' ? renderTodayView() : null}
      {type === 'scheduled' ? renderScheduledView() : null}
      {(type === 'all' || type === 'completed' || type === 'flagged') ? renderDefaultView() : null}

      {/* 快速新增 */}
      <Modal visible={isQuickAddVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.quickAddOverlay}>
          <View style={styles.quickAddContent}>
            <TouchableOpacity style={styles.quickAddCircle}>
               <Ionicons name="ellipse-outline" size={24} color="#C7C7CC" />
            </TouchableOpacity>
            <TextInput
              style={styles.quickAddInput}
              placeholder="加入附註"
              value={draftText}
              onChangeText={setDraftText}
              autoFocus
              onSubmitEditing={handleSaveItem} 
            />
            <TouchableOpacity onPress={openDetailModal} style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={28} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddSaveButton} onPress={handleSaveItem}>
              <Ionicons name="checkmark-circle" size={32} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 詳細資訊 Modal */}
      <Modal visible={isDetailModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Text style={styles.detailCancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>詳細資訊</Text>
            <TouchableOpacity onPress={handleSaveItem}>
              <Text style={styles.detailSaveText}>新增</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailBody}>
            <View style={styles.cardBlock}>
              <TextInput
                style={[styles.detailInput, { borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA', fontWeight: 'bold' }]}
                placeholder="標題"
                value={draftText}
                onChangeText={setDraftText}
              />
              <TextInput
                style={[styles.detailInput, { height: 80 }]}
                placeholder="備註"
                value={draftNotes}
                onChangeText={setDraftNotes}
                multiline
              />
            </View>

            <Text style={styles.blockTitle}>日期與時間</Text>
            <View style={styles.cardBlock}>
              <View style={styles.switchRow}>
                <View style={styles.switchRowLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#FF3B30' }]}><Ionicons name="calendar" size={16} color="white" /></View>
                  <Text style={styles.switchLabel}>日期</Text>
                </View>
                <Switch value={hasDate} onValueChange={setHasDate} />
              </View>
              
              {/* 原生日期選擇器 */}
              {hasDate && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={dateObj}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(e, date) => date && setDateObj(date)}
                  />
                </View>
              )}

              <View style={styles.separator} />

              <View style={styles.switchRow}>
                <View style={styles.switchRowLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#007AFF' }]}><Ionicons name="time" size={16} color="white" /></View>
                  <Text style={styles.switchLabel}>時間</Text>
                </View>
                <Switch value={hasTime} onValueChange={setHasTime} />
              </View>

              {/* 原生時間選擇器 */}
              {hasTime && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={dateObj}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(e, date) => date && setDateObj(date)}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 60 },
  backButton: { padding: 5 },
  moreButton: { padding: 5 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 34, fontWeight: 'bold' },
  
  todoItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
  textContainer: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  todoText: { fontSize: 17 },
  completedText: { color: '#8E8E93', textDecorationLine: 'line-through' },
  categoryLabel: { fontSize: 13, color: '#8E8E93', marginTop: 4 }, 
  notesText: { fontSize: 14, color: '#8E8E93', marginTop: 4 },

  sectionHeader: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA', backgroundColor: 'white' },
  sectionHeaderToday: { paddingTop: 10, borderBottomWidth: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#8E8E93' },

  emptyContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1 },
  emptyText: { fontSize: 18, color: '#C7C7CC' },
  fab: { position: 'absolute', right: 20, bottom: 40, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },

  quickAddOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' },
  quickAddContent: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', padding: 15, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 10 },
  quickAddCircle: { marginRight: 10 },
  quickAddInput: { flex: 1, fontSize: 18 },
  infoButton: { padding: 5, marginRight: 10 },
  quickAddSaveButton: { padding: 5 },

  detailContainer: { flex: 1, backgroundColor: '#F2F2F7' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 20 : 40, backgroundColor: 'white', borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
  detailCancelText: { fontSize: 17, color: '#FF3B30' },
  detailTitle: { fontSize: 17, fontWeight: 'bold' },
  detailSaveText: { fontSize: 17, color: '#007AFF', fontWeight: 'bold' },
  detailBody: { padding: 15 },
  
  cardBlock: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
  detailInput: { paddingVertical: 15, fontSize: 17 },
  blockTitle: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', marginBottom: 8, marginLeft: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  switchRowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  switchLabel: { fontSize: 17 },
  separator: { height: 0.5, backgroundColor: '#E5E5EA', marginLeft: 45 },
  
  pickerContainer: { paddingVertical: 10, alignItems: Platform.OS === 'ios' ? 'flex-end' : 'center', borderTopWidth: 0.5, borderTopColor: '#E5E5EA' }
});