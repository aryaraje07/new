const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const helmet = require('helmet')
const authRoutes = require('./routes/authRoutes')
const healthRoutes = require('./routes/healthRoutes')
const errorHandler = require('./middlewares/errorHandler')
const notFoundHandler = require('./middlewares/notFoundHandler')
const { createCorsOptions } = require('./utils/corsOptions')
const jobRoutes = require('./routes/jobRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const applicationRoutes = require('./routes/applicationRoutes')

const app = express()

app.use(helmet())
app.use(cors(createCorsOptions()))
app.use(express.json({ limit: '64kb' }))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/health', healthRoutes)
app.use('/api/jobs', jobRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/applications', applicationRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
