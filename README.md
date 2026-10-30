# Ingredient Detective

A frontend-only recipe finder that classifies an uploaded ingredient photo in the browser with TensorFlow.js MobileNet, then searches TheMealDB for recipes.

## Run locally

```sh
npm install
npm run dev
```

The first image classification downloads the pretrained MobileNet model into the browser. Recipe search uses TheMealDB's free development key (`1`).