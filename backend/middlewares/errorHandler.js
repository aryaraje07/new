function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)

  if (isDatabaseConnectionError(error)) {
    console.error('Database request failed:', error.message)
    return res.status(503).json({
      error: 'The database is unreachable. Verify the backend network can reach MongoDB and the database URI is correct.',
    })
  }

  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({ error: error.message })
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' })
  }

  console.error('API request failed:', error.message)
  return res.status(500).json({ error: 'The request could not be completed. Please try again.' })
}

function isDatabaseConnectionError(error) {
  const databaseErrorNames = new Set([
    'MongooseServerSelectionError',
    'MongoServerSelectionError',
    'MongoNetworkError',
  ])
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    if (databaseErrorNames.has(current.name)) return true
    visited.add(current)
    current = current.cause
  }

  return false
}

module.exports = errorHandler
