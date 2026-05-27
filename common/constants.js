module.exports = {
    segments: {
        ALLCUSTOMERS: 1,
        ACTIVECUSTOMERS: 2,
        LAPSEDCUSTOMERS: 3,
        TOPCUSTOMERSTIME: 4,
        CUSTOMERSBYAGEANDCOUNTRY: 5
    },
    ACTIVECUSTOMERTYPE: {
        LAST30DAYS: 0,
        LAST60DAYS: 1,
        LAST90DAYS: 2,
        CUSTOM: 3
    },
    LAPSEDCUSTOMERS: {
        LAST30DAYS: 0,
        LAST60DAYS: 1,
        LAST90DAYS: 2,
        CUSTOM: 3
    },
    TOPCUSTOMERSTIME: {
        LAST30DAYS: 0,
        LAST60DAYS: 1,
        LAST90DAYS: 2,
        CUSTOM: 3
    },
    SELECTCOUNTRY: {
        ALL: 1,
        CUSTOM: 2
    },
    BRANDOUTLETSTYPE: {
        FOODANDBEVERAGE: 1,
        BEAUTYANDFITNESS: 2,
        FASHIONANDRETAIL: 3,
        SERVICES: 4,
        FLOWERSANDGIFTS: 5
    },
    SUBSCRIPTIONPLANTYPE: {
        LAST30DAYS: 0,
        LAST90DAYS: 1,
        LAST183DAYS: 2,
        LAST365DAYS: 3,
        CUSTOM: 4
    },
    FIREBASE: {
        TICKET: "Tickets"
    },
    RESPONSE_MESSAGES: {
        UNAUTHORIZED: "Unauthorized access. Please log in again.",
        MISSING_ID: "Id is required.",
        USER_NOT_FOUND: "No user found with the given ID.",
        BLOCK_SUCCESS: "User has been successfully blocked.",
        UNBLOCK_SUCCESS: "User has been successfully unblocked.",
        DELETE_SUCCESS: "User has been successfully deleted.",
        INVALID_EMAIL: "User email not available for notification.",
        REQUIRED: "All fields are required",
        EMAIL_FORMATE: "Invalid email formate",
        PASSWORD_CHECK: "Password must be at least 6 characters long",
        OTP_SEND: "OTP sent successfully",
        SIGNUP_ALREADY: "Already signed up. Please login.",
        NOT_ADMIN: "Admin not found",
        ALREADY_VERIFYED: "Email already verified",
        OTP_EXPIRE: "OTP expired or invalid. Please request a new one.",
        INVALID_OTP: "Invalid OTP",
        ADMIN_ACTIVE: "OTP verified successfully. Admin account activated.",
        SIGNUP_1: "Account not found. Please sign up first.",
        BLOCK: "Your Account temporary Blocked ,Contact With Support Team ",
        DELETE: "Your Account permanent  Deleted",
        NOT_EMAIL_VERIFYED: "Email not verified. Please verify your email first.",
        WRONG_PASSWORD: "Incorrect password.",
        LOGIN: "Login successfully",
        RESET_OTP: "OTP sent for reset password",
        SETNEWPASSWORD: "OTP verified successfully. You may now Set  your New Password",
        SAME_PASSWORD: "New password cannot be the same as the old password",
        LOGIN_NEW_PASSWORD: "Your New Password Set Successfully , you may Login with your new password",
        DATA_NOT_FOUND: "data not found",
        DATA_GET: "data get successfully",
        DRIVER_VERIFY: "driver kyc verifyed successfully",
        LAT_LNG: "latitude and Longitude are required",
        UPDATE_LOC: "Location updated successfully",
        ADMIN_UNVERIFYED: "Admin Not verified your account",
        ADMIN_VERIFYED: "Account verified successfully",
        CANCELRIDE: "Cancel Ride  successfully",
        BOOOKED_RIDE: "You have already booked ride",
        ADMIN_VERIFY: "Your documents have already been reviewed and verified by our admin team."
    }

};





