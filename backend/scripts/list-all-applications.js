const mongoose = require('mongoose')
require('dotenv').config()

async function listAllApplications() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const Application = require('../models/Application')

    // List all applications
    const applications = await Application.find({}).lean()
    console.log(`Total applications: ${applications.length}`)

    applications.forEach((app, index) => {
      console.log(`\n${index + 1}. ID: ${app._id}`)
      console.log(`   Candidate ID: ${app.candidateId}`)
      console.log(`   Job ID: ${app.jobId}`)
      console.log(`   Employer ID: ${app.employerId}`)
      console.log(`   Status: ${app.status}`)
      console.log(`   Workflow State: ${app.workflowState}`)
    })

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

listAllApplications()
