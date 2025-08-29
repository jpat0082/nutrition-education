const BASES = {
  vegetarian: { kcal: 420, protein: 18, fat: 14, carbs: 55 },
  vegan: { kcal: 390, protein: 16, fat: 12, carbs: 56 },
  'high-protein': { kcal: 520, protein: 35, fat: 18, carbs: 45 },
  'gluten-free': { kcal: 480, protein: 25, fat: 16, carbs: 50 },
  breakfast: { kcal: 350, protein: 16, fat: 12, carbs: 45 },
  dessert: { kcal: 450, protein: 6, fat: 20, carbs: 60 },
  default: { kcal: 470, protein: 22, fat: 15, carbs: 50 },
}

export function estimateNutrition(tags = []) {
  const t = tags.map((x) => x.toLowerCase())
  const pick = t.includes('vegan')
    ? 'vegan'
    : t.includes('vegetarian')
      ? 'vegetarian'
      : t.includes('high-protein')
        ? 'high-protein'
        : t.includes('gluten-free')
          ? 'gluten-free'
          : t.includes('breakfast')
            ? 'breakfast'
            : t.includes('dessert')
              ? 'dessert'
              : 'default'

  const b = { ...BASES[pick] }
  b.kcal += (t.includes('quick') ? -20 : 0) + (t.includes('family') ? 40 : 0)
  return b
}
