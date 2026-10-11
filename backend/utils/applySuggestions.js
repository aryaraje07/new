const { normalizeSections, SECTION_NAMES } = require('./resumeSections')

function applySuggestions(sections, suggestions) {
  const result = normalizeSections(sections)
  const changesBySection = new Map()

  for (const suggestion of suggestions) {
    if (!SECTION_NAMES.includes(suggestion.section)) {
      const error = new Error('A selected suggestion references an unsupported resume section.')
      error.status = 400
      throw error
    }
    if (typeof suggestion.originalText !== 'string' || !suggestion.originalText.trim()) {
      const error = new Error('A selected suggestion has no original text to replace.')
      error.status = 409
      throw error
    }
    if (typeof suggestion.proposedText !== 'string' || !suggestion.proposedText.trim()) {
      const error = new Error('A selected suggestion has no replacement text.')
      error.status = 409
      throw error
    }

    const sectionText = result[suggestion.section]
    const position = sectionText.indexOf(suggestion.originalText)
    if (position === -1 || sectionText.indexOf(suggestion.originalText, position + 1) !== -1) {
      const error = new Error('A selected suggestion no longer matches the draft. Reanalyze the current resume before applying it.')
      error.status = 409
      throw error
    }

    const changes = changesBySection.get(suggestion.section) || []
    const end = position + suggestion.originalText.length
    if (changes.some(change => position < change.end && end > change.start)) {
      const error = new Error('Selected suggestions overlap. Apply them separately after reviewing the draft.')
      error.status = 409
      throw error
    }
    changes.push({ start: position, end, text: suggestion.proposedText })
    changesBySection.set(suggestion.section, changes)
  }

  for (const [section, changes] of changesBySection) {
    let text = result[section]
    for (const change of changes.sort((left, right) => right.start - left.start)) {
      text = `${text.slice(0, change.start)}${change.text}${text.slice(change.end)}`
    }
    result[section] = text
  }

  return result
}

module.exports = applySuggestions
