const stressWords = [
  "depressed",
  "stress",
  "stressed",
  "tired",
  "anxious",
  "lonely",
  "pressure",
  "sad",
  "overwhelmed",
  "can't focus",
  "cry",
];

export const detectEmotion = (text) => {
  const lowerText = text.toLowerCase();
  return stressWords.some(word => lowerText.includes(word))
    ? "stressed"
    : "normal";
};
