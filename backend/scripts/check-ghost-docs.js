const mongoose = require('mongoose')
require('dotenv').config()

async function checkGhostDocs() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const db = mongoose.connection.db
    const collection = db.collection('applications')

    // Check for documents with ANY candidate or job field
    const ghostDocs = await collection.find({
      $or: [
        { candidate: { $exists: true } },
        { job: { $exists: true } },
        { candidateId: null },
        { jobId: null }
      ]
    }).toArray()

    console.log(`\nDocuments with old fields or null values: ${ghostDocs.length}`)

    if (ghostDocs.length > 0) {
      console.log('Found ghost documents:')
      ghostDocs.forEach((doc, i) => {
        console.log(`\n${i + 1}. ID: ${doc._id}`)
        console.log(`   candidate: ${doc.candidate}`)
        console.log(`   job: ${doc.job}`)
        console.log(`   candidateId: ${doc.candidateId}`)
        console.log(`   jobId: ${doc.jobId}`)
        console.log(`   Full doc:`, JSON.stringify(doc, null, 2))
      })

      console.log('\nDeleting ghost documents...')
      const result = await collection.deleteMany({
        $or: [
          { candidate: { $exists: true } },
          { job: { $exists: true } },
          { candidateId: null },
          { jobId: null }
        ]
      })
      console.log(`Deleted ${result.deletedCount} ghost documents`)
    }

    // Count all documents
    const totalCount = await collection.countDocuments({})
    console.log(`\nTotal documents after cleanup: ${totalCount}`)

    // Drop and recreate indexes
    console.log('\nDropping all custom indexes...')
    const indexes = await collection.indexes()
    for (const idx of indexes) {
      if (idx.name !== '_id_') {
        try {
          await collection.dropIndex(idx.name)
          console.log(`Dropped index: ${idx.name}`)
        } catch (e) {
          console.error(`Error dropping ${idx.name}:`, e.message)
        }
      }
    }

    console.log('\nRecreating sparse unique index...')
    await collection.createIndex(
      { candidateId: 1, jobId: 1 },
      { unique: true, sparse: true, name: 'candidateId_1_jobId_1' }
    )
    console.log('Index created successfully')

    await collection.createIndex(
      { employerId: 1, status: 1, createdAt: -1 },
      { name: 'employerId_1_status_1_createdAt_-1' }
    )
    console.log('Employer index created successfully')

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkGhostDocs()
