import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  Modal, StyleSheet, Alert, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { EXPENSE_CATEGORIES, getResolvedCategories } from '../data/categories';

const COLOR_PALETTE = [
  '#F97316', '#EF4444', '#EC4899', '#A855F7',
  '#6366F1', '#3B82F6', '#06B6D4', '#10B981',
  '#84CC16', '#F59E0B', '#8B5CF6', '#14B8A6',
];

const EMPTY_FORM = { name: '', emoji: '', color: COLOR_PALETTE[0] };

export default function SettingsCategoriesScreen() {
  const { colors } = useTheme();
  const route = useRoute();
  const {
    customCategories, addCustomCategory, updateCustomCategory, removeCustomCategory,
    defaultOverrides, updateDefaultCategory, resetDefaultCategory,
  } = useSettings();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDefault, setIsDefault] = useState(false);
  const [defaultIcon, setDefaultIcon] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openAdd = () => {
    setEditingId(null);
    setIsDefault(false);
    setDefaultIcon(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditDefault = (cat) => {
    setEditingId(cat.id);
    setIsDefault(true);
    setDefaultIcon(cat.icon);
    setForm({ name: cat.name, emoji: '', color: cat.color });
    setModalVisible(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.openAdd) openAdd();
    }, [route.params?.openAdd]) // eslint-disable-line
  );

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setIsDefault(false);
    setDefaultIcon(null);
    setForm({ name: cat.name, emoji: cat.emoji, color: cat.color });
    setModalVisible(true);
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert('Nome obrigatório', 'Dê um nome pra sua categoria.');
      return;
    }
    if (isDefault) {
      updateDefaultCategory(editingId, { name, color: form.color });
    } else if (editingId) {
      updateCustomCategory(editingId, { name, emoji: form.emoji || '🏷️', color: form.color });
    } else {
      addCustomCategory(name, form.color, form.emoji || '🏷️');
    }
    setModalVisible(false);
  };

  const handleDelete = (cat) => {
    Alert.alert(
      'Apagar categoria',
      `Apagar "${cat.name}"? As despesas já categorizadas com ela ficam sem categoria.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: () => removeCustomCategory(cat.id) },
      ]
    );
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* ── Categorias padrão (somente leitura) ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PADRÃO</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Não editáveis</Text>
      </View>
      <View style={[styles.defaultList, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {getResolvedCategories().map((cat, idx) => {
          const overridden = !!defaultOverrides[cat.id];
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => openEditDefault(cat)}
              activeOpacity={0.7}
              style={[
                styles.defaultRow,
                idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '40' },
              ]}
            >
              <View style={[styles.defaultIconBadge, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={EXPENSE_CATEGORIES.find(c => c.id === cat.id).icon} size={18} color={cat.color} />
              </View>
              <View style={styles.defaultTextCol}>
                <Text style={[styles.defaultRowName, { color: colors.text }]}>{cat.name}</Text>
                <Text style={[styles.defaultRowSub, { color: overridden ? cat.color : colors.textMuted }]}>
                  {overridden ? 'Personalizada' : 'Toque para editar'}
                </Text>
              </View>
              <Ionicons name="pencil-outline" size={15} color={overridden ? cat.color : colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Categorias personalizadas ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary, marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MINHAS CATEGORIAS</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          {customCategories.length > 0 ? `${customCategories.length} criadas` : 'Nenhuma ainda'}
        </Text>
      </View>

      {customCategories.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.emptyEmoji}>🏷️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem categorias personalizadas</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Crie suas próprias para organizar despesas do seu jeito — Viagem, Pet, Presentes...
          </Text>
        </View>
      ) : (
        <View style={styles.customList}>
          {customCategories.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.customRow,
                { backgroundColor: colors.text + '0D', borderColor: colors.border + '70' },
                idx > 0 && { marginTop: 8 },
              ]}
            >
              <View style={[styles.colorStrip, { backgroundColor: cat.color }]} />
              <Text style={styles.customEmoji}>{cat.emoji}</Text>
              <Text style={[styles.customName, { color: colors.text }]}>{cat.name}</Text>
              <TouchableOpacity
                onPress={() => openEdit(cat)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconBtn}
              >
                <Ionicons name="pencil-outline" size={17} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(cat)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={17} color={colors.negative} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        onPress={openAdd}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Criar categoria</Text>
      </TouchableOpacity>

      {/* ── Modal de criação/edição ── */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingId ? 'Editar categoria' : 'Nova categoria'}
                </Text>

                {/* Nome */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOME</Text>
                <TextInput
                  value={form.name}
                  onChangeText={(t) => setForm(f => ({ ...f, name: t }))}
                  placeholder="Ex: Viagem, Pet, Presentes..."
                  placeholderTextColor={colors.textMuted}
                  maxLength={24}
                  style={[styles.nameInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                />

                {/* Emoji — só para categorias personalizadas */}
                {!isDefault && (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>EMOJI</Text>
                    <View style={styles.emojiRow}>
                      <TextInput
                        value={form.emoji}
                        onChangeText={(t) => setForm(f => ({ ...f, emoji: t.slice(-2) }))}
                        placeholder="🏷️"
                        placeholderTextColor={colors.textMuted}
                        maxLength={2}
                        style={[styles.emojiInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                      />
                      <Text style={[styles.emojiHint, { color: colors.textMuted }]}>
                        Digite qualquer emoji do seu teclado
                      </Text>
                    </View>
                  </>
                )}

                {/* Cor */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>COR</Text>
                <View style={styles.colorGrid}>
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setForm(f => ({ ...f, color: c }))}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        form.color === c && styles.colorSwatchSelected,
                      ]}
                    >
                      {form.color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Preview */}
                <View style={[styles.previewChip, { backgroundColor: form.color + '22', borderColor: form.color }]}>
                  {isDefault ? (
                    <Ionicons name={defaultIcon} size={18} color={form.color} />
                  ) : (
                    <Text style={styles.previewEmoji}>{form.emoji || '🏷️'}</Text>
                  )}
                  <Text style={[styles.previewName, { color: form.color }]}>{form.name || 'Prévia'}</Text>
                </View>

                {/* Restaurar — só para padrão com override */}
                {isDefault && defaultOverrides[editingId] && (
                  <TouchableOpacity
                    onPress={() => { resetDefaultCategory(editingId); setModalVisible(false); }}
                    style={[styles.resetBtn, { borderColor: colors.negative + '40' }]}
                  >
                    <Ionicons name="refresh-outline" size={14} color={colors.negative} />
                    <Text style={[styles.resetBtnText, { color: colors.negative }]}>Restaurar nome e cor padrão</Text>
                  </TouchableOpacity>
                )}

                {/* Ações */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.saveBtn, { backgroundColor: form.color }]}
                  >
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  sectionHeader: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  sectionSub: { fontSize: 11, fontWeight: '600' },

  defaultList: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4, overflow: 'hidden',
  },
  defaultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  defaultIconBadge: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  defaultTextCol: { flex: 1 },
  defaultRowName: { fontSize: 14, fontWeight: '800' },
  defaultRowSub: { fontSize: 11.5, fontWeight: '500', marginTop: 1 },

  emptyCard: {
    borderRadius: 16, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 6, marginBottom: 16,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyHint: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' },

  customList: { marginBottom: 16 },
  customRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    overflow: 'hidden',
    paddingRight: 10,
  },
  colorStrip: { width: 4, alignSelf: 'stretch' },
  customEmoji: { fontSize: 20, marginHorizontal: 10 },
  customName: { flex: 1, fontSize: 14, fontWeight: '700', paddingVertical: 14 },
  iconBtn: { padding: 8 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 4,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 22, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '900', marginBottom: 18, textAlign: 'center' },

  fieldLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
  nameInput: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontWeight: '600',
  },
  emojiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiInput: {
    borderRadius: 10, borderWidth: 1,
    width: 54, height: 48, textAlign: 'center',
    fontSize: 22,
  },
  emojiHint: { flex: 1, fontSize: 11, lineHeight: 16 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  previewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: 18,
  },
  previewEmoji: { fontSize: 16 },
  previewName: { fontSize: 14, fontWeight: '800' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 10,
    paddingVertical: 9, marginBottom: 14,
  },
  resetBtnText: { fontSize: 13, fontWeight: '700' },

  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flex: 1, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
