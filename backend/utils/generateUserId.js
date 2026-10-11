export const generateRoleId = (role) => {
  // Last 4 digits of current timestamp
  const timePart = Date.now().toString().slice(-4);

  // Random 2-digit number
  const randomPart = Math.floor(10 + Math.random() * 90);

  const unique6Digit = `${timePart}${randomPart}`;

  if (role === "learner" || role === "student") return `OFF-${unique6Digit}`;
  if (role === "trainer" || role === "faculty") return `TRN-${unique6Digit}`;
  if (role === "parent") return `PAR-${unique6Digit}`;
  if (role === "admin") return `ADM-${unique6Digit}`;

  throw new Error("Invalid role");
};
