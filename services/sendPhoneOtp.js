var accountSid = process.env.TWILIO_ACCOUNT_SID;
var authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;
const client = require('twilio')(accountSid, authToken, { lazyLoading: true });

const sendVerifyTwilio = async (dialCode, phoneNo) => {
    return new Promise((resolve, reject) => {
        const toNumber = dialCode + (phoneNo ? phoneNo.toString() : '');
        client.verify.v2
            .services(serviceSid)
            .verifications
            .create({ to: toNumber, channel: 'sms' })
            .then(verification => {
                console.log("Verification Sent Successfully", verification.sid);
                resolve(verification);
            })
            .catch(err => {
                console.error("Verification Error", err);
                reject(err);
            });
    });
};

const sendVerification = async (dialCode, phoneNo) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log("Sending verification code to", dialCode, phoneNo);
            const result = await sendVerifyTwilio(dialCode, phoneNo);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
};

const sendOtp = async (payload) => {
    if (payload.dialCode && payload.phoneNo) {
        console.log("Payload:", payload.dialCode, payload.phoneNo);
        await sendVerification(payload.dialCode, payload.phoneNo);
    }
    return payload;
};

const verifyCode = async (dialCode, phoneNo, code) => {
    try {
        const toNumber = `${dialCode}${phoneNo}`;
        console.log({ toNumber, code });

        const verificationCheck = await client.verify.v2
            .services(serviceSid)
            .verificationChecks
            .create({ to: toNumber, code });

        console.log("Verification Check Result:", verificationCheck.status);
        return verificationCheck;
    } catch (error) {
        console.error("Verification Check Error", error);
        throw error;
    }
};


module.exports = {
    sendOtp,
    verifyCode
};


