const jwt = require("jsonwebtoken");
const Query = require("../queries/mongo/DBQueries");
const Model = require("../models/mongo");

module.exports.getToken = (data) =>
  jwt.sign(data, process.env.SECRET_KEY, { expiresIn: "30 days" });

module.exports.verifyToken = (token) =>
  jwt.verify(token, process.env.SECRET_KEY);

module.exports.verify =
  (...args) =>
  async (req, res, next) => {
    try {
      const roles = [].concat(args).map((role) => role.toLowerCase());
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.replace(/bearer|jwt/i, "").trim();

      if (!token) return res.error(401, "Token required");

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.SECRET_KEY);
      } catch (err) {
        return res.error(401, "Invalid or expired token");
      }

      let doc = null;
      let role = "";

      if (roles.includes("guest")) {
        role = "guest";
        return next();
      }

      if (roles.includes("user")) {
        role = "user";
        const filter = { _id: decoded.id };
        const user = await Query.findOne(Model.User, filter);
        if (user && !user.isBlocked && !user.isDeleted && user.accessToken === token) {
          doc = user;
        }
      }

      if (roles.includes("driver")) {
        role = "driver";
        const filter = { _id: decoded.id };
        const driver = await Query.findOne(Model.Driver, filter);
        if (driver && !driver.isBlocked && !driver.isDeleted && driver.accessToken === token) {
          doc = driver;
        }
      }

      if (roles.includes("admin")) {
        role = "admin";
        const filter = { _id: decoded.id };
        const admin = await Query.findOne(Model.Admin, filter ,null ,"role");
        if (admin && !admin.isBlocked && !admin.isDeleted && admin.Token === token) {
          doc = admin;
        }
      }

      if (!doc) throw new Error("Session has been expired, Please login.");

      req[role] = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
      req.id = doc._id;
      next();
    } catch (error) {
      console.error("JWT Middleware Error:", error);
      return res.error(401, error.message || "UNAUTHORIZED_ACCESS");
    }
  };


const key = "ro9f8tuygoridetyopidrhftoiyhjdtoriy";
module.exports.encrypt = (text) => {
  try {
    const algorithm = "aes-256-cbc";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(key, "utf-8"),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
};

module.exports.decrypt = (text) => {
  try {
    const algorithm = "aes-256-cbc";
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(key, "utf-8"),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    throw error;
  }
};
