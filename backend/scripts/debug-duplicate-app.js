const mongoose = require('mongoose')
require('dotenv').config()

async function debugDuplicateApp() {
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

    // Group by candidateId and jobId
    const grouped = {}
    applications.forEach(app => {
      const key = `${app.candidateId}_${app.jobId}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(app)
    })

    // Find duplicates
    console.log('\nChecking for duplicates...')
    for (const [key, apps] of Object.entries(grouped)) {
      if (apps.length > 1) {
        console.log(`\nDuplicate found for ${key}:`)
        apps.forEach((app, i) => {
          console.log(`  ${i + 1}. ID: ${app._id}, Status: ${app.status}, Workflow: ${app.workflowState}`)
        })
      }
    }

    // Check for null values
    console.log('\nChecking for null values...')
    const nullApps = await Application.find({
      $or: [
        { candidateId: null },
        { jobId: null },
        { candidateId: { $exists: false } },
        { jobId: { $exists: false } }
      ]
    })
    console.log(`Applications with null candidateId or jobId: ${nullApps.length}`)
    nullApps.forEach((app, i) => {
      console.log(`  ${i + 1}. ID: ${app._id}, candidateId: ${app.candidateId}, jobId: ${app.jobId}`)
    })

    // Delete null applications if found
    if (nullApps.length > 0) {
      console.log('\nDeleting applications with null values...')
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
    console.log('\nDisconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

debugDuplicateApp()
