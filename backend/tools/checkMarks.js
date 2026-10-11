import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config() // auto loads .env from backend folder

const fetch = globalThis.fetch;

(async () => {
  try {
    const studentId = '6999ca3a84087acb38b267a7'

    const token = jwt.sign(
      { id: studentId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '1d' }
    )

    console.log('Using token for student', studentId)

    const semesterId = '6999c66066ab4819efff9ad6'

    const marksRes = await fetch(
      `https://logic-legends-d00z.onrender.com/api/student/marksheets/${semesterId}`,
      {
        headers: {
          Authorization: 'Bearer ' + token
        }
      }
    )

    const marksJson = await marksRes.json()

    console.log('marksheets:', JSON.stringify(marksJson, null, 2))

  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})();