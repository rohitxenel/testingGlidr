const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const FireQuery = require("../../queries/firestore/operations");
const { broadcast } = require("../../connections/firebase");
const { setPassword, authenticatePassword } = require("../../common/password")
const { sendOtp, verifyCode } = require('../../services/sendPhoneOtp')
const service = require('../../services')
const Auth = require("../../common/authenticate");
const functions = require("../../common/functions");
const { stubFalse } = require("lodash");


const formateCode = (code) => code.replace('+', '')

module.exports.SignUp = async (req, res, next) => {
  try {
    const { name, code, phone, email, password, type } = req.body || {};
    if (!phone) return res.error(400, "Mobile Number required");
    if (!code) return res.error(400, "Code  required");
    if (!name) return res.error(400, "Name  required");

    if (email && !(await functions.validateEmailAsync(email)))
      return res.error(400, "Invalid email format.");

    let Password = null;
    let isEmailVerified = true
    if (type !== "google") {
      if (!password) return res.error(400, "Password is required");
      if (password.length < 6) return res.error(400, "Password must be at least 6 characters long");
      Password = await setPassword(password);
      isEmailVerified = false
    }

    const phoneWithCode = `${formateCode(code)}${phone}`;
    const existingUser = await Queries.findOne(Model.User, { phone: phoneWithCode });
    const codeData = await functions.getCountryDetailsByCode(code)
    const cleanName = name.toLowerCase().trim();
    if (email) {
      const existingEmailUser = await Queries.findOne(Model.User, {
        email: email.toLowerCase(),
        phone: { $ne: phoneWithCode } // ignore current phone
      });
      if (existingEmailUser) return res.error(400, "Email is already in use by another account.");
    }

    if (existingUser) {
      if (!existingUser.isPhoneVerified) {
        Object.assign(existingUser, { name: cleanName, email });
        if (Password) existingUser.password = Password;
        await sendOtp({ dialCode: code, phoneNo: phone });
        return res.success("OTP sent successfully", { phone });
      }
      return res.error(400, "Already signed up. Please login.");
    }

    await Queries.insertOne(Model.User, {
      name: cleanName,
      phone: phoneWithCode,
      email,
      password: Password,
      type: type || "phone",
      isEmailVerified: isEmailVerified,
      country: codeData?.countryName,
      currency: codeData?.currency
    });

    await sendOtp({ dialCode: code, phoneNo: phone });
    return res.success("OTP sent successfully", { phone });
  } catch (error) {
    next(error);
  }
};


module.exports.VerifyOtp = async (req, res, next) => {
  try {
    const { code, phone, otp, fcmToken } = req.body || {};

    if (!phone) return res.error(400, "Moble Number is required");
    if (!code) return res.error(400, "Code  required");
    if (!otp) return res.error(400, "OTP required");
    const staticOtp = 1234
    const user = await Queries.findOne(Model.User, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "User not found");

    if (user.isPhoneVerified) return res.error(400, "Phone number is already verified. Please login.");

    let verification = {};

    if (staticOtp === Number(otp)) {
      verification.status = "approved"
      return res.error(400, "Invalid or expired OTP.");

    } else {
      verification = await verifyCode(code, phone, otp)
    }
    const Token = Auth.getToken({ id: user?._id, phone: user?.phone, });
    if (verification && verification.status === "approved") {
      await Queries.updateOne(Model.User, { phone: `${formateCode(code)}${phone}` }, { isPhoneVerified: true, accessToken: Token, fcmToken: fcmToken });
      await service.Email.sendEmailtoSignupUser(user?.email, "You're In! Start Riding with Glidr", user?.name)
      return res.success("Phone number verified successfully.", { name: user?.name, phone: user?.phone, accessToken: Token });
    } else {
      return res.error(400, "Invalid or expired OTP.");
    }
  } catch (error) {
    next(error);
  }
};


module.exports.ResendOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body || {};

    if (!phone) return res.error(400, "Mobile number is required.");
    if (!code) return res.error(400, "code is required.");

    const user = await Queries.findOne(Model.User, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "User not found.");

    if (user.isPhoneVerified) {
      return res.error(400, "Moble number is already verified. Please login.");
    }

    await sendOtp({ dialCode: code, phoneNo: phone });

    return res.success("OTP Resend successfully. Please verify your phone number.", { phone, code });

  } catch (error) {
    next(error);
  }
};


module.exports.CheckUser = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    if (!email) return res.error(400, "email is required.");

    const user = await Queries.findOne(Model.User, { email });

    if (!user) return res.success("User not found.", { PhoneVerified: false });

    if (!user.isPhoneVerified) {
      return res.success("Phone number is Not verified. Please verify your phone number.", { PhoneVerified: false });
    }


    return res.success("Phone number is  verified. Please Login.", { PhoneVerified: true });

  } catch (error) {
    next(error);
  }
};

module.exports.Login = async (req, res, next) => {
  try {
    const { phone, code, password, type, email, fcmToken } = req.body || {};

    let user;

    if (type === "google") {
      if (!email) return res.error(400, "Email is required for Google login");

      user = await Queries.findOne(Model.User, { email });
      if (!user) return res.error(404, "Account not found. Please sign up first.");

      if (user.isBlocked) return res.error(403, "Your account is temporarily blocked, contact support.");
      if (user.isDeleted) return res.error(403, "Your account is permanently deleted.");
    }
    else {
      if (!phone) return res.error(400, "Mobile Number is required");
      if (!code) return res.error(400, " code is required");
      if (!password) return res.error(400, "password is required");

      user = await Queries.findOne(Model.User, { phone: `${formateCode(code)}${phone}` });
      if (!user) return res.error(404, "Account not found. Please sign up first.");

      const isMatch = await authenticatePassword(password, user.password);
      if (!isMatch) return res.error(400, "Incorrect password.");
    }

    // 🔹 Common checks for both logins
    if (user.isBlocked) return res.error(403, "Your account is temporarily blocked, contact support.");
    if (user.isDeleted) return res.error(403, "Your account is permanently deleted.");
    if (!user.isPhoneVerified && type !== "google") return res.error(403, "mobile number not verified. Please verify first.");

    // 🔹 Generate token
    const token = Auth.getToken({ id: user._id, phone: user.phone, email: user.email });
    user.accessToken = token;
    user.fcmToken = fcmToken || user.fcmToken;
    await user.save();

    return res.success("Login successful", {
      id: user?._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      accessToken: token,
      profileImage: user?.profileImage
    });
  } catch (error) {
    next(error);
  }
};


module.exports.SendOtpOnForgatePassword = async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) return res.error(400, "Phone number is required");

    const user = await Queries.findOne(Model.User, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "Account not found. Please sign up first.");

    if (!user.isPhoneVerified) {
      return res.error(403, "Phone number is not verified. Please complete signup first.");
    }

    await sendOtp({ dialCode: code, phoneNo: phone });
    return res.success("OTP sent successfully for password reset.", { phone, code });

  } catch (error) {
    next(error);
  }
};



module.exports.SetNewPassword = async (req, res, next) => {
  try {
    const { code, phone, newPassword } = req.body || {};

    if (!code || !phone || !newPassword) return res.error(400, "Code ,Phone,  and new password are required.");

    if (newPassword.length < 6) return res.error(400, "New password must be at least 6 characters long.");

    const user = await Queries.findOne(Model.User, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "Account not found. Please sign up first.");

    const hashedPassword = await setPassword(newPassword)

    await Queries.updateOne(Model.User, { phone: `${formateCode(code)}${phone}` }, { password: hashedPassword });
    await service.Email.sendUserPasswordChangeSuccessEmail(user?.email, "Your password change successfully", user?.name)

    return res.success("Password updated successfully. Please log in with your new password.", { phone, code });

  } catch (error) {
    next(error);
  }
};


module.exports.ForgatepasswordOtpVerify = async (req, res, next) => {
  try {
    const { code, phone, otp } = req.body || {};

    if (!phone) return res.error(400, "Moble Number is required");
    if (!code) return res.error(400, "Code  required");
    if (!otp) return res.error(400, "OTP required");
    const staticOtp = 1234
    const user = await Queries.findOne(Model.User, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "User not found");


    let verification = {};

    if (staticOtp === Number(otp)) {
      verification.status = "approved"
      return res.error(400, "Invalid or expired OTP.");

    } else {
      verification = await verifyCode(code, phone, otp)
    }
    const Token = Auth.getToken({ id: user?._id, phone: user?.phone, });
    if (verification && verification.status === "approved") {
      await Queries.updateOne(Model.User, { phone: `${formateCode(code)}${phone}` }, { isPhoneVerified: true, accessToken: Token });
      return res.success("Phone number verified successfully.", { name: user?.name, phone: user?.phone, accessToken: Token });
    } else {
      return res.error(400, "Invalid or expired OTP.");
    }
  } catch (error) {
    next(error);
  }
};


module.exports.ResendOtpOnForgatePassword = async (req, res, next) => {
  try {
    const { phone, code } = req.body || {};

    if (!phone) return res.error(400, "Mobile number is required.");
    if (!code) return res.error(400, "code is required.");

    const user = await Queries.findOne(Model.User, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "User not found.");

    await sendOtp({ dialCode: code, phoneNo: phone });

    return res.success("OTP Resend successfully. Please verify your phone number.", { phone, code });

  } catch (error) {
    next(error);
  }
};

module.exports.EditPassword = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { oldpassword, newPassword } = req.body;

    if (!oldpassword || !newPassword) return res.error(400, "Old Password and new password are required.");

    if (newPassword.length < 6) return res.error(400, "New password must be at least 6 characters long.");

    const user = await Queries.findOne(Model.User, { _id: auth?._id });

    if (!user) return res.error(404, "Account not found. Please sign up first.");
    const hashedPassword = await authenticatePassword(oldpassword, user?.password);
    if (hashedPassword === false) return res.error(400, "Incorrect old password")
    const NewHash = await setPassword(newPassword);
    user.password = NewHash
    user.accessToken = ''
    await user.save()
    return res.success("Password updated successfully. Please log in with your new password.", { phone: user?.phone });

  } catch (error) {
    next(error);
  }
};



module.exports.GetProfile = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const user = await Queries.findOne(Model.User, { _id: auth?._id });
    if (!user) return res.error(404, "User not found");

    return res.success("User profile get successfuly.", user);

  } catch (error) {
    next(error);
  }
};

module.exports.UpdateProfile = async (req, res, next) => {
  try {
    const auth = req?.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");
    const URL = process.env.LOCAL_URL
    const user = await Queries.findOne(Model.User, { _id: auth._id });
    if (!user) return res.error(404, "User not found");
    console.log({ user })

    const { name, password } = req.body || {};
    const profileImage = req.files?.profileImage?.[0]?.filename;
    console.log({ profileImage })
    if (name && typeof name === "string" && name.trim() !== "") {
      user.name = name.trim();
    }

    if (password && typeof password === "string" && password.trim() !== "") {
      const newHash = await setPassword(password);
      user.password = newHash;
    }
    if (profileImage) user.profileImage = `${URL}${profileImage}`

    if (!name && !password && !profileImage) {
      return res.error(400, "Nothing to update");
    }
    await user.save();

    return res.success("Profile updated successfully.", {
      _id: user._id,
      name: user.name,
    });
  } catch (error) {
    console.error("UpdateProfile Error:", error);
    next(error);
  }
};

module.exports.ChangePhone = async (req, res, next) => {
  try {
    const auth = req.user;
    const { newPhone } = req?.body
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const user = await Queries.findOne(Model.User, { phone: newPhone });
    if (user) return res.error(409, "Phone number already in use");

    await sendOtp({ dialCode: "+91", phoneNo: newPhone });

    return res.success("OTP  Sent  Successfully.");

  } catch (error) {
    next(error);
  }
};


module.exports.VerifyOtpOnChangePhone = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { newPhone, otp } = req.body || {};

    if (!newPhone || !otp) return res.error(400, "Phone and otp are required");

    const user = await Queries.findOne(Model.User, { _id: auth?._id });

    if (!user) return res.error(404, "User not found");


    const verification = await verifyCode("+91", newPhone, otp);

    if (verification && verification.status === "approved") {
      user.phone = newPhone
      await user.save()
      return res.success("Phone number verified successfully.");
    } else {
      return res.error(400, "Invalid or expired OTP.");
    }

  } catch (error) {
    next(error);
  }
};

module.exports.addEmail = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    if (!email) return res.error(400, "Email required");
    const isEmailValid = await functions.validateEmailAsync(email);
    if (!isEmailValid) return res.error(400, "Invalid email format.");

    const user = await Queries.findOne(Model.User, { email });
    if (user) return res.error(400, "Email already added. use other email")

    const otpExpiryTime = Date.now() + process.env.OTPEXPIRY;
    const otp = await functions.generateRandomNumbers(6)
    await sendEmail(email, 'Your OTP Code', otp, user?.name)
    user.email = email
    user.emailOtp = otp
    user.emailOtpExpiry = otpExpiryTime
    await user.save()
    return res.success("OTP Sent Successfully")

  } catch (error) {
    next(error);
  }
};

module.exports.ChangeEmail = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { email } = req.body || {};

    if (!email) return res.error(400, "Email required");

    const isEmailValid = await functions.validateEmailAsync(email);
    if (!isEmailValid) return res.error(400, "Invalid email format.");


    const user = await Queries.findOne(Model.User, { _id: auth?._id });
    if (!user) return res.error(400, "user not found")
    const Emailuser = await Queries.findOne(Model.User, { email: email });

    if (Emailuser) return res.error(404, "Email already added. use other email");
    const otpExpiryTime = Date.now() + process.env.OTPEXPIRY;
    const otp = await functions.generateRandomNumbers(6)
    await sendEmail(email, 'Your OTP Code', otp, user?.name)
    user.email = email
    user.emailOtp = otp
    user.emailOtpExpiry = otpExpiryTime
    user.isEmailVerified = false
    await user.save()
    return res.success("OTP Sent Successfully")

  } catch (error) {
    next(error);
  }
};


module.exports.verifyEmail = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { email, otp } = req?.body || {};

    if (!email || !otp) return res.error(400, "Email and otp  required");

    const isEmailValid = await functions.validateEmailAsync(email);
    if (!isEmailValid) return res.error(400, "Invalid email format.");

    const user = await Queries.findOne(Model.User, { _id: auth?._id });
    if (!user) return res.error(404, "user not found")
    if (user.isEmailVerified) return res.error(404, "Email already verified")
    const currentTime = Date.now();
    if (currentTime > user.emailOtpExpiry) return res.error(400, "OTP expired");

    if (Number(otp) !== Number(user?.emailOtp)) return req.error(400, "Wrong OTP")
    user.isEmailVerified = true
    return res.success("Email changed successfully")

  } catch (error) {
    next(error);
  }
};


module.exports.Logout = async (req, res, next) => {
  try {
    const auth = req.user;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const user = await Queries.findOne(Model.User, { _id: auth?._id });
    if (!user) return res.error(404, "User not found");
    user.accessToken = ''
    await user.save()
    return res.success("User logout sucessfully");
  } catch (error) {
    next(error);
  }
};



// module.exports.UpdateProfile = async (req, res, next) => {
//   try {
//     const auth = req.user;
//     if (!auth || !auth._id) return res.error(401, "UNAUTHORIZED_ACCESS");

//     const { name, email } = req.body || {};
//     const profileImageFile = req.files?.profileImage?.[0];

//     const update = {};
//     if (name !== undefined) update.name = String(name).trim();
//     if (email !== undefined) update.email = String(email).trim().toLowerCase();
//     if (profileImageFile) update.profileImage = profileImageFile.filename;

//     if (Object.keys(update).length === 0) {
//       return res.error(400, "No fields to update");
//     }

//     if (update.email !== undefined) {
//       const isValidEmail = await functions.validateEmailAsync(update.email);
//       if (!isValidEmail) return res.error(400, "Invalid email address");
//     }

//     if (update.email) {
//       const emailInUse = await Model.User.exists({
//         email: update.email,
//         _id: { $ne: auth._id },
//       });
//       if (emailInUse) return res.error(409, "Email already in use");
//     }

//     const updatedUser = await Model.User.findByIdAndUpdate(
//       auth._id,
//       { $set: update },
//       { new: true, runValidators: true }
//     );

//     if (!updatedUser) return res.error(404, "User not found");

//     return res.success("Profile updated successfully", {
//       user: {
//         _id: updatedUser._id,
//         name: updatedUser.name,
//         email: updatedUser.email,
//         profileImage: updatedUser.profileImage,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };


module.exports.createTicket = async (req, res, next) => {
  try {
    const { title, description, email } = req?.body;

    if (!title || !description || !email) return res.error(400, "All field are required")
    if (email && !(await functions.validateEmailAsync(email)))
      return res.error(400, "Invalid email format.");

    const ticketData = {
      email: email || "",
      title: title || "",
      description: description || "",
      type: "USER"
    };
    await Queries.insertOne(Model.Ticket, ticketData)
    return res.success("Ticket Created Successfully", ticketData);
  } catch (error) {
    console.error("Error creating ticket:", error.message);
    next(error)
  }
};

