const rateLimit = require('express-rate-limit')

module.exports = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many resume analyses. Please try again later.' },
})
