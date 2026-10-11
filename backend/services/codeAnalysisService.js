import { getCodeAnalysisModel } from '../utils/gemini.js'
import axios from 'axios'

const analyzeCode = async (code, language, question, testResults) => {
  const prompt = `
Analyze the following ${language} code for the problem: "${question.title}"

Problem Description: ${question.description}

Code:
${code}

Test Results: ${testResults.allTestsPassed ? 'All tests passed' : 'Some tests failed'}
Execution time: ${testResults.totalTime}ms
Memory used: ${testResults.maxMemory} bytes

Please provide:
1. Code quality assessment (score 1-10)
2. Time complexity analysis
3. Space complexity analysis
4. Correctness assessment
5. Specific feedback and suggestions for improvement
6. Topics/concepts used in the solution

Format as JSON:
{
  "codeQuality": { "score": 8, "feedback": "Good use of..." },
  "timeComplexity": { "score": 7, "feedback": "O(n) time complexity..." },
  "spaceComplexity": { "score": 9, "feedback": "O(1) space complexity..." },
  "correctness": { "score": 10, "feedback": "All test cases pass..." },
  "overallFeedback": "Overall good solution...",
  "topicsUsed": ["arrays", "loops", "conditionals"]
}
`

  try {
    const model = getCodeAnalysisModel()
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    })

    const response = result.response.text()
    const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim()

    return JSON.parse(cleaned)
  } catch (error) {
    console.error('Error analyzing code:', error)
    return {
      codeQuality: { score: 5, feedback: 'Unable to analyze code quality' },
      timeComplexity: { score: 5, feedback: 'Unable to analyze time complexity' },
      spaceComplexity: { score: 5, feedback: 'Unable to analyze space complexity' },
      correctness: { score: testResults.allTestsPassed ? 10 : 3, feedback: testResults.allTestsPassed ? 'All tests passed' : 'Some tests failed' },
      overallFeedback: 'Code analysis completed',
      topicsUsed: []
    }
  }
}

const generateCorrectedCode = async (code, language, question, analysis) => {
  const prompt = `
Given this ${language} code that may have issues:

${code}

Problem: ${question.title}
Description: ${question.description}

Analysis: ${JSON.stringify(analysis)}

Please provide a corrected and improved version of the code that:
1. Fixes any bugs
2. Improves efficiency if possible
3. Follows best practices
4. Includes proper comments

Return only the corrected code without any explanation.
`

  try {
    const model = getCodeAnalysisModel()
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    })

    return result.response.text().trim()
  } catch (error) {
    console.error('Error generating corrected code:', error)
    return code // Return original code if correction fails
  }
}

const getLearningRecommendations = async (topic, weakAreas, analysis) => {
  const query = `${topic} programming tutorials ${weakAreas.join(' ')}`
  const recommendations = []

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: query,
        api_key: process.env.SERP_API_KEY,
        num: 5
      }
    })

    const results = response.data.organic_results || []

    for (const result of results.slice(0, 3)) {
      if (result.title && result.link) {
        recommendations.push({
          resourceType: 'tutorial',
          title: result.title,
          description: result.snippet || 'Learn more about this topic',
          url: result.link,
          platform: result.displayed_link?.split('.')[1] || 'web'
        })
      }
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error)
  }

  // Add some default recommendations if API fails
  if (recommendations.length === 0) {
    recommendations.push(
      {
        resourceType: 'tutorial',
        title: 'GeeksforGeeks Practice',
        description: 'Practice coding problems with detailed solutions',
        url: 'https://practice.geeksforgeeks.org/',
        platform: 'geeksforgeeks'
      },
      {
        resourceType: 'tutorial',
        title: 'LeetCode',
        description: 'Platform for practicing coding interviews',
        url: 'https://leetcode.com/',
        platform: 'leetcode'
      }
    )
  }

  return recommendations
}

export { analyzeCode, generateCorrectedCode, getLearningRecommendations }