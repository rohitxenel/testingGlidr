
const axios = require("axios");

const sendglobalEmail = async (to, subject, htmlContent) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const FROM_EMAIL = process.env.MAIL_FROM_ADDRESS;
  const FROM_NAME = process.env.MAIL_FROM_NAME;

  if (!to || !subject || !htmlContent) {
    throw new Error("Missing required fields: to, subject, or htmlContent.");
  }
  console.log({ to, subject, })
  const payload = {
    sender: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (response.status === 201) {
      console.log(`✅ Email sent successfully to ${to}`);
      return true;
    } else {
      console.error("❌ Brevo API error:", response.data);
      return false;
    }
  } catch (error) {
    console.error("❌ Email sending failed:", error.response?.data || error.message);
    return false;
  }
};



module.exports.sendEmailtoSignupUser = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "User";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#f9f9f9;border-radius:10px;color:#333;">
        <h2 style="color:#2F80ED;text-align:center;font-size:24px;margin-bottom:20px;">Welcome to ${process.env.APP_NAME || 'RideApp'}!</h2>

        <p style="font-size:16px;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.5;">
          Thanks for signing up with <strong>${process.env.APP_NAME || 'our ride platform'}</strong>! You're now part of a growing community that moves with comfort, safety, and ease.
        </p>

        <p style="font-size:15px;line-height:1.5;">Here’s what you can do now:</p>
        <ul style="line-height:1.6;padding-left:20px;font-size:15px;">
          <li>🚗 Book a ride quickly and effortlessly</li>
          <li>💳 Set up your payment method for smooth checkout</li>
          <li>💰 Earn rewards on every ride you take</li>
        </ul>

        <p style="font-size:15px;">Whether it’s your daily commute or a weekend trip, we’re here to get you there — safely and reliably.</p>

        <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;" />

        <p style="font-size:15px;">Need help? Our support team is always ready:</p>
        <p style="font-size:15px;">Email: <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@glidr.com'}">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</a></p>

        <p style="font-size:15px;">Happy riding!<br />— The ${process.env.APP_NAME || 'RideApp'} Team</p>

        <div style="margin-top:30px;text-align:center;">
          ${process.env.SOCIAL_LINKS_HTML || ''}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
};



module.exports.sendDriverSignupEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Driver";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/2972/2972331.png" alt="Welcome" width="80" style="margin-bottom:15px;" />
          <h2 style="color:#2F80ED;font-size:26px;margin:0;">Welcome Aboard, ${formattedName}! 🚗</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">
          Congratulations on joining <strong>${process.env.APP_NAME || 'RideApp'}</strong> – a platform built for professional, motivated drivers like you. You're now part of a reliable and fast-growing ride-sharing community. 🙌
        </p>

        <p style="font-size:15px;line-height:1.6;">Here’s what happens next:</p>

        <ul style="font-size:15px;line-height:1.8;padding-left:20px;">
          <li>✅ Add your vehicle details to complete your driver profile</li>
          <li>✅ Get ready to start earning by accepting ride requests</li>
          <li>✅ Provide excellent service and build rider trust</li>
        </ul>

        <p style="font-size:15px;line-height:1.6;margin-top:20px;">
          Please make sure all your vehicle details are accurate and up to date to speed up the approval process.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">💬 Need any help?</p>
        <p style="font-size:15px;">Our team is always here for you — just reach out to us at <strong>${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</strong></p>

        <p style="font-size:15px;margin-top:30px;">
          We’re excited to have you on board.<br />
          Stay safe and drive smart! 🚦<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending driver signup email:", error);
    throw new Error("Failed to send signup email to driver");
  }
};

module.exports.sendVehicleAddedEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Driver";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/1995/1995507.png" alt="Vehicle" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#2D9CDB;font-size:24px;margin:0;">Vehicle Details Added</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          Your vehicle details have been successfully submitted to <strong>${process.env.APP_NAME || 'RideApp'}</strong>. You're one step closer to getting on the road and earning!
        </p>

        <p style="font-size:15px;line-height:1.6;">
          <strong>Next Step:</strong> Please add your bank account details so that we can process your earnings smoothly.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          Thank you for choosing to drive with us. We’re excited to have you on board and support your journey every mile of the way.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Need help? Reach out to us at:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Stay safe and keep driving forward!<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending vehicle added email:", error);
    throw new Error("Failed to send vehicle details confirmation email");
  }
};


module.exports.sendBankAddedEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Driver";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/552/552721.png" alt="Bank Added" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#27ae60;font-size:24px;margin:0;">Bank Account Added</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          Great news! Your bank account has been successfully added to your ${process.env.APP_NAME || 'RideApp'} profile. You're now set up to receive earnings directly.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          <strong>Next Step:</strong> Please upload your driving license to complete your profile and become eligible for ride requests.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          We're excited to see you on the road soon!
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Need help? Reach out to us at:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Keep going — you're almost ready to drive!<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending bank added email:", error);
    throw new Error("Failed to send bank account confirmation email");
  }
};

module.exports.sendUserPasswordChangeSuccessEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "User";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/942/942751.png" alt="Password Changed" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#2d89ef;font-size:24px;margin:0;">Your Password Has Been Updated</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          We wanted to let you know that the password for your ${process.env.APP_NAME || "RideApp"} account was successfully changed.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          If this was you, you can now log in securely with your new password.
        </p>

        <p style="font-size:15px;line-height:1.6;color:#e74c3c;font-weight:500;">
          ⚠️ Didn’t request this change? Please <a href="${process.env.PASSWORD_RESET_URL || '#'}" style="color:#e74c3c;text-decoration:none;">reset your password</a> immediately or contact our support team.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Need help? Reach out to us at:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Thanks for being with us,<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending user password change success email:", error);
    throw new Error("Failed to send user password change success email");
  }
};



module.exports.sendLicenseUploadedEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Driver";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/1040/1040230.png" alt="License Submitted" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#2d9cdb;font-size:24px;margin:0;">Driving License Uploaded</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          We've successfully received your driving license and all other required documents. Thank you for submitting the final step in your driver onboarding process.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          <strong>What's next?</strong><br />
          Our  team will now review your documents for verification. Once approved, your account will be activated, and you’ll be able to start accepting ride requests.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          We'll notify you as soon as your account is ready to go.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 For any questions or support, reach us at:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Almost there — your journey with ${process.env.APP_NAME || 'RideApp'} is about to begin!<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending license uploaded email:", error);
    throw new Error("Failed to send license upload confirmation email");
  }
};


module.exports.sendAdminSignupOtpEmail = async (to, subject, name, otp) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Admin";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/747/747545.png" alt="Admin OTP" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#2d9cdb;font-size:24px;margin:0;">Verify Your Credentials</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          To complete your admin signup process, please use the following OTP to verify your credentials:
        </p>

        <div style="background-color:#f3f4f6;padding:15px;text-align:center;border-radius:8px;margin:20px 0;">
          <span style="font-size:24px;letter-spacing:5px;color:#111;font-weight:bold;">${otp}</span>
        </div>

        <p style="font-size:15px;line-height:1.6;">
          This OTP is valid for a limited time only. Please do not share it with anyone.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 For any assistance, contact us at:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Welcome aboard — you're one step away from managing ${process.env.APP_NAME || 'RideApp'}!<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending admin signup OTP email:", error);
    throw new Error("Failed to send OTP verification email");
  }
};



module.exports.sendAdminForgotPasswordOtpEmail = async (to, subject, name, otp) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Admin";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/616/616408.png" alt="Forgot Password OTP" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#2d9cdb;font-size:24px;margin:0;">Reset Your Password</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          You requested to reset your password for your ${process.env.APP_NAME || "RideApp"} admin account. Use the OTP below to verify your identity:
        </p>

        <div style="background-color:#f3f4f6;padding:15px;text-align:center;border-radius:8px;margin:20px 0;">
          <span style="font-size:24px;letter-spacing:5px;color:#111;font-weight:bold;">${otp}</span>
        </div>

        <p style="font-size:15px;line-height:1.6;">
          This OTP is valid for the next 15 minutes. Please do not share it with anyone for security reasons.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          If you did not request this, please ignore this email or contact support.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Need help? Reach out to us at:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Stay safe,<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending forgot password OTP email:", error);
    throw new Error("Failed to send forgot password OTP email");
  }
};

module.exports.sendAdminPasswordChangeSuccessEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Admin";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/3064/3064197.png" alt="Password Changed" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#27ae60;font-size:24px;margin:0;">Password Updated Successfully</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          Your password for your ${process.env.APP_NAME || "RideApp"} admin account has been changed successfully.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          If this was you, no further action is required. You can now log in with your new password.
        </p>

        <p style="font-size:15px;line-height:1.6;color:#e74c3c;font-weight:500;">
          ⚠️ If you did not make this change, please reset your password immediately or contact our support team.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Need help? Reach out to us at:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Stay safe,<br />
          — The <strong>${process.env.APP_NAME || 'RideApp'}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending password change success email:", error);
    throw new Error("Failed to send password change success email");
  }
};


module.exports.sendAdminBlockedUserEmail = async (to, subject, name, reason = "") => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "User";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828843.png" alt="Account Blocked" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#e63946;font-size:24px;margin:0;">Account Blocked</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          We regret to inform you that your account on <strong>${process.env.APP_NAME || "RideApp"}</strong> has been temporarily blocked by our administrators.
        </p>

        ${reason
        ? `<p style="font-size:15px;line-height:1.6;">
                <strong>Reason:</strong> ${reason}
              </p>`
        : ""
      }

        <p style="font-size:15px;line-height:1.6;">
          If you believe this was a mistake or have any questions, please reach out to our support team using the contact details below.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Contact Support:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Thank you for understanding,<br />
          — The <strong>${process.env.APP_NAME || "RideApp"}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending blocked user email:", error);
    throw new Error("Failed to send blocked user notification email");
  }
};


module.exports.sendAdminUnblockedUserEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "User";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Unblocked" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#27ae60;font-size:24px;margin:0;">Account Unblocked</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          Great news! Your account on <strong>${process.env.APP_NAME || "RideApp"}</strong> has been unblocked. You can now resume booking rides and using our services.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          If you face any issues or have questions, feel free to contact our support team.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Contact Support:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Welcome back,<br />
          — The <strong>${process.env.APP_NAME || "RideApp"}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending unblock user email:", error);
    throw new Error("Failed to send unblock user email");
  }
};


module.exports.sendAdminDeletedUserEmail = async (to, subject, name, reason = "Violation of our policies") => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "User";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/753/753345.png" alt="Account Deleted" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#e74c3c;font-size:24px;margin:0;">Account Deleted by Admin</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          Your account on <strong>${process.env.APP_NAME || "RideApp"}</strong> has been permanently deleted by our administration team.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          <strong>Reason:</strong> ${reason}
        </p>

        <p style="font-size:15px;line-height:1.6;">
          If you believe this was a mistake or would like more information, please contact our support team.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Contact Support:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Thank you,<br />
          — The <strong>${process.env.APP_NAME || "RideApp"}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending admin delete account email:", error);
    throw new Error("Failed to send account deletion email");
  }
};


module.exports.sendUserDeletedAccountConfirmationEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "User";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828778.png" alt="Account Deleted" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#e67e22;font-size:24px;margin:0;">Account Deleted</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          This email confirms that your account with <strong>${process.env.APP_NAME || "RideApp"}</strong> has been successfully deleted as per your request.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          We're sorry to see you go. If you ever decide to return, you're always welcome.
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 For questions or assistance:</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@rideapp.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Thank you for being a part of <strong>${process.env.APP_NAME || "RideApp"}</strong>.<br />
          — The <strong>${process.env.APP_NAME || "RideApp"}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending user account deletion confirmation email:", error);
    throw new Error("Failed to send user delete account confirmation email");
  }
};



module.exports.sendDriverKYCApprovedEmail = async (to, subject, name) => {
  try {
    const capitalizeName = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : "Driver";
    const formattedName = capitalizeName(name);

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;font-family:'Segoe UI',sans-serif;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;color:#333;">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="KYC Approved" width="70" style="margin-bottom:15px;" />
          <h2 style="color:#2ecc71;font-size:24px;margin:0;">KYC Approved</h2>
        </div>

        <p style="font-size:16px;line-height:1.6;">Hi ${formattedName},</p>

        <p style="font-size:15px;line-height:1.6;">
          We're pleased to inform you that your KYC verification has been successfully completed and approved by the <strong>${process.env.APP_NAME || "Glidr"}</strong> team.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          Your account is now fully active, and you are eligible to start accepting ride requests through the platform.
        </p>

        <p style="font-size:15px;line-height:1.6;">
          Thank you for completing the verification process. We’re excited to have you on board!
        </p>

        <hr style="border:none;border-top:1px solid #ccc;margin:30px 0;" />

        <p style="font-size:15px;">📩 Need help or have questions?</p>
        <p style="font-size:15px;">${process.env.SUPPORT_EMAIL || 'support@glidr.com'}</p>

        <p style="font-size:15px;margin-top:30px;">
          Drive safe and earn more with <strong>${process.env.APP_NAME || "Glidr"}</strong>.<br />
          — The <strong>${process.env.APP_NAME || "Glidr"}</strong> Team
        </p>

        <div style="text-align:center;margin-top:40px;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending driver KYC approved email:", error);
    throw new Error("Failed to send driver KYC approved email");
  }
};


module.exports.sendReplyEmail = async (to, subject = "Your Ticket Has Been Updated", message, ticketId = "") => {
  try {
    const appName = process.env.APP_NAME || "RideApp";
    const supportEmail = process.env.SUPPORT_EMAIL || "support@rideapp.com";

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;
        font-family:'Segoe UI',sans-serif;background-color:#f9f9f9;
        border-radius:10px;color:#333;">
        
        <h2 style="color:#2F80ED;text-align:center;font-size:22px;margin-bottom:25px;">
          ${appName} – Ticket Reply${ticketId ? ` #${ticketId}` : ""}
        </h2>

        <p style="font-size:16px;">Dear User,</p>

        <p style="font-size:15px;line-height:1.6;">
          We’ve reviewed your support ticket and here’s our response:
        </p>

        <div style="background:#fff;border-left:4px solid #2F80ED;
          padding:15px 20px;margin:20px 0;border-radius:5px;
          font-size:15px;line-height:1.6;">
          ${message}
        </div>

        <p style="font-size:15px;line-height:1.6;">
          If you have any additional questions or need more help, simply reply to this email.
        </p>

        <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;" />

        <p style="font-size:14px;">Best regards,</p>
        <p style="font-size:15px;font-weight:600;">The ${appName} Support Team</p>
        <p style="font-size:14px;margin-top:5px;">
          Email: <a href="mailto:${supportEmail}" style="color:#2F80ED;">${supportEmail}</a>
        </p>

        <div style="margin-top:30px;text-align:center;font-size:13px;color:#888;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    // Send email using your global mail sender
    return await sendglobalEmail(to, subject || `${appName} Ticket Reply`, htmlTemplate);
  } catch (error) {
    console.error("Error sending reply email:", error);
    throw new Error("Failed to send reply email");
  }
};


module.exports.sendScheduleRideEmail = async (to, subject = "Your Ride is Scheduled", rideData = {}) => {
  try {
    const appName = process.env.APP_NAME || "RideApp";
    const supportEmail = process.env.SUPPORT_EMAIL || "support@rideapp.com";

    const { pickup, drop, otp, date, time, vehicleType, totalFare } = rideData;

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;
        font-family:'Segoe UI',sans-serif;background-color:#f9f9f9;
        border-radius:10px;color:#333;">
        
        <h2 style="color:#2F80ED;text-align:center;font-size:22px;margin-bottom:25px;">
          🚗 ${appName} – Ride Scheduled
        </h2>

        <p style="font-size:16px;">Dear Customer,</p>

        <p style="font-size:15px;line-height:1.6;">
          Your ride has been successfully scheduled! Please be ready <strong>5 minutes before</strong> your pickup time.
        </p>

        <div style="background:#fff;border-left:4px solid #2F80ED;
          padding:20px;margin:25px 0;border-radius:5px;font-size:15px;line-height:1.6;">
          <p><strong>📍 Pickup Location:</strong> ${pickup || "N/A"}</p>
          <p><strong>🏁 Drop Location:</strong> ${drop || "N/A"}</p>
          <p><strong>🗓 Date:</strong> ${date || "N/A"}</p>
          <p><strong>⏰ Time:</strong> ${time || "N/A"}</p>
          <p><strong>🚘 Vehicle Type:</strong> ${vehicleType || "Standard"}</p>
          ${totalFare ? `<p><strong>💰 Fare:</strong> $${totalFare}</p>` : ""}
          ${otp ? `<p><strong>🔢 Ride OTP:</strong> <span style="color:#2F80ED;font-weight:bold;">${otp}</span></p>` : ""}
        </div>

        <p style="font-size:15px;line-height:1.6;">
          Please ensure that you are ready at the pickup location before the driver arrives.
          If you need to cancel  your ride, you can do so directly through the ${appName} app.
        </p>

        <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;" />

        <p style="font-size:14px;">Thank you for choosing ${appName}!</p>
        <p style="font-size:15px;font-weight:600;">The ${appName} Team</p>
        <p style="font-size:14px;margin-top:5px;">
          Support: <a href="mailto:${supportEmail}" style="color:#2F80ED;">${supportEmail}</a>
        </p>

        <div style="margin-top:30px;text-align:center;font-size:13px;color:#888;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending schedule ride email:", error);
    throw new Error("Failed to send schedule ride email");
  }
};

module.exports.sendCancelledScheduleRideEmail = async (
  to,
  subject = "Your Scheduled Ride Has Been Cancelled",
  rideData = {}
) => {
  try {
    const appName = process.env.APP_NAME || "RideApp";
    const supportEmail = process.env.SUPPORT_EMAIL || "support@rideapp.com";

    const { pickup, drop, otp, date, time, vehicleType, totalFare } = rideData;

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;
        font-family:'Segoe UI',sans-serif;background-color:#f9f9f9;
        border-radius:10px;color:#333;">
        
        <h2 style="color:#E63946;text-align:center;font-size:22px;margin-bottom:25px;">
          ❌ ${appName} – Ride Cancelled
        </h2>

        <p style="font-size:16px;">Dear Customer,</p>

        <p style="font-size:15px;line-height:1.6;">
          Your <strong>scheduled ride</strong> has been successfully 
          <span style="color:#E63946;font-weight:bold;">cancelled by you</span>.
        </p>

        <div style="background:#fff;border-left:4px solid #E63946;
          padding:20px;margin:25px 0;border-radius:5px;
          font-size:15px;line-height:1.6;">
          <p><strong>📍 Pickup Location:</strong> ${pickup || "N/A"}</p>
          <p><strong>🏁 Drop Location:</strong> ${drop || "N/A"}</p>
          <p><strong>🗓 Date:</strong> ${date || "N/A"}</p>
          <p><strong>⏰ Time:</strong> ${time || "N/A"}</p>
          <p><strong>🚘 Vehicle Type:</strong> ${vehicleType || "Standard"}</p>
          ${totalFare ? `<p><strong>💰 Fare:</strong> ${totalFare}</p>` : ""}
          ${otp ? `<p><strong>🔢 Ride OTP:</strong> <span style="color:#2F80ED;font-weight:bold;">${otp}</span></p>` : ""}
        </div>

        <p style="font-size:15px;line-height:1.6;">
          We’ve recorded your cancellation request successfully.
          You can rebook a new ride anytime through the ${appName} app.
        </p>

        <p style="font-size:15px;line-height:1.6;color:#2F80ED;">
          If this was a mistake or you’d like to schedule again, simply open the app and book instantly.
        </p>

        <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;" />

        <p style="font-size:14px;">Thank you for using ${appName}. We hope to serve you again soon.</p>
        <p style="font-size:15px;font-weight:600;">The ${appName} Team</p>
        <p style="font-size:14px;margin-top:5px;">
          Support: <a href="mailto:${supportEmail}" style="color:#2F80ED;">${supportEmail}</a>
        </p>

        <div style="margin-top:30px;text-align:center;font-size:13px;color:#888;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending cancel schedule ride email:", error);
    throw new Error("Failed to send cancel schedule ride email");
  }
};

module.exports.sendBusBookingEmail = async (
  to,
  subject = "🚌 Your Bus Booking is Successful",
  bookingData = {}
) => {
  try {
    const appName = process.env.APP_NAME || "Glidr";
    const supportEmail = process.env.SUPPORT_EMAIL || "support@glidr.com";

    const {
      name,
      dateoftrevel,
      deptime,
      deplocation,
      deslocation,
      phone,
      email
    } = bookingData;

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;
        font-family:'Segoe UI',sans-serif;background-color:#f9f9f9;
        border-radius:10px;color:#333;">
        
        <h2 style="color:#2F80ED;text-align:center;font-size:22px;margin-bottom:25px;">
          🚌 ${appName} – Booking Confirmed
        </h2>

        <p style="font-size:16px;">Dear ${name || "Passenger"},</p>

        <p style="font-size:15px;line-height:1.6;">
          Your bus booking has been successfully received and confirmed! 
          Our ${appName} team will assign your bus details shortly. 
          Please wait while we arrange your seat and schedule.
        </p>

        <div style="background:#fff;border-left:4px solid #2F80ED;
          padding:20px;margin:25px 0;border-radius:5px;
          font-size:15px;line-height:1.6;">
          <p><strong>🗓 Travel Date:</strong> ${dateoftrevel || "N/A"}</p>
          <p><strong>⏰ Departure Time:</strong> ${deptime || "N/A"}</p>
          <p><strong>📍 Departure Location:</strong> ${deplocation || "N/A"}</p>
          <p><strong>🏁 Destination:</strong> ${deslocation || "N/A"}</p>
          <p><strong>📞 Contact:</strong> ${phone || "N/A"}</p>
          <p><strong>📧 Email:</strong> ${email || to}</p>
        </div>

        <p style="font-size:15px;line-height:1.6;">
          Please note: your assigned bus details (bus number, seat, and driver info)
          will be shared via email once confirmed by the ${appName} operations team.
        </p>

        <p style="font-size:15px;line-height:1.6;color:#2F80ED;">
          🔔 Kindly check your email again closer to your travel time for the full bus assignment details.
        </p>

        <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;" />

        <p style="font-size:14px;">Thank you for choosing ${appName}!</p>
        <p style="font-size:15px;font-weight:600;">The ${appName} Team</p>
        <p style="font-size:14px;margin-top:5px;">
          Support: <a href="mailto:${supportEmail}" style="color:#2F80ED;">${supportEmail}</a>
        </p>

        <div style="margin-top:30px;text-align:center;font-size:13px;color:#888;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending bus booking email:", error);
    throw new Error("Failed to send bus booking email");
  }
};


module.exports.sendBusAssignedEmail = async (
  to,
  subject = "🚌 Your Bus Details Have Been Assigned",
  assignedData = {}
) => {
  try {
    const appName = process.env.APP_NAME || "Glidr";
    const supportEmail = process.env.SUPPORT_EMAIL || "support@glidr.com";

    const {
      name,
      dateoftrevel,
      deptime,
      deplocation,
      deslocation,
      busNumber,
      driverName,
      driverContact,
    } = assignedData;

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:30px;
        font-family:'Segoe UI',sans-serif;background-color:#f9f9f9;
        border-radius:10px;color:#333;">
        
        <h2 style="color:#2F80ED;text-align:center;font-size:22px;margin-bottom:25px;">
          🚌 ${appName} – Bus Assigned Successfully
        </h2>

        <p style="font-size:16px;">Dear ${name || "Passenger"},</p>

        <p style="font-size:15px;line-height:1.6;">
          Great news! Your bus has been successfully assigned by our ${appName} operations team. 
          Below are your finalized travel and bus details.
        </p>

        <div style="background:#fff;border-left:4px solid #2F80ED;
          padding:20px;margin:25px 0;border-radius:5px;
          font-size:15px;line-height:1.6;">
          <p><strong>🗓 Travel Date:</strong> ${dateoftrevel || "N/A"}</p>
          <p><strong>⏰ Departure Time:</strong> ${deptime || "N/A"}</p>
          <p><strong>📍 Departure Location:</strong> ${deplocation || "N/A"}</p>
          <p><strong>🏁 Destination:</strong> ${deslocation || "N/A"}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:12px 0;" />
          <p><strong>🚌 Bus Number:</strong> ${busNumber || "To be confirmed"}</p>
          <p><strong>👨‍✈️ Driver Name:</strong> ${driverName || "To be confirmed"}</p>
          <p><strong>📞 Driver Contact:</strong> ${driverContact || "N/A"}</p>
        </div>

        <p style="font-size:15px;line-height:1.6;">
          Please be ready at your pickup location <strong>15 minutes before</strong> the departure time.
          For any assistance, our support team is here to help.
        </p>

        <p style="font-size:15px;line-height:1.6;color:#2F80ED;">
          Safe travels with ${appName}! 🛣️
        </p>

        <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;" />

        <p style="font-size:14px;">Thank you for choosing ${appName}!</p>
        <p style="font-size:15px;font-weight:600;">The ${appName} Team</p>
        <p style="font-size:14px;margin-top:5px;">
          Support: <a href="mailto:${supportEmail}" style="color:#2F80ED;">${supportEmail}</a>
        </p>

        <div style="margin-top:30px;text-align:center;font-size:13px;color:#888;">
          ${process.env.SOCIAL_LINKS_HTML || ""}
        </div>
      </div>
    `;

    return await sendglobalEmail(to, subject, htmlTemplate);
  } catch (error) {
    console.error("Error sending assigned bus email:", error);
    throw new Error("Failed to send assigned bus email");
  }
};
