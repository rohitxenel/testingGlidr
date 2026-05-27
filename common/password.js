const bcrypt = require("bcryptjs");


module.exports.setPassword = async (password) => {
  try {
    if (!password) throw new Error("Missing Password");
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.error("Error setting password:", error);
    throw new Error("Failed to set password");
  }
};

module.exports.authenticatePassword = async (password, hash) => {
  try {
    if (!password) throw new Error("Missing Password");
    const match = await bcrypt.compare(password, hash);
    if (!match) return match;
    return match
  } catch (error) {
    console.error("Error authenticating password:", error);
    return false
  }
};