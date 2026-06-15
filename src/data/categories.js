export const EXPENSE_CATEGORIES = [
  { id: 'alimentacao', name: 'Alimentação',  icon: 'fast-food-outline',           color: '#F97316' },
  { id: 'transporte',  name: 'Transporte',   icon: 'car-outline',                 color: '#3B82F6' },
  { id: 'moradia',     name: 'Moradia',      icon: 'home-outline',                color: '#8B5CF6' },
  { id: 'saude',       name: 'Saúde',        icon: 'medkit-outline',              color: '#10B981' },
  { id: 'lazer',       name: 'Lazer',        icon: 'game-controller-outline',     color: '#EC4899' },
  { id: 'educacao',    name: 'Educação',     icon: 'school-outline',              color: '#F59E0B' },
  { id: 'vestuario',   name: 'Vestuário',    icon: 'shirt-outline',               color: '#6366F1' },
  { id: 'assinaturas', name: 'Assinaturas',  icon: 'repeat-outline',              color: '#14B8A6' },
  { id: 'outros',      name: 'Outros',       icon: 'ellipsis-horizontal-outline', color: '#9CA3AF' },
];

export function getCategoryById(id) {
  return EXPENSE_CATEGORIES.find(c => c.id === id) || null;
}
