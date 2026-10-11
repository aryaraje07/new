//quiz related

export const MAX_WARNINGS = 2

export const shouldAutoSubmit = (count) => {
  return count > MAX_WARNINGS
}