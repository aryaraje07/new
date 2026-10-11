import { getGeminiModel, getCodingQuestionsModel } from '../utils/gemini.js'

const MAX_RETRIES = 3

const generateCodingQuestions = async (topic, questionCount, difficultyDistribution) => {
  const prompt = `
Generate ${questionCount} coding problems for the topic "${topic}" with the following difficulty distribution:
${difficultyDistribution.map(d => `${d.count} ${d.difficulty}`).join(', ')}

Each problem should include:
1. A clear, descriptive title
2. Detailed problem description
3. Input and output format specifications
4. Sample input and output
5. At least 3 test cases (mix of visible and hidden)
6. Constraints
7. Time limit (in seconds)
8. Memory limit (in MB)

Format the response as valid JSON with this structure:
{
  "questions": [
    {
      "id": "q1",
      "title": "Problem Title",
      "description": "Detailed description...",
      "difficulty": "easy|medium|hard",
      "constraints": ["constraint1", "constraint2"],
      "inputFormat": "Description of input format",
      "outputFormat": "Description of output format",
      "sampleInput": "sample input here",
      "sampleOutput": "sample output here",
      "testCases": [
        {
          "input": "test input",
          "output": "expected output",
          "isHidden": false
        }
      ],
      "timeLimit": 1,
      "memoryLimit": 256
    }
  ]
}

Ensure problems are original and follow competitive programming standards.
`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const model = getCodingQuestionsModel()
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })

      const response = result.response.text()
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim()

      const parsed = JSON.parse(cleaned)

      if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        // Validate and clean questions
        const validatedQuestions = parsed.questions.map((q, index) => ({
          id: q.id || `q${index + 1}`,
          title: q.title || `Problem ${index + 1}`,
          description: q.description || '',
          difficulty: q.difficulty || 'medium',
          constraints: Array.isArray(q.constraints) ? q.constraints : [],
          inputFormat: q.inputFormat || '',
          outputFormat: q.outputFormat || '',
          sampleInput: q.sampleInput || '',
          sampleOutput: q.sampleOutput || '',
          testCases: Array.isArray(q.testCases) ? q.testCases.map(tc => ({
            input: tc.input || '',
            output: tc.output || '',
            isHidden: tc.isHidden || false
          })) : [],
          timeLimit: q.timeLimit || 1,
          memoryLimit: q.memoryLimit || 256
        }))

        return validatedQuestions
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message)
      if (attempt === MAX_RETRIES) {
        console.warn('Falling back to hardcoded questions because Gemini generation failed')
      }
    }
  }

  // Fallback default questions if Gemini fails or output is invalid
  const fallbackBase = [
    {
      id: 'q1',
      title: `${topic} - Simple Problem`,
      description: `Implement a simple ${topic} problem.`,
      difficulty: 'easy',
      constraints: ['1 <= n <= 1000'],
      inputFormat: 'n',
      outputFormat: 'result',
      sampleInput: '5',
      sampleOutput: '...result...',
      testCases: [
        { input: '1', output: '1', isHidden: false },
        { input: '5', output: '120', isHidden: false },
        { input: '10', output: '3628800', isHidden: true }
      ],
      timeLimit: 2,
      memoryLimit: 256
    },
    {
      id: 'q2',
      title: `${topic} - Medium Problem`,
      description: `Implement a medium ${topic} problem.`,
      difficulty: 'medium',
      constraints: ['1 <= n <= 10000'],
      inputFormat: 'n',
      outputFormat: 'result',
      sampleInput: '4',
      sampleOutput: '...result...',
      testCases: [
        { input: '3', output: '6', isHidden: false },
        { input: '7', output: '5040', isHidden: false },
        { input: '16', output: '20922789888000', isHidden: true }
      ],
      timeLimit: 2,
      memoryLimit: 256
    },
    {
      id: 'q3',
      title: `${topic} - Hard Problem`,
      description: `Implement a hard ${topic} problem.`,
      difficulty: 'hard',
      constraints: ['1 <= n <= 100000'],
      inputFormat: 'n',
      outputFormat: 'result',
      sampleInput: '6',
      sampleOutput: '...result...',
      testCases: [
        { input: '100', output: '...stable...', isHidden: true },
        { input: '500', output: '...stable...', isHidden: true },
        { input: '1000', output: '...stable...', isHidden: true }
      ],
      timeLimit: 3,
      memoryLimit: 256
    }
  ]

  return fallbackBase.slice(0, questionCount)
}

const getDifficultyDistribution = (timeLimit) => {
  switch (timeLimit) {
    case 45: // 45 mins: 1 easy, 2 medium
      return [
        { difficulty: 'easy', count: 1 },
        { difficulty: 'medium', count: 2 }
      ]
    case 60: // 1 hr: 1 easy, 1 medium, 1 hard
      return [
        { difficulty: 'easy', count: 1 },
        { difficulty: 'medium', count: 1 },
        { difficulty: 'hard', count: 1 }
      ]
    case 90: // 1:30 hr: 1 easy, 2 medium, 1 hard
      return [
        { difficulty: 'easy', count: 1 },
        { difficulty: 'medium', count: 2 },
        { difficulty: 'hard', count: 1 }
      ]
    case 120: // 2 hr: 1 easy, 2 medium, 2 hard
      return [
        { difficulty: 'easy', count: 1 },
        { difficulty: 'medium', count: 2 },
        { difficulty: 'hard', count: 2 }
      ]
    default:
      return [
        { difficulty: 'easy', count: 1 },
        { difficulty: 'medium', count: 1 },
        { difficulty: 'hard', count: 1 }
      ]
  }
}

export { generateCodingQuestions, getDifficultyDistribution }