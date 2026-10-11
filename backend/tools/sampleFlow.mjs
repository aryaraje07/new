import dotenv from 'dotenv'
dotenv.config()
import connectDB from '../config/db.js'
import User from '../models/User.js'
import Exam from '../models/Exam.js'
import Semester from '../models/Semester.js'
import ExamAttempt from '../models/ExamAttempt.js'
import mongoose from 'mongoose'

const run = async ()=>{
  try{
    await connectDB()

    // 1. Ensure faculty
    let faculty = await User.findOne({ email: 'faculty@local' })
    if(!faculty){
      faculty = await User.create({ fullName: 'Faculty One', email: 'faculty@local', phone: '0000000000', password: 'Pass1234', role: 'faculty', facultyId: 'FAC001' })
      console.log('Created faculty', faculty._id)
    } else console.log('Found faculty', faculty._id)

    // 2. Ensure student
    let student = await User.findOne({ email: 'student@local' })
    if(!student){
      student = await User.create({ fullName: 'Student One', email: 'student@local', phone: '0000000001', password: 'Pass1234', role: 'student', studentId: 'STU001', educationLevel: 'High School' })
      console.log('Created student', student._id)
    } else console.log('Found student', student._id)

    // 3. Find semester
    const semester = await Semester.findOne({ name: 'Spring 2026' })
    if(!semester){
      console.error('Semester Spring 2026 not found. Aborting.')
      process.exit(1)
    }
    console.log('Using semester', semester._id)

    // 4. Create sample exam
    const exam = await Exam.create({
      title: 'Sample Exam for Spring 2026',
      description: 'Auto-created sample exam',
      faculty: faculty._id,
      duration: 30,
      totalQuestions: 1,
      questions: [
        { questionId: 'q1', question: '2+2 = ?', options: ['3','4','5','6'], correctAnswer: 1 }
      ],
      status: 'APPROVED',
      scope: 'ALL',
      semester: semester._id,
    })

    console.log('Created exam', exam._id)

    // 5. Create exam attempt by student and submit
    const attempt = await ExamAttempt.create({
      exam: exam._id,
      student: student._id,
      totalQuestions: exam.totalQuestions,
      answers: [ { questionId: 'q1', selectedOption: 1 } ],
      score: 1,
      submittedAt: new Date(),
      status: 'SUBMITTED'
    })

    console.log('Created attempt', attempt._id, 'score', attempt.score)

    // 6. Mark semester results declared
    semester.hasResultsDeclared = true
    await semester.save()
    console.log('Marked semester declared')

    // Done summary
    console.log({ examId: String(exam._id), attemptId: String(attempt._id), studentId: String(student._id), semesterId: String(semester._id) })

    await mongoose.disconnect()
    process.exit(0)
  }catch(err){
    console.error(err)
    process.exit(1)
  }
}

run()
