const mongoose = require('mongoose')
require('dotenv').config()

async function checkNullApplications() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const Application = require('../models/Application')

    // Find applications with null or missing candidateId or jobId
    const nullApps = await Application.find({
      $or: [
        { candidateId: null },
        { jobId: null },
        { candidateId: { $exists: false } },
        { jobId: { $exists: false } }
      ]
    })

    console.log(`Found ${nullApps.length} applications with null candidateId or jobId`)

    if (nullApps.length > 0) {
      console.log('Deleting these applications...')
      const result = await Application.deleteMany({
        $or: [
          { candidateId: null },
          { jobId: null },
          { candidateId: { $exists: false } },
          { jobId: { $exists: false } }
        ]
      })
      console.log(`Deleted ${result.deletedCount} applications`)
    }

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkNullApplications()
