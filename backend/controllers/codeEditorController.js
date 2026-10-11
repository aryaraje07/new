import CodingTest from '../models/CodingTest.js'
import CodingTestResult from '../models/CodingTestResult.js'
import { generateCodingQuestions, getDifficultyDistribution } from '../services/codingQuestionService.js'
import { executeCode, getDefaultCode } from '../services/codeExecutionService.js'
import { analyzeCode, generateCorrectedCode, getLearningRecommendations } from '../services/codeAnalysisService.js'

// Start a new coding test
export const startCodingTest = async (req, res) => {
  try {
    let { timeLimit, topic, questionCount } = req.body
    const studentId = req.user._id

    // Get difficulty distribution based on time limit
    const difficultyDistribution = getDifficultyDistribution(timeLimit)

    // Generate questions
    let questions = await generateCodingQuestions(topic, questionCount, difficultyDistribution)

    if (!Array.isArray(questions) || questions.length === 0) {
      // fallback hardcoded set
      questions = [
        {
          id: 'q1',
          title: `${topic} - Fallback Easy`,
          description: `Solve a fallback ${topic} easy problem.`,
          difficulty: 'easy',
          constraints: ['n <= 1000'],
          inputFormat: 'n',
          outputFormat: 'value',
          sampleInput: '5',
          sampleOutput: '120',
          testCases: [{ input: '5', output: '120', isHidden: false }],
          timeLimit: 3,
          memoryLimit: 256
        }
      ]
      questionCount = questions.length
    }

    // Create coding test
    const codingTest = new CodingTest({
      student: studentId,
      topic,
      timeLimit,
      questionCount,
      questions
    })

    await codingTest.save()

    res.json({
      success: true,
      testId: codingTest._id,
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        constraints: q.constraints,
        inputFormat: q.inputFormat,
        outputFormat: q.outputFormat,
        sampleInput: q.sampleInput,
        sampleOutput: q.sampleOutput,
        timeLimit: q.timeLimit,
        memoryLimit: q.memoryLimit
      }))
    })
  } catch (error) {
    console.error('Error starting coding test:', error)
    res.status(500).json({ message: 'Failed to start coding test', error: error.message })
  }
}

// Get coding test details
export const getCodingTest = async (req, res) => {
  try {
    const { testId } = req.params
    const studentId = req.user._id

    const codingTest = await CodingTest.findOne({
      _id: testId,
      student: studentId
    })

    if (!codingTest) {
      return res.status(404).json({ message: 'Coding test not found' })
    }

    res.json({
      success: true,
      test: {
        id: codingTest._id,
        topic: codingTest.topic,
        timeLimit: codingTest.timeLimit,
        status: codingTest.status,
        startedAt: codingTest.startedAt,
        questions: codingTest.questions.map(q => ({
          id: q.id,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          constraints: q.constraints,
          inputFormat: q.inputFormat,
          outputFormat: q.outputFormat,
          sampleInput: q.sampleInput,
          sampleOutput: q.sampleOutput,
          timeLimit: q.timeLimit,
          memoryLimit: q.memoryLimit
        }))
      }
    })
  } catch (error) {
    console.error('Error getting coding test:', error)
    res.status(500).json({ message: 'Failed to get coding test', error: error.message })
  }
}

// Submit code for a question
export const submitCode = async (req, res) => {
  try {
    const { testId, questionId, code, language } = req.body
    const studentId = req.user._id

    const codingTest = await CodingTest.findOne({
      _id: testId,
      student: studentId,
      status: 'active'
    })

    if (!codingTest) {
      return res.status(404).json({ message: 'Active coding test not found' })
    }

    const question = codingTest.questions.find(q => q.id === questionId)
    if (!question) {
      return res.status(404).json({ message: 'Question not found' })
    }

    // Execute code against test cases (ensure fallback to at least one case)
    const testCases = Array.isArray(question.testCases) && question.testCases.length > 0
      ? question.testCases
      : [{ input: question.sampleInput || '1', output: question.sampleOutput || '1', isHidden: false }]

    const testResults = await executeCode(code, language, testCases, question.timeLimit || 2, question.memoryLimit || 256)

    // Update submission
    const submission = {
      questionId,
      code,
      language,
      submittedAt: new Date(),
      testResults: testResults.results,
      allTestsPassed: testResults.allTestsPassed
    }

    // Update or add submission
    const existingSubmissionIndex = codingTest.submissions.findIndex(s => s.questionId === questionId)
    if (existingSubmissionIndex >= 0) {
      codingTest.submissions[existingSubmissionIndex] = submission
    } else {
      codingTest.submissions.push(submission)
    }

    await codingTest.save()

    res.json({
      success: true,
      results: testResults.results,
      allTestsPassed: testResults.allTestsPassed
    })
  } catch (error) {
    console.error('Error submitting code:', error)
    res.status(500).json({ message: 'Failed to submit code', error: error.message })
  }
}

// End coding test and generate analysis
export const endCodingTest = async (req, res) => {
  try {
    const { testId } = req.body
    const studentId = req.user._id

    const codingTest = await CodingTest.findOne({
      _id: testId,
      student: studentId,
      status: 'active'
    }).populate('student')

    if (!codingTest) {
      return res.status(404).json({ message: 'Active coding test not found' })
    }

    // Mark test as completed
    codingTest.status = 'completed'
    codingTest.completedAt = new Date()
    await codingTest.save()

    // Calculate results
    const totalQuestions = codingTest.questions.length || 1
    const correctAnswers = (codingTest.submissions || []).filter(s => s && s.allTestsPassed).length
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const timeTaken = Math.round((new Date() - codingTest.startedAt) / (1000 * 60)) // in minutes

    // Generate detailed analysis with error handling
    const questionAnalyses = []

    for (const submission of (codingTest.submissions || [])) {
      if (!submission || !submission.questionId) continue

      const question = codingTest.questions.find(q => q && q.id === submission.questionId)
      if (!question) continue

      try {
        const totalTime = (submission.testResults || []).reduce((sum, r) => sum + (r.executionTime || 0), 0)
        const maxMemory = submission.testResults?.length > 0 ? Math.max(...submission.testResults.map(r => r.memoryUsed || 0)) : 0

        // Analyze code with timeout and fallback
        let analysis = {
          codeQuality: { score: 7, feedback: 'Code quality assessment completed' },
          timeComplexity: { score: 6, feedback: 'Time complexity evaluated' },
          spaceComplexity: { score: 8, feedback: 'Space complexity optimized' },
          correctness: { score: submission.allTestsPassed ? 10 : 5, feedback: `${(submission.testResults || []).filter(r => r.passed).length || 0}/${(submission.testResults || []).length || 0} test cases passed` },
          overallFeedback: submission.allTestsPassed ? 'All tests passed successfully!' : 'Some test cases failed. Review and resubmit.',
          topicsUsed: ['problem-solving', 'coding']
        }

        try {
          const aiAnalysis = await Promise.race([
            analyzeCode(submission.code, submission.language, question, {
              allTestsPassed: submission.allTestsPassed,
              totalTime,
              maxMemory
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Analysis timeout')), 10000))
          ])
          analysis = aiAnalysis
        } catch (analysisError) {
          console.warn('AI analysis failed, using fallback:', analysisError.message)
        }

        // Generate corrected code with fallback
        let correctedCode = submission.code
        try {
          correctedCode = await Promise.race([
            generateCorrectedCode(submission.code, submission.language, question, analysis),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Correction timeout')), 10000))
          ])
        } catch (correctionError) {
          console.warn('Code correction failed:', correctionError.message)
          correctedCode = submission.code
        }

        questionAnalyses.push({
          questionId: submission.questionId,
          questionTitle: question.title,
          questionDescription: question.description,
          submittedCode: submission.code,
          language: submission.language,
          correctedCode,
          optimizedCode: correctedCode,
          topicsUsed: analysis.topicsUsed || ['coding'],
          feedback: analysis.overallFeedback || 'Code submitted successfully',
          codeQuality: analysis.codeQuality,
          timeComplexity: analysis.timeComplexity,
          spaceComplexity: analysis.spaceComplexity,
          correctness: analysis.correctness,
          score: submission.allTestsPassed ? 100 : 0
        })
      } catch (itemError) {
        console.error('Error processing submission:', itemError)
        // Continue with next submission
      }
    }

    // Get learning recommendations with fallback
    const weakAreas = score < 70 ? [codingTest.topic] : []
    let recommendations = []
    try {
      recommendations = await Promise.race([
        getLearningRecommendations(codingTest.topic, weakAreas, {}),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Recommendation timeout')), 10000))
      ])
    } catch (recError) {
      console.warn('Could not fetch recommendations:', recError.message)
      recommendations = []
    }

    // Create result record
    const resultData = {
      student: studentId,
      test: testId,
      topic: codingTest.topic,
      timeLimit: codingTest.timeLimit,
      totalQuestions,
      correctAnswers,
      score,
      timeTaken,
      completedAt: new Date(),
      analysis: {
        codeQuality: { score: 7, feedback: 'Code quality assessment completed' },
        timeComplexity: { score: 6, feedback: 'Time complexity evaluated' },
        spaceComplexity: { score: 8, feedback: 'Space complexity optimized' },
        correctness: { score: Math.round(score / 10), feedback: `${correctAnswers}/${totalQuestions} questions solved correctly` },
        overallFeedback: `You solved ${correctAnswers} out of ${totalQuestions} problems. ${score >= 70 ? 'Great job!' : 'Keep practicing to improve your skills.'}`,
        weakAreas,
        strongAreas: score >= 70 ? [codingTest.topic] : [],
        recommendations: recommendations || []
      },
      questionAnalyses
    }

    const result = new CodingTestResult(resultData)
    await result.save()

    const responseData = {
      success: true,
      resultId: result._id,
      score,
      correctAnswers,
      totalQuestions,
      timeTaken,
      topic: codingTest.topic,
      analysis: resultData.analysis,
      questionAnalyses: resultData.questionAnalyses
    }

    res.json(responseData)
  } catch (error) {
    console.error('Error ending coding test:', error)
    res.status(500).json({ message: 'Failed to end coding test', error: error.message })
  }
}

// Get coding test results
export const getCodingTestResults = async (req, res) => {
  try {
    const studentId = req.user._id

    const results = await CodingTestResult.find({ student: studentId })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('topic timeLimit totalQuestions correctAnswers score completedAt')

    res.json({
      success: true,
      results: results.map(r => ({
        id: r._id,
        topic: r.topic,
        timeLimit: r.timeLimit,
        totalQuestions: r.totalQuestions,
        score: r.score,
        correctAnswers: r.correctAnswers,
        completedAt: r.completedAt
      }))
    })
  } catch (error) {
    console.error('Error getting coding test results:', error)
    res.status(500).json({ message: 'Failed to get results', error: error.message })
  }
}

// Get detailed analysis
export const getCodingTestAnalysis = async (req, res) => {
  try {
    const { resultId } = req.params
    const studentId = req.user._id

    const result = await CodingTestResult.findOne({
      _id: resultId,
      student: studentId
    })

    if (!result) {
      return res.status(404).json({ message: 'Analysis not found' })
    }

    res.json({
      success: true,
      analysis: {
        _id: result._id,
        student: result.student,
        test: result.test,
        topic: result.topic,
        timeLimit: result.timeLimit,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        score: result.score,
        timeTaken: result.timeTaken,
        completedAt: result.completedAt,
        analysis: result.analysis,
        questionAnalyses: result.questionAnalyses || []
      }
    })
  } catch (error) {
    console.error('Error getting analysis:', error)
    res.status(500).json({ message: 'Failed to get analysis', error: error.message })
  }
}

// Get default code template
export const getCodeTemplate = async (req, res) => {
  try {
    const { language } = req.params
    const template = getDefaultCode(language)

    res.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('Error getting code template:', error)
    res.status(500).json({ message: 'Failed to get code template', error: error.message })
  }
}