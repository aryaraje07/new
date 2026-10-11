const mongoose = require('mongoose')
require('dotenv').config()

async function checkAllApps() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const Application = require('../models/Application')
    const User = require('../models/User')
    const Job = require('../models/Job')

    // Find all applications
    const applications = await Application.find({}).lean()
    console.log(`\nTotal applications: ${applications.length}`)

    if (applications.length === 0) {
      console.log('No applications found in database.')
    } else {
      for (const app of applications) {
        console.log(`\n--- Application ID: ${app._id} ---`)
        console.log(`Candidate ID: ${app.candidateId}`)
        console.log(`Job ID: ${app.jobId}`)
        console.log(`Employer ID: ${app.employerId}`)
        console.log(`Status: ${app.status}`)
        console.log(`Workflow State: ${app.workflowState}`)
        console.log(`Resume ID: ${app.resumeId}`)
        console.log(`Match Score: ${app.matchScore}`)
        console.log(`Created At: ${app.createdAt}`)
        console.log(`Updated At: ${app.updatedAt}`)
      }
    }

    // Check for any corrupted applications
    const corrupted = await Application.find({
      $or: [
        { candidateId: null },
        { jobId: null },
        { employerId: null },
        { candidateId: { $exists: false } },
        { jobId: { $exists: false } },
        { employerId: { $exists: false } }
      ]
    })
    console.log(`\nCorrupted applications (null/missing IDs): ${corrupted.length}`)

    if (corrupted.length > 0) {
      console.log('Deleting corrupted applications...')
      const result = await Application.deleteMany({
        $or: [
          { candidateId: null },
          { jobId: null },
          { employerId: null },
          { candidateId: { $exists: false } },
          { jobId: { $exists: false } },
          { employerId: { $exists: false } }
        ]
      })
      console.log(`Deleted ${result.deletedCount} corrupted applications`)
    }

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAllApps()
