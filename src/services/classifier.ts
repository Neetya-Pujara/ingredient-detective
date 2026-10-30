import * as mobilenet from '@tensorflow-models/mobilenet'
import '@tensorflow/tfjs'

let modelPromise: Promise<mobilenet.MobileNet> | undefined

export async function classifyIngredient(image: HTMLImageElement): Promise<{ ingredient: string; confidence: number }> {
  modelPromise ??= mobilenet.load()

  try {
    const model = await modelPromise
    const [prediction] = await model.classify(image, 1)
    if (!prediction) throw new Error('No ingredient could be recognized. Try a clearer photo.')
    return { ingredient: prediction.className, confidence: prediction.probability }
  } catch (error) {
    modelPromise = undefined
    if (error instanceof Error && error.message.includes('No ingredient')) throw error
    throw new Error('Image classification failed. Check your connection and try again.')
  }
}