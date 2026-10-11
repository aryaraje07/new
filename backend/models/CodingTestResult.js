import mongoose from 'mongoose'

const codingTestResultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingTest',
    required: true
  },
  topic: String,
  timeLimit: Number,
  totalQuestions: Number,
  correctAnswers: Number,
  score: Number, // percentage
  timeTaken: Number, // in minutes
  completedAt: {
    type: Date,
    default: Date.now
  },
  analysis: {
    codeQuality: {
      score: Number,
      feedback: String
    },
    timeComplexity: {
      score: Number,
      feedback: String
    },
    spaceComplexity: {
      score: Number,
      feedback: String
    },
    correctness: {
      score: Number,
      feedback: String
    },
    overallFeedback: String,
    weakAreas: [String],
    strongAreas: [String],
    recommendations: [{
      resourceType: String,
      title: String,
      description: String,
      url: String,
      platform: String
    }]
  },
  questionAnalyses: [{
    questionId: String,
    questionTitle: String,
    submittedCode: String,
    language: String,
    correctedCode: String,
    optimizedCode: String,
    topicsUsed: [String],
    feedback: String,
    score: Number
  }]
}, {
  timestamps: true
})

export default mongoose.model('CodingTestResult', codingTestResultSchema)