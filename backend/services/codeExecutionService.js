// Mock code execution service
// In a real implementation, this would integrate with Judge0 API or similar

const executeCode = async (code, language, testCases, timeLimit, memoryLimit) => {
  // Simulate execution delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

  const results = testCases.map((testCase, index) => {
    // Mock test execution - in real implementation, this would send to code execution service
    const passed = Math.random() > 0.3 // 70% pass rate for demo
    const executionTime = Math.random() * timeLimit * 1000 // Random time within limit
    const memoryUsed = Math.random() * memoryLimit * 1024 * 1024 // Random memory usage

    return {
      testCase: index + 1,
      passed,
      executionTime: Math.round(executionTime),
      memoryUsed: Math.round(memoryUsed),
      input: testCase.input || '',
      output: passed ? testCase.output : 'Wrong Answer',
      expectedOutput: testCase.output
    }
  })

  const allTestsPassed = results.every(result => result.passed)

  return {
    results,
    allTestsPassed,
    totalTime: results.reduce((sum, r) => sum + r.executionTime, 0),
    maxMemory: Math.max(...results.map(r => r.memoryUsed))
  }
}

const getDefaultCode = (language) => {
  const templates = {
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your code here

    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your code here

    return 0;
}`,
    python: `# Write your code here
def main():
    pass

if __name__ == "__main__":
    main()`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your code here
    }
}`
  }

  return templates[language] || templates.cpp
}

export { executeCode, getDefaultCode }