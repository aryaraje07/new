import mongoose from 'mongoose'

const codingTestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  timeLimit: {
    type: Number, // in minutes
    required: true
  },
  questionCount: {
    type: Number,
    required: true
  },
  questions: [{
    id: String,
    title: String,
    description: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    constraints: [String],
    inputFormat: String,
    outputFormat: String,
    sampleInput: String,
    sampleOutput: String,
    testCases: [{
      input: String,
      output: String,
      isHidden: {
        type: Boolean,
        default: false
      }
    }],
    timeLimit: Number, // in seconds
    memoryLimit: Number // in MB
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  submissions: [{
    questionId: String,
    code: String,
    language: {
      type: String,
      enum: ['cpp', 'c', 'python', 'java']
    },
    submittedAt: Date,
    testResults: [{
      testCase: Number,
      passed: Boolean,
      executionTime: Number,
      memoryUsed: Number,
      output: String,
      expectedOutput: String
    }],
    allTestsPassed: Boolean
  }]
}, {
  timestamps: true
})

export default mongoose.model('CodingTest', codingTestSchema)