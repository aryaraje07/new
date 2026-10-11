const mongoose = require('mongoose')
require('dotenv').config()

async function checkOldSchema() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const collection = mongoose.connection.collection('applications')

    // Find documents with old field names
    const oldSchemaDocs = await collection.find({
      $or: [
        { candidate: { $exists: true } },
        { job: { $exists: true } }
      ]
    }).toArray()

    console.log(`\nDocuments with old field names (candidate/job): ${oldSchemaDocs.length}`)

    if (oldSchemaDocs.length > 0) {
      console.log('Found documents with old schema:')
      oldSchemaDocs.forEach((doc, i) => {
        console.log(`\n${i + 1}. ID: ${doc._id}`)
        console.log(`   candidate: ${doc.candidate}`)
        console.log(`   job: ${doc.job}`)
        console.log(`   candidateId: ${doc.candidateId}`)
        console.log(`   jobId: ${doc.jobId}`)
      })

      console.log('\nDeleting documents with old schema...')
      const result = await collection.deleteMany({
        $or: [
          { candidate: { $exists: true } },
          { job: { $exists: true } }
        ]
      })
      console.log(`Deleted ${result.deletedCount} documents with old schema`)
    }

    // Check all documents
    const allDocs = await collection.find({}).toArray()
    console.log(`\nTotal documents in applications collection: ${allDocs.length}`)

    allDocs.forEach((doc, i) => {
      console.log(`\n${i + 1}. ID: ${doc._id}`)
      console.log(`   candidateId: ${doc.candidateId}`)
      console.log(`   jobId: ${doc.jobId}`)
      console.log(`   employerId: ${doc.employerId}`)
      console.log(`   status: ${doc.status}`)
    })

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkOldSchema()
