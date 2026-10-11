import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve('SkillifyAI/backend/.env') })

import connectDB from '../config/db.js'
import User from '../models/User.js'
import Semester from '../models/Semester.js'
import Exam from '../models/Exam.js'
import ExamAttempt from '../models/ExamAttempt.js'

const run = async () => {
  await connectDB()

  // find a semester (prefer Spring 2026)
  const semester = await Semester.findOne({ name: 'Spring 2026' }) || await Semester.findOne()
  if (!semester) {
    console.error('No semester found. Create a semester first.')
    process.exit(1)
  }

  // find a student
  const student = await User.findOne({ role: 'student' })
  if (!student) {
    console.error('No student found. Create a student first.')
    process.exit(1)
  }

  // find faculty
  const faculty = await User.findOne({ role: 'faculty' })

  // find or create an exam in this semester
  let exam = await Exam.findOne({ semester: semester._id })
  if (!exam) {
    exam = await Exam.create({
      title: `Auto Seed Exam for ${semester.name}`,
      subject: 'AutoSubject',
      faculty: faculty ? faculty._id : student._id,
      totalQuestions: 10,
      duration: 60,
      questions: [],
      status: 'SCHEDULED',
      semester: semester._id,
      scheduledAt: new Date(),
    })
    console.log('Created exam', exam._id)
  } else {
    if (!exam.scheduledAt) {
      exam.scheduledAt = new Date()
      await exam.save()
    }
  }

  // create exam attempt finalized
  const attempt = await ExamAttempt.create({
    exam: exam._id,
    student: student._id,
    answers: [],
    score: 8,
    totalQuestions: exam.totalQuestions || 10,
    startedAt: new Date(Date.now() - 1000 * 60 * 30),
    submittedAt: new Date(),
    status: 'SUBMITTED'
  })

  console.log('Created attempt', String(attempt._id))
  // ensure semester results declared
  semester.hasResultsDeclared = true
  await semester.save()

  process.exit(0)
}

run().catch(e=>{console.error(e); process.exit(1)})
