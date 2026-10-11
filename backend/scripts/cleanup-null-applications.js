const mongoose = require('mongoose')
require('dotenv').config()

async function cleanupNullApplications() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const Application = require('../models/Application')

    // Find and delete applications with null candidateId or jobId
    const result = await Application.deleteMany({
      $or: [
        { candidateId: null },
        { jobId: null },
        { candidateId: { $exists: false } },
        { jobId: { $exists: false } }
      ]
    })

    console.log(`Deleted ${result.deletedCount} applications with null candidateId or jobId`)

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

cleanupNullApplications()
