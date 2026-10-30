import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { getRecipeDetails, searchRecipes, type RecipeDetails, type RecipeSummary } from './services/mealdb'

type Prediction = {
  ingredient: string
  confidence: number
}

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [classificationState, setClassificationState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [classificationError, setClassificationError] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualIngredient, setManualIngredient] = useState('')
  const [searchedIngredient, setSearchedIngredient] = useState('')
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [searchError, setSearchError] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetails | null>(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const classificationRequest = useRef(0)
  const searchRequest = useRef(0)
  const detailRequest = useRef(0)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (!selectedRecipeId) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedRecipeId(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedRecipeId])

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setClassificationState('error')
      setClassificationError('Choose an image file to identify an ingredient.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setClassificationState('error')
      setClassificationError('This image is over 10 MB. Choose a smaller photo.')
      return
    }

    const requestId = ++classificationRequest.current
    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(nextPreviewUrl)
    setPrediction(null)
    setClassificationError('')
    setClassificationState('loading')
    setManualMode(false)
    setManualIngredient('')
    searchRequest.current += 1
    setSearchedIngredient('')
    setRecipes([])
    setSearchError('')
    setSearchState('idle')

    try {
      const image = new Image()
      image.src = nextPreviewUrl
      await image.decode()
      const { classifyIngredient } = await import('./services/classifier')
      const result = await classifyIngredient(image)
      if (requestId !== classificationRequest.current) return
      setPrediction(result)
      setClassificationState('ready')
    } catch (error) {
      if (requestId !== classificationRequest.current) return
      setClassificationState('error')
      setClassificationError(error instanceof Error ? error.message : 'The image could not be classified. Try another photo.')
    }
  }

  async function findRecipes(ingredient: string) {
    const normalizedIngredient = ingredient.trim()
    if (!normalizedIngredient) return

    const requestId = ++searchRequest.current
    setSearchedIngredient(normalizedIngredient)
    setSearchState('loading')
    setSearchError('')
    setRecipes([])

    try {
      const results = await searchRecipes(normalizedIngredient)
      if (requestId !== searchRequest.current) return
      setRecipes(results)
      setSearchState('ready')
    } catch (error) {
      if (requestId !== searchRequest.current) return
      setSearchError(error instanceof Error ? error.message : 'Recipes could not be loaded. Please try again.')
      setSearchState('error')
    }
  }

  async function openRecipe(recipe: RecipeSummary) {
    const requestId = ++detailRequest.current
    setSelectedRecipeId(recipe.id)
    setSelectedRecipe(null)
    setDetailError('')
    setDetailLoading(true)

    try {
      const details = await getRecipeDetails(recipe.id)
      if (requestId === detailRequest.current) setSelectedRecipe(details)
    } catch (error) {
      if (requestId === detailRequest.current) {
        setDetailError(error instanceof Error ? error.message : 'Recipe details could not be loaded.')
      }
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    void handleFile(event.dataTransfer.files[0])
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void findRecipes(manualIngredient)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ingredient Detective home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>ingredient <strong>detective</strong></span>
        </a>
        <span className="topbar-note">A little curiosity goes a long way.</span>
      </header>

      <main id="top" className="page-content">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow"><span /> YOUR NEXT MEAL, STARTS HERE</p>
          <h1 id="page-title">What’s that <em>ingredient?</em></h1>
          <p className="intro-copy">Show us what you’ve got. We’ll find something lovely to make with it.</p>
        </section>

        <section className="workspace" aria-label="Identify an ingredient">
          <div className="upload-panel">
            <div className="panel-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Start with a photo</h2>
                <p>One ingredient, in good light.</p>
              </div>
            </div>

            <label
              className={`upload-zone${previewUrl ? ' has-image' : ''}`}
              htmlFor="ingredient-photo"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                id="ingredient-photo"
                className="visually-hidden"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  event.currentTarget.value = ''
                  void handleFile(file)
                }}
              />
              {previewUrl ? (
                <img className="preview-image" src={previewUrl} alt="Uploaded ingredient" />
              ) : (
                <span className="upload-prompt">
                  <span className="upload-icon" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="none">
                      <path d="M16 21V7m0 0-5 5m5-5 5 5" />
                      <path d="M8 19v6h16v-6" />
                    </svg>
                  </span>
                  <strong>Choose a photo</strong>
                  <span>or drop an image here</span>
                  <small>JPG, PNG or WEBP · max 10 MB</small>
                </span>
              )}
              {previewUrl && <span className="change-photo">Change photo</span>}
            </label>
            {classificationState === 'error' && <p className="inline-error" role="alert">{classificationError}</p>}
          </div>

          <div className="identify-panel" aria-live="polite">
            <div className="panel-heading">
              <span className="step-number">02</span>
              <div>
                <h2>Meet your ingredient</h2>
                <p>We’ll take our best guess.</p>
              </div>
            </div>

            {!previewUrl && (
              <div className="empty-identify">
                <span className="sparkle" aria-hidden="true">✳</span>
                <p>Your ingredient will show up here.</p>
              </div>
            )}
            {classificationState === 'loading' && (
              <div className="loading-identify">
                <span className="spinner" aria-hidden="true" />
                <div><strong>Taking a closer look</strong><span>First scan may take a moment.</span></div>
              </div>
            )}
            {classificationState === 'ready' && prediction && (
              <div className="prediction-content">
                <div className="prediction-label">OUR BEST GUESS</div>
                <p className="prediction-name">{prediction.ingredient}</p>
                <div className="confidence-row">
                  <span>Confidence</span>
                  <strong>{Math.round(prediction.confidence * 100)}%</strong>
                </div>
                <div className="confidence-track" aria-label={`Confidence ${Math.round(prediction.confidence * 100)}%`}>
                  <span style={{ width: `${Math.round(prediction.confidence * 100)}%` }} />
                </div>
                {!manualMode ? (
                  <div className="confirmation-actions">
                    <p>Did we get it right?</p>
                    <div className="button-row">
                      <button className="button button-primary" onClick={() => void findRecipes(prediction.ingredient)}>
                        Yes, find recipes <span aria-hidden="true">↗</span>
                      </button>
                      <button className="button button-secondary" onClick={() => setManualMode(true)}>Not quite</button>
                    </div>
                  </div>
                ) : (
                  <form className="manual-form" onSubmit={handleManualSubmit}>
                    <label htmlFor="correct-ingredient">What is it?</label>
                    <div className="manual-input-row">
                      <input
                        id="correct-ingredient"
                        autoFocus
                        value={manualIngredient}
                        onChange={(event) => setManualIngredient(event.target.value)}
                        placeholder="e.g. sweet potato"
                        required
                      />
                      <button className="button button-primary" type="submit">Find recipes <span aria-hidden="true">↗</span></button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>

        {searchState !== 'idle' && (
          <section className="recipes-section" aria-labelledby="recipes-title" aria-live="polite">
            <div className="recipes-heading">
              <div>
                <p className="eyebrow"><span /> THE GOOD PART</p>
                <h2 id="recipes-title">Made with <em>{searchedIngredient}</em></h2>
              </div>
              {searchState === 'ready' && <span className="recipe-count">{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</span>}
            </div>

            {searchState === 'loading' && (
              <div className="recipes-message"><span className="spinner" aria-hidden="true" /><span>Looking for something delicious…</span></div>
            )}
            {searchState === 'error' && (
              <div className="recipes-message error-message" role="alert">
                <span>{searchError}</span>
                <button className="text-button" onClick={() => void findRecipes(searchedIngredient)}>Try again</button>
              </div>
            )}
            {searchState === 'ready' && recipes.length === 0 && (
              <div className="recipes-message empty-results">
                <span>No recipes found for “{searchedIngredient}”. Try another ingredient name.</span>
              </div>
            )}
            {searchState === 'ready' && recipes.length > 0 && (
              <div className="recipe-grid">
                {recipes.map((recipe, index) => (
                  <button className="recipe-card" key={recipe.id} onClick={() => void openRecipe(recipe)}>
                    <span className="recipe-image-wrap">
                      <img src={recipe.image} alt="" loading="lazy" />
                      <span className="recipe-index">{String(index + 1).padStart(2, '0')}</span>
                    </span>
                    <span className="recipe-card-info">
                      <span className="recipe-card-title">{recipe.name}</span>
                      <span className="recipe-card-meta">{[recipe.category, recipe.area].filter(Boolean).join(' · ') || 'View recipe'}</span>
                    </span>
                    <span className="recipe-arrow" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="page-footer">
        <span>Good things grow from simple ingredients.</span>
        <span>Powered by TheMealDB</span>
      </footer>

      {selectedRecipeId && (
        <div className="modal-backdrop" onClick={() => setSelectedRecipeId(null)}>
          <section
            className="recipe-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selectedRecipe?.name ?? 'Recipe details'}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="dialog-close" aria-label="Close recipe" onClick={() => setSelectedRecipeId(null)}>×</button>
            {detailLoading && <div className="dialog-state"><span className="spinner" /><span>Opening recipe…</span></div>}
            {detailError && <div className="dialog-state error-message" role="alert">{detailError}</div>}
            {selectedRecipe && (
              <>
                <img className="dialog-image" src={selectedRecipe.image} alt={selectedRecipe.name} />
                <div className="dialog-content">
                  <p className="eyebrow"><span /> {selectedRecipe.category || 'RECIPE'}{selectedRecipe.area ? ` · ${selectedRecipe.area}` : ''}</p>
                  <h2>{selectedRecipe.name}</h2>
                  <div className="dialog-columns">
                    <section>
                      <h3>Ingredients <span>{selectedRecipe.ingredients.length}</span></h3>
                      <ul className="ingredient-list">
                        {selectedRecipe.ingredients.map((ingredient) => (
                          <li key={`${ingredient.name}-${ingredient.measure}`}>
                            <span>{ingredient.name}</span><span>{ingredient.measure}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <h3>Let’s make it</h3>
                      <div className="instructions">
                        {selectedRecipe.instructions.split(/\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, index) => (
                          <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App