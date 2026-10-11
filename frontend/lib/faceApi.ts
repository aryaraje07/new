import * as faceapi from "face-api.js";

let modelsLoaded = false;

export const loadFaceModels = async () => {
  if (modelsLoaded) return;

  const MODEL_URL = "/models";

  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

  modelsLoaded = true;
};

export const areModelsLoaded = () => modelsLoaded;
