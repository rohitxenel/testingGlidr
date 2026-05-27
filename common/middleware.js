const jwt = require("jsonwebtoken");
const Model = require("../models/mongo");
const Query = require("../quries/dynamo/operations");
const Table = require("./table");




module.exports.getToken = (data) =>
  jwt.sign(data, process.env.SECRET_KEY, { expiresIn: "30 days" });

module.exports.verifyToken = (token) =>
  jwt.verify(token, process.env.SECRET_KEY);

module.exports.verify = (...args) => async (req, res, next) => {
  try {
    const roles = [].concat(args).map((role) => role.toLowerCase());
    const token = String(req.headers.authorization || "")
      .replace(/bearer|jwt/i, "")
      .replace(/^\s+|\s+$/g, "");
      console.log({token})
    let decoded;
    if (token) decoded = this.verifyToken(token);
    let doc = null;
    let role = "";
    if (!decoded && roles.includes("guest")) {
      role = "guest";
      return next();
    }

    if (roles.includes("user")) {
      role = "user";

      const { Item } = await Query.getSingleItemById(Table.User, decoded.id)
      if (Item && !Item.isBlock && Item.accessToken === token) doc = Item

    }
    if (roles.includes("admin")) {
      role = "admin";
      console.log({admin})

      const admin = await Model.Admin.findById(decoded.id).populate("role");
      if (admin && !admin.isBlocked && !admin.isDeleted && admin.Token === token) {
        doc = admin;
      }
    }


    if (!doc) throw new Error("INVALID_TOKEN");
    if (role && doc && typeof doc.toJSON === 'function') {
      req[role] = doc.toJSON();
    } else if (role && doc) {
      // Fallback if doc is a plain object or toJSON is not available
      req[role] = doc;
    }

    // proceed next
    next();
  } catch (error) {
    console.error(error);
    const message =
      String(error.name).toLowerCase() === "error"
        ? error.message
        : "UNAUTHORIZED_ACCESS";
    return res.error(402, message);
  }
};


module.exports.isOptionalAuth = (...args) => async (req, res, next) => {

  try {
    const roles = [].concat(args).map((role) => role.toLowerCase());
    const token = String(req.headers.authorization || "")
      .replace(/bearer|jwt/i, "")
      .replace(/^\s+|\s+$/g, "");
    let decoded;
    if (token) decoded = this.verifyToken(token);
    let doc = null;
    let role = "";
    if (!decoded && roles.includes("guest")) {
      role = "guest";
      return next();
    }
    if (roles.includes("vender")) {
      role = "vender";
      doc = await Model.Vender.findOne({
        _id: decoded._id,
        accessToken: token,
        isBlocked: false,
        isDeleted: false,
      });
    }
    if (roles.includes("user")) {
      role = "user";

      const { Item } = await Query.getSingleItemById(Table.User, decoded.id)
      if (Item && !Item.isBlock && Item.accessToken === token) doc = Item

    }
    if (roles.includes("admin")) {
      role = "admin";

      const { Item } = await Query.getSingleItemById(Table.Admin, decoded.id)
      if (Item && !Item.isBlock && Item.accessToken === token) doc = Item

    }

    if (!doc) throw new Error("INVALID_TOKEN");
    if (role && doc && typeof doc.toJSON === 'function') {
      req[role] = doc.toJSON();
    } else if (role && doc) {
      // Fallback if doc is a plain object or toJSON is not available
      req[role] = doc;
    }
    // proceed next
    next();
  } catch (error) {
    next();
  }
};



