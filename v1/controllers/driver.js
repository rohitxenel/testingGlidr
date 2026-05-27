const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const FireQuery = require("../../queries/firestore/operations");
const { broadcast } = require("../../connections/firebase");
const { setPassword, authenticatePassword } = require("../../common/password")
const { sendOtp, verifyCode } = require('../../services/sendPhoneOtp')
const { sendEmail } = require('../../services/email')
const Auth = require("../../common/authenticate");
const functions = require("../../common/functions");
const service = require('../../services')
const common = require('../../common')
const moment = require("moment");
const Redisquery = require("../../queries/redis/query");
const ImageUrl = 'http://34.131.104.9:3030/uploads/'


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
    const existingUser = await Queries.findOne(Model.Driver, { phone: phoneWithCode });
    const codeData = await functions.getCountryDetailsByCode(code)
    const cleanName = name.toLowerCase().trim();
    if (email) {
      const existingEmailUser = await Queries.findOne(Model.Driver, {
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

    await Queries.insertOne(Model.Driver, {
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
    const user = await Queries.findOne(Model.Driver, { phone: `${formateCode(code)}${phone}` });

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
      await Queries.updateOne(Model.Driver, { phone: `${formateCode(code)}${phone}` }, { isPhoneVerified: true, accessToken: Token, fcmToken });
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

    const user = await Queries.findOne(Model.Driver, { phone: `${formateCode(code)}${phone}` });

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

    const user = await Queries.findOne(Model.Driver, { email });

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
    console.log("Login Request Body:",);
    let user;

    if (type === "google") {
      if (!email) return res.error(400, "Email is required for Google login");

      user = await Queries.findOne(Model.Driver, { email });
      if (!user) return res.error(404, "Account not found. Please sign up first.");

      if (user.isBlocked) return res.error(403, "Your account is temporarily blocked, contact support.");
      if (user.isDeleted) return res.error(403, "Your account is permanently deleted.");
    }
    else {
      if (!phone) return res.error(400, "Mobile Number is required");
      if (!code) return res.error(400, " code is required");
      if (!password) return res.error(400, "password is required");

      user = await Queries.findOne(Model.Driver, { phone: `${formateCode(code)}${phone}` });
      if (!user) return res.error(404, "Account not found. Please sign up first.");

      const isMatch = await authenticatePassword(password, user?.password);
      if (!isMatch) return res.error(400, "Incorrect password.");
    }

    // 🔹 Common checks for both logins
    if (user.isBlocked) return res.error(403, "Your account is temporarily blocked, contact support.");
    if (user.isDeleted) return res.error(403, "Your account is permanently deleted.");
    if (!user.isPhoneVerified && type !== "google") return res.error(403, "mobile number not verified. Please verify first.");

    // 🔹 Generate token
    const token = Auth.getToken({ id: user._id, phone: user.phone, email: user.email });
    user.accessToken = token;
    user.fcmToken = fcmToken
    await user.save();


    return res.success("Login successfully", { id: user?._id, name: user?.name, profileImage: user?.driverPhoto, phone: user?.phone, isvehicleDetails: user?.isvehicleDetails, isaddbank: user?.isaddbank, isaddlicense: user?.isaddlicense, isadminVerified: user?.isadminVerified, accessToken: token })
  } catch (error) {
    next(error);
  }
};


module.exports.SendOtpOnForgatePassword = async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) return res.error(400, "Phone number is required");

    const user = await Queries.findOne(Model.Driver, { phone: `${formateCode(code)}${phone}` });

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

    const user = await Queries.findOne(Model.Driver, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "Account not found. Please sign up first.");

    const hashedPassword = await setPassword(newPassword)

    await Queries.updateOne(Model.Driver, { phone: `${formateCode(code)}${phone}` }, { password: hashedPassword });
    await service.Email.sendAdminPasswordChangeSuccessEmail(user?.email, "Your password change successfully", user?.name)

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
    const user = await Queries.findOne(Model.Driver, { phone: `${formateCode(code)}${phone}` });

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
      await Queries.updateOne(Model.Driver, { phone: `${formateCode(code)}${phone}` }, { isPhoneVerified: true, accessToken: Token });
      await service.Email.sendAdminPasswordChangeSuccessEmail(user?.email, "Your password change successfully", user?.name)
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

    const user = await Queries.findOne(Model.Driver, { phone: `${formateCode(code)}${phone}` });

    if (!user) return res.error(404, "User not found.");

    await sendOtp({ dialCode: code, phoneNo: phone });

    return res.success("OTP Resend successfully. Please verify your phone number.", { phone, code });

  } catch (error) {
    next(error);
  }
};
module.exports.EditPassword = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { oldpassword, newPassword } = req.body;

    if (!oldpassword || !newPassword) return res.error(400, "Old Password and new password are required.");

    if (newPassword.length < 6) return res.error(400, "New password must be at least 6 characters long.");

    const user = await Queries.findOne(Model.Driver, { _id: auth?._id });

    if (!user) return res.error(404, "Account not found. Please sign up first.");
    const hashedPassword = await authenticatePassword(oldpassword, user?.password);
    if (hashedPassword === false) return res.error(400, "Incorrect old password")
    const NewHash = await setPassword(newPassword);
    user.password = NewHash
    user.accessToken = ''
    await user.save()
    return res.success("Password updated successfully. Please log in with your new password.");

  } catch (error) {
    next(error);
  }
};



module.exports.GetProfile = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const user = await Queries.findOne(Model.Driver, { _id: auth?._id });
    if (!user) return res.error(404, "User not found");

    return res.success("Get profile  successfully.", user);

  } catch (error) {
    next(error);
  }
};


module.exports.UpdateProfile = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const user = await Queries.findOne(Model.Driver, { _id: auth._id });
    if (!user) return res.error(404, "User not found");
    const profileImage = req.files?.profileImage?.[0]?.filename;
    const URL = process.env.LOCAL_URL

    const {
      name,
      password,
      brand,
      model,
      year,
      color,
      plateNumber,
      seatingCapacity,
      electric
    } = req.body;

    let updated = false;

    // NAME
    if (name) {
      user.name = name.trim();
      updated = true;
    }

    // PASSWORD
    if (password) {
      user.password = await setPassword(password);
      updated = true;
    }

    // VEHICLE DETAILS (flat fields)
    user.vehicleDetails = user.vehicleDetails || {};

    if (brand) {
      user.vehicleDetails.brand = brand.trim();
      updated = true;
      user.isadminVerified = false
      user.accessToken = ''
    }

    if (model) {
      user.vehicleDetails.model = model.trim();
      updated = true;
      user.isadminVerified = false
      user.accessToken = ''
    }

    if (year) {
      user.vehicleDetails.year = Number(year);
      updated = true;
      user.isadminVerified = false
      user.accessToken = ''
    }

    if (color) {
      user.vehicleDetails.color = color.trim();
      updated = true;
      user.isadminVerified = false
      user.accessToken = ''
    }

    if (plateNumber) {
      user.vehicleDetails.plateNumber = plateNumber.trim();
      updated = true;
      user.isadminVerified = false
      user.accessToken = ''
    }

    if (seatingCapacity) {
      user.vehicleDetails.seatingCapacity = Number(seatingCapacity);
      updated = true;
      user.isadminVerified = false
      user.accessToken = ''
    }

    if (electric) {
      user.vehicleDetails.electric = electric; // string as per schema
      updated = true;
      user.isadminVerified = false
      user.accessToken = ''
    }

    if (!updated) {
      return res.error(400, "Nothing to update");
    }
    if (profileImage) {
      user.driverPhoto = `${URL}${profileImage}`
      updated = true;

    }
    await user.save();
    await user.save();

    return res.success("Profile updated successfully.", {
      _id: user._id,
      name: user.name
    });

  } catch (error) {
    console.error("UpdateProfile Error:", error);
    next(error);
  }
};




module.exports.ChangePhone = async (req, res, next) => {
  try {
    const auth = req.driver;
    const { newPhone } = req?.body
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const user = await Queries.findOne(Model.Driver, { phone: newPhone });
    if (user) return res.error(409, "Phone number already in use");

    await sendOtp({ dialCode: "+91", phoneNo: newPhone });

    return res.success("OTP  Sent  Successfully.");

  } catch (error) {
    next(error);
  }
};


module.exports.VerifyOtpOnChangePhone = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { newPhone, otp } = req.body || {};

    if (!newPhone || !otp) return res.error(400, "Phone and otp are required");

    const user = await Queries.findOne(Model.Driver, { _id: auth?._id });

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

    const user = await Queries.findOne(Model.Driver, { email });
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
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { email } = req.body || {};

    if (!email) return res.error(400, "Email required");

    const isEmailValid = await functions.validateEmailAsync(email);
    if (!isEmailValid) return res.error(400, "Invalid email format.");


    const user = await Queries.findOne(Model.Driver, { _id: auth?._id });
    if (!user) return res.error(400, "user not found")
    const Emailuser = await Queries.findOne(Model.Driver, { email: email });

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
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const { email, otp } = req?.body || {};

    if (!email || !otp) return res.error(400, "Email and otp  required");

    const isEmailValid = await functions.validateEmailAsync(email);
    if (!isEmailValid) return res.error(400, "Invalid email format.");

    const user = await Queries.findOne(Model.Driver, { _id: auth?._id });
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
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")
    const user = await Queries.findOne(Model.Driver, { _id: auth?._id });
    if (!user) return res.error(404, "User not found");
    user.accessToken = ''
    await user.save()
    return res.success("User logout sucessfully");
  } catch (error) {
    next(error);
  }
};



module.exports.createTicket = async (req, res, next) => {
  try {
    const { title, description, email } = req?.body;

    if (!title || !description || !email) return res.error(400, "All field are required")

    const ticketData = {
      email: email || "",
      title: title || "",
      description: description || "",
      type: "DRIVER"
    };
    await Queries.insertOne(Model.Ticket, ticketData)
    return res.success("Ticket Created Successfully", ticketData);
  } catch (error) {
    console.error("Error creating ticket:", error.message);
    next(error)
  }
};


module.exports.HelpSupport = async (req, res, next) => {
  try {
    const auth = req?.driver
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS")

    const { title, description } = req?.body;

    if (!title || !description) return res.error(400, "All field are required")

    const ticketData = {
      email: auth?.email || "",
      title: title || "",
      description: description || "",
      type: "DRIVER"
    };
    await Queries.insertOne(Model.Ticket, ticketData)
    return res.success("Ticket Created Successfully", ticketData);
  } catch (error) {
    console.error("Error creating ticket:", error.message);
    next(error)
  }
};


module.exports.AddVehicleDetails = async (req, res, next) => {
  try {
    const auth = req.driver; // this should be the logged-in driver's ID or object
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const {
      brand,
      model,
      year,
      platenumber,
      colour,
      capacity,
      vehicletype,
      isElectric,
    } = req.body || {};

    // Validate required fields
    if (
      !brand ||
      !model ||
      !year ||
      !platenumber ||
      !colour ||
      !capacity ||
      !vehicletype ||
      !isElectric
    ) {
      return res.error(400, "All fields are required");
    }

    const currentYear = new Date().getFullYear();
    const vehicleYear = parseInt(year, 10);

    // Check if year is in the future
    if (vehicleYear > currentYear) {
      return res.error(400, "Vehicle year cannot be in the future");
    }

    // Check if vehicle is more than 12 years old
    if (currentYear - vehicleYear > 12) {
      return res.error(400, "Your vehicle is more than 12 years old");
    }
    // Find and update the driver's vehicle info
    const driver = await Queries.findOne(Model.Driver, { _id: auth?._id });
    if (!driver) return res.error(404, "Driver not found");
    if (driver.isvehicleDetails) return res.error(400, "Vehicle details already submitted");

    driver.VehicalType = vehicletype;
    driver.VehicalDetails = {
      brand,
      model,
      year,
      color: colour,
      plateNumber: platenumber,
      seatingCapacity: capacity,
      electric: isElectric
    };
    driver.isvehicleDetails = true;

    await driver.save();
    await service.Email.sendVehicleAddedEmail(auth?.email, "Vehicle Details Received", auth?.name)

    return res.success("Vehicle details added successfully", { AddVehicleDetails: true });

  } catch (error) {
    console.error(error);
    next(error)
  }
};



module.exports.AddBankDetails = async (req, res, next) => {
  try {
    const auth = req.driver;
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const {
      name,
      accountnumber,
      bankname,
      city,
      branch,
      accountType,
      effectiveDate,
      code,
    } = req.body || {};

    if (
      !name ||
      !accountnumber ||
      !bankname ||
      !city ||
      !branch ||
      !accountType ||
      !effectiveDate ||
      !code
    ) {
      return res.error(400, common.constants.RESPONSE_MESSAGES.REQUIRED);
    }



    const driver = await Queries.findOne(Model.Driver, { _id: auth?._id });
    if (!driver) return res.error(404, "Driver not found");

    if (!driver.isvehicleDetails) return res.error(400, "First Add your vehicle Details")
    driver.bankDetails = {
      BeneficiaryName: name,
      bankAccount: accountnumber,
      bankName: bankname,
      city: city,
      branch: branch,
      AccountType: accountType,
      effectiveDate: effectiveDate,
      Code: code
    };
    driver.isaddbank = true;

    await driver.save();
    await service.Email.sendBankAddedEmail(auth?.email, "Bank Account Details Received", auth?.name)

    return res.success("Bank details added successfully", { AddBankDetails: true });

  } catch (error) {
    console.error(error);
    next(error)
  }
};



module.exports.AddDrivinglicense = async (req, res, next) => {
  try {
    const auth = req.driver; // this should be the logged-in driver's ID or object
    if (!auth) return res.error(400, "UNAUTHORIZED_ACCESS");

    const { criminalRecord,
      passport,
      homeAddress,
      referenceNameOne,
      referenceMobileOne,
      referenceNameTwo,
      referenceMobileTwo } = req?.body
    const drivinglicense = req.files?.drivinglicense?.[0]?.filename;
    if (!drivinglicense) return res.error(400, "Driving license Image  required")

    const driver = await Queries.findOne(Model.Driver, { _id: auth?._id });

    if (!driver) return res.error(404, "Driver not found");

    if (!driver.isvehicleDetails) return res.error(400, "First Add your vehicle Details")
    if (!driver.isaddbank) return res.error(400, " Add your bank Details")

    driver.drivinglicense = `${ImageUrl}${drivinglicense}`
    driver.isaddlicense = true
    driver.criminalRecord = criminalRecord
    driver.passport = passport
    driver.homeAddress = homeAddress
    driver.referenceNameOne = referenceNameOne
    driver.referenceMobileOne = referenceMobileOne
    driver.referenceNameTwo = referenceNameTwo,
      driver.referenceMobileTwo = referenceMobileTwo
    await driver.save()
    await service.Email.sendLicenseUploadedEmail(auth?.email, "Driving License Received", auth?.name)

    return res.success("License added successfully", { AddDrivinglicense: true });

  } catch (error) {
    next(error)
  }
};

const { uploadToGCS } = require("../../common/uploadfile");
module.exports.Test = async (req, res, next) => {
  try {


    const drivinglicense = req.files?.drivinglicense?.[0];
    if (!drivinglicense) return res.error(400, "Driving license Image  required")
    // Upload to GCS
    console.log({ drivinglicense })
    const fileUrl = await uploadToGCS(drivinglicense);
    console.log({ fileUrl })

    return res.success("License added successfully", { fileUrl });

  } catch (error) {
    next(error)
  }
};




module.exports.updateDriverStatus = async (auth, status, lat, lng) => {
  if (!status || !lat || !lng) throw new Error("All field required");

  await Model.Driver.findByIdAndUpdate(auth._id, { $set: { status } });

  const today = moment().format("YYYY-MM-DD");
  const now = new Date();

  let session = await Queries.findOne(Model.Sessions, { driverId: auth._id, date: today });

  if (status === "ONLINE" || status === "ONRIDE") {
    await Redisquery.updateLocation(auth?._id.toString(), lng, lat, auth?.VehicalType, status);

    if (!session) {
      session = await Queries.insertOne(Model.Sessions, {
        driverId: auth._id,
        date: today,
        sessions: [{ loginTime: now }],
      });
    } else {
      const lastSession = session.sessions[session.sessions.length - 1];
      if (!lastSession || lastSession.logoutTime) {
        session.sessions.push({ loginTime: now });
        await session.save();
      }
    }
  }

  if (status === "OFFLINE" && session) {
    await Redisquery.updateLocation(auth?._id.toString(), lng, lat, auth?.VehicalType, status);
    const lastSession = session.sessions[session.sessions.length - 1];
    if (lastSession && !lastSession.logoutTime) {
      lastSession.logoutTime = now;
      const duration = Math.floor((now - new Date(lastSession.loginTime)) / 1000);
      session.totalOnlineTime += duration;
      await session.save();
    }
  }

  return { status };
}

