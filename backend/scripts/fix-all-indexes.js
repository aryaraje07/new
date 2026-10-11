const mongoose = require('mongoose')
require('dotenv').config()

async function fixAllIndexes() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const collection = mongoose.connection.collection('applications')

    // Get all indexes
    const indexes = await collection.indexes()
    console.log('\nCurrent indexes on applications collection:')
    indexes.forEach(idx => {
      console.log(`- Name: ${idx.name}, Key: ${JSON.stringify(idx.key)}, Unique: ${idx.unique || false}, Sparse: ${idx.sparse || false}`)
    })

    // Drop any index with 'candidate' field (should be 'candidateId')
    for (const idx of indexes) {
      if (idx.key && idx.key.candidate !== undefined) {
        console.log(`\nDropping index with 'candidate' field: ${idx.name}`)
        try {
          await collection.dropIndex(idx.name)
          console.log(`Successfully dropped index: ${idx.name}`)
        } catch (error) {
          console.error(`Error dropping index ${idx.name}:`, error.message)
        }
      }
    }

    // Delete all documents with null or missing candidateId or jobId
    console.log('\nDeleting documents with null/missing candidateId or jobId...')
    const deleteResult = await collection.deleteMany({
      $or: [
        { candidateId: null },
        { jobId: null },
        { candidateId: { $exists: false } },
        { jobId: { $exists: false } }
      ]
    })
    console.log(`Deleted ${deleteResult.deletedCount} documents`)

    // Recreate the correct index
    console.log('\nCreating correct sparse unique index on candidateId and jobId...')
    try {
      await collection.createIndex(
        { candidateId: 1, jobId: 1 },
        { unique: true, sparse: true, name: 'candidateId_1_jobId_1' }
      )
      console.log('Successfully created sparse unique index')
    } catch (error) {
      console.error('Error creating index:', error.message)
    }

    // Verify final indexes
    const finalIndexes = await collection.indexes()
    console.log('\nFinal indexes on applications collection:')
    finalIndexes.forEach(idx => {
      console.log(`- Name: ${idx.name}, Key: ${JSON.stringify(idx.key)}, Unique: ${idx.unique || false}, Sparse: ${idx.sparse || false}`)
    })

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixAllIndexes()
