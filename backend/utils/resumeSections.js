const SECTION_NAMES = [
  'contactInformation',
  'summary',
  'education',
  'skills',
  'experience',
  'projects',
  'certifications',
  'achievements',
  'other',
]

const HEADING_RULES = [
  [/^(professional\s+)?summary|^(career|profile)\s+summary|^objective$/i, 'summary'],
  [/^(technical\s+)?skills|^core\s+competencies|^technologies$/i, 'skills'],
  [/^education|^academic\s+(background|history)$/i, 'education'],
  [/^experience|^employment(\s+history)?|^work\s+history$/i, 'experience'],
  [/^projects?|^personal\s+projects$/i, 'projects'],
  [/^certifications?|^licenses?$/i, 'certifications'],
  [/^achievements?|^awards?|^honors?$/i, 'achievements'],
]

function normalizeSections(sections) {
  return Object.fromEntries(SECTION_NAMES.map(name => [
    name,
    typeof sections?.[name] === 'string' ? sections[name].slice(0, 20000) : '',
  ]))
}

function parseResumeSections(text) {
  const sections = Object.fromEntries(SECTION_NAMES.map(name => [name, '']))
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const firstHeadingIndex = lines.findIndex(line => {
    const normalized = line.replace(/[:：\s]+$/, '')
    return HEADING_RULES.some(([pattern]) => pattern.test(normalized))
  })
  const contactEnd = firstHeadingIndex < 0 ? Math.min(8, lines.length) : firstHeadingIndex
  const contactLines = lines.slice(0, contactEnd)
  sections.contactInformation = contactLines.join('\n')

  let current = 'other'
  const contentLines = []

  for (const line of lines.slice(firstHeadingIndex < 0 ? lines.length : firstHeadingIndex)) {
    const normalized = line.replace(/[:：\s]+$/, '')
    const heading = HEADING_RULES.find(([pattern]) => pattern.test(normalized))
    if (heading) {
      current = heading[1]
      continue
    }
    if (current === 'other' && /^(contact|personal\s+details)$/i.test(normalized)) continue
    contentLines.push([current, line])
  }

  for (const [section, line] of contentLines) {
    sections[section] = sections[section] ? `${sections[section]}\n${line}` : line
  }

  if (firstHeadingIndex < 0) {
    sections.other = text.slice(0, 20000)
  }

  return sections
}

module.exports = { SECTION_NAMES, normalizeSections, parseResumeSections }
