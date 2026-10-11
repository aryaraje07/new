const mongoose = require('mongoose')
require('dotenv').config()

async function dropAllCustomIndexes() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const collection = mongoose.connection.collection('applications')

    // Get all indexes
    const indexes = await collection.indexes()
    console.log('\nAll indexes before cleanup:')
    indexes.forEach(idx => {
      console.log(`- Name: ${idx.name}, Key: ${JSON.stringify(idx.key)}`)
    })

    // Drop all indexes except _id_
    for (const idx of indexes) {
      if (idx.name !== '_id_') {
        console.log(`\nDropping index: ${idx.name}`)
        try {
          await collection.dropIndex(idx.name)
          console.log(`Successfully dropped: ${idx.name}`)
        } catch (error) {
          console.error(`Error dropping ${idx.name}:`, error.message)
        }
      }
    }

    // Recreate the correct index
    console.log('\nRecreating correct sparse unique index...')
    await collection.createIndex(
      { candidateId: 1, jobId: 1 },
      { unique: true, sparse: true, name: 'candidateId_1_jobId_1' }
    )
    console.log('Successfully created sparse unique index')

    // Recreate employer index
    console.log('\nRecreating employer index...')
    await collection.createIndex(
      { employerId: 1, status: 1, createdAt: -1 },
      { name: 'employerId_1_status_1_createdAt_-1' }
    )
    console.log('Successfully created employer index')

    // Verify final indexes
    const finalIndexes = await collection.indexes()
    console.log('\nFinal indexes after cleanup:')
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

dropAllCustomIndexes()
