const User = require("../models/User");
const Notification = require("../models/Notification");

const notifyParentInApp = async (studentId) => {
  const student = await User.findById(studentId).populate("parents");

  if (!student.parents || student.parents.length === 0) return;

  for (const parent of student.parents) {
    await Notification.create({
      userId: parent._id,
      title: "⚠️ Emotional Support Alert",
      message: `${student.fullName} has shown repeated stress signals. Please check in and provide support.`,
      type: "alert",
    });
  }
};

module.exports = { notifyParentInApp };
