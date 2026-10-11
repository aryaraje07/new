const test = require('node:test')
const assert = require('node:assert/strict')
const errorHandler = require('../middlewares/errorHandler')

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('returns an actionable 503 when MongoDB cannot be reached', () => {
  const response = createResponse()
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    errorHandler(
      { name: 'MongooseServerSelectionError', message: 'connect EACCES' },
      {},
      response,
      error => { throw error },
    )
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(response.statusCode, 503)
  assert.match(response.body.error, /database is unreachable/i)
  assert.match(response.body.error, /network/i)
})

test('recognizes MongoDB network errors nested as causes', () => {
  const response = createResponse()
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    errorHandler(
      { name: 'Error', message: 'connect EACCES', cause: { name: 'MongoNetworkError' } },
      {},
      response,
      error => { throw error },
    )
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(response.statusCode, 503)
})
