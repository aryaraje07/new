const mongoose = require('mongoose')
require('dotenv').config()

async function checkAllDocsRaw() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const db = mongoose.connection.db
    const collection = db.collection('applications')

    // Count all documents
    const count = await collection.countDocuments({})
    console.log(`\nTotal documents: ${count}`)

    // Get all documents without using model
    const allDocs = await collection.find({}).toArray()
    console.log(`Found ${allDocs.length} documents`)

    if (allDocs.length > 0) {
      allDocs.forEach((doc, i) => {
        console.log(`\n--- Document ${i + 1} ---`)
        console.log(`_id: ${doc._id}`)
        console.log(`candidateId: ${doc.candidateId}`)
        console.log(`jobId: ${doc.jobId}`)
        console.log(`employerId: ${doc.employerId}`)
        console.log(`status: ${doc.status}`)
        console.log(`Full document:`, JSON.stringify(doc, null, 2))
      })
    }

    // Delete all documents
    if (allDocs.length > 0) {
      console.log('\nDeleting all documents...')
      const result = await collection.deleteMany({})
      console.log(`Deleted ${result.deletedCount} documents`)
    }

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAllDocsRaw()
