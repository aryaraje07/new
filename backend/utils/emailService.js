import nodemailer from "nodemailer";

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send grievance email notification
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject
 * @param {String} text - Email text content
 * @param {String} html - Email HTML content (optional)
 * @returns {Promise} - Nodemailer send response
 */
export const sendGrievanceEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send grievance notification to faculty
 * @param {Object} faculty - Faculty user object
 * @param {Object} student - Student user object
 * @param {String} grievanceText - Initial grievance text
 * @param {String} synthesizedMessage - AI synthesized message
 * @returns {Promise} - Email send result
 */
export const notifyFacultyOfGrievance = async (
  faculty,
  student,
  grievanceText,
  synthesizedMessage
) => {
  const subject = "New Grievance Assigned - Action Required";
  const text = `
Dear ${faculty.fullName},

A new grievance has been assigned to you:

Student: ${student.fullName} (${student.email})
Grievance: ${grievanceText}

AI Synthesized Message:
${synthesizedMessage}

Please review and take appropriate action.

Best regards,
SkillifyAI Grievance System
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Grievance Assigned</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Student:</strong> ${student.fullName} (${student.email})</p>
        <p><strong>Grievance:</strong> ${grievanceText}</p>
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 3px; margin: 15px 0;">
          <p><strong>AI Synthesized Message:</strong></p>
          <p>${synthesizedMessage}</p>
        </div>
      </div>
      <p style="color: #666;">Please review and take appropriate action.</p>
      <p style="color: #666;">Best regards,<br>SkillifyAI Grievance System</p>
    </div>
  `;

  return await sendGrievanceEmail(faculty.email, subject, text, html);
};

/**
 * Send grievance notification to parent
 * @param {Object} parent - Parent user object
 * @param {Object} student - Student user object
 * @param {String} grievanceText - Initial grievance text
 * @returns {Promise} - Email send result
 */
export const notifyParentOfEscalation = async (
  parent,
  student,
  grievanceText
) => {
  const subject = "Grievance Escalation Notification";
  const text = `
Dear ${parent.fullName},

A grievance submitted by your child has been escalated:

Student: ${student.fullName} (${student.email})
Grievance: ${grievanceText}

Please review the grievance and communicate with the institution if necessary.

Best regards,
SkillifyAI Grievance System
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">Grievance Escalation Notification</h2>
      <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;">
        <p><strong>Student:</strong> ${student.fullName} (${student.email})</p>
        <p><strong>Grievance:</strong> ${grievanceText}</p>
      </div>
      <p style="color: #666;">Please review the grievance and communicate with the institution if necessary.</p>
      <p style="color: #666;">Best regards,<br>SkillifyAI Grievance System</p>
    </div>
  `;

  return await sendGrievanceEmail(parent.email, subject, text, html);
};

export default {
  sendGrievanceEmail,
  notifyFacultyOfGrievance,
  notifyParentOfEscalation,
};
