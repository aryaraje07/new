import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import User from '../models/User.js'
import bcrypt from 'bcryptjs'

dotenv.config()

const run = async () => {
  try {
    await connectDB()
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    const fullName = process.env.ADMIN_NAME || 'Administrator'

    if (!email || !password) {
      console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in env')
      process.exit(1)
    }

    let user = await User.findOne({ email })
    if (user) {
      console.log('Admin already exists')
      process.exit(0)
    }

    const hashed = await bcrypt.hash(password, 10)

    user = await User.create({
      fullName,
      email,
      phone: '0000000000',
      password: hashed,
      role: 'admin'
    })

    console.log('Admin created:', user._id)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
