const API_BASE = 'https://www.themealdb.com/api/json/v1/1'

export type RecipeSummary = {
  id: string
  name: string
  image: string
  category: string | null
  area: string | null
}

export type RecipeDetails = RecipeSummary & {
  instructions: string
  ingredients: { name: string; measure: string }[]
}

type MealSummaryResponse = {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory?: string | null
  strArea?: string | null
}

type MealDetailsResponse = MealSummaryResponse & {
  strInstructions: string
  [key: string]: string | null | undefined
}

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('The recipe service is unavailable. Please try again shortly.')
  return response.json() as Promise<T>
}

export async function searchRecipes(ingredient: string): Promise<RecipeSummary[]> {
  const params = new URLSearchParams({ i: ingredient })
  const result = await request<{ meals: MealSummaryResponse[] | null }>(`${API_BASE}/filter.php?${params}`)

  return (result.meals ?? []).map((meal) => ({
    id: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb,
    category: meal.strCategory ?? null,
    area: meal.strArea ?? null,
  }))
}

export async function getRecipeDetails(id: string): Promise<RecipeDetails> {
  const params = new URLSearchParams({ i: id })
  const result = await request<{ meals: MealDetailsResponse[] | null }>(`${API_BASE}/lookup.php?${params}`)
  const meal = result.meals?.[0]
  if (!meal) throw new Error('Recipe details were not found. Please choose another recipe.')

  const ingredients = Array.from({ length: 20 }, (_, index) => {
    const number = index + 1
    return {
      name: meal[`strIngredient${number}`]?.trim() ?? '',
      measure: meal[`strMeasure${number}`]?.trim() ?? '',
    }
  }).filter((ingredient) => ingredient.name)

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb,
    category: meal.strCategory ?? null,
    area: meal.strArea ?? null,
    instructions: meal.strInstructions,
    ingredients,
  }
}