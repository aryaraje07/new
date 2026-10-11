const mongoose = require('mongoose')
require('dotenv').config()

async function fixApplicationIndex() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const Application = require('../models/Application')

    // Get the collection
    const collection = mongoose.connection.collection('applications')

    // Drop the existing unique index on candidateId and jobId
    try {
      await collection.dropIndex('candidateId_1_jobId_1')
      console.log('Dropped existing candidateId_1_jobId_1 index')
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('Index candidateId_1_jobId_1 does not exist, skipping drop')
      } else {
        console.error('Error dropping index:', error.message)
      }
    }

    // Recreate the index with sparse option
    await collection.createIndex(
      { candidateId: 1, jobId: 1 },
      { unique: true, sparse: true, name: 'candidateId_1_jobId_1' }
    )
    console.log('Created sparse unique index on candidateId and jobId')

    // Verify the index
    const indexes = await collection.indexes()
    console.log('Current indexes:', indexes)

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixApplicationIndex()
