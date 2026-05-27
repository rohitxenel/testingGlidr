const express = require("express");
const controller = require("../controllers")
const router = express.Router();
const { verify } = require("../../common/authenticate")
const upload = require('../../common/uploadfile');

const uploadFields = [
  { name: "drivinglicense", maxCount: 1 },

];
const { configureUpload } = require("../../common/uploadfile");
// ----------------------------Authentication-----------------------------------//
router.post('/signup',  controller.Driver.SignUp);
router.get('/check-user',  controller.Driver.CheckUser);
router.post('/verifyotp',  controller.Driver.VerifyOtp);
router.post('/resend-otp',  controller.Driver.ResendOtp);
router.post('/login',  controller.Driver.Login);
router.post('/add-email',  controller.Driver.addEmail);
router.post('/forgate-password',  controller.Driver.SendOtpOnForgatePassword);
router.post('/forgate-verify-otp',  controller.Driver.ForgatepasswordOtpVerify);
router.post('/forgate-resend-otp',  controller.Driver.ResendOtpOnForgatePassword);

router.post('/new-password',  controller.Driver.SetNewPassword);
router.post('/edit-password', verify("driver"), controller.Driver.EditPassword);
router.get('/getprofile', verify("driver"), controller.Driver.GetProfile);
router.post('/update-profile', verify("driver"), upload.fields([{ name: 'profileImage', maxCount: 1 },]), controller.Driver.UpdateProfile);
router.post('/change-phone', verify("driver"), controller.Driver.ChangePhone);
router.post('/verify-phone', verify("driver"), controller.Driver.VerifyOtpOnChangePhone);
router.post('/change-email', verify("driver"), controller.Driver.ChangeEmail);
router.post('/verify-email', verify("driver"), controller.Driver.verifyEmail);
router.post('/logout', verify("driver"), controller.Driver.Logout);
router.post('/create-ticket',  controller.Driver.createTicket);
router.post('/help-Support', verify("driver"), controller.Driver.HelpSupport);

// ---------------------------------   Add Driver Details     -----------------------------------
router.post('/add-vehical', verify("driver"), controller.Driver.AddVehicleDetails);
router.post('/add-bank', verify("driver"), controller.Driver.AddBankDetails);
router.post('/add-driving-license', verify("driver"),  upload.fields([
    { name: 'drivinglicense', maxCount: 1 },
  ]),controller.Driver.AddDrivinglicense);


  router.post('/test-file',   upload.fields([
    { name: 'drivinglicense', maxCount: 1 },
  ]),controller.Driver.Test);



// ---------------------------------   Ride History     -----------------------------------
router.get('/ride-complete-history', verify("driver"), controller.driverRide.RideCompletedHistory);
router.get('/ride-cancel-history', verify("driver"), controller.driverRide.RideCanceldHistory);
router.get('/schedule-ride-history',  verify("driver"),  controller.driverRide.scheduleRideHistory);
router.get('/get-cancel-reason', verify("driver"), controller.driverRide.GetDriverCancelReason);
router.post('/live-time', verify("driver"), controller.driverRide.LiveTime);
router.post('/live-status', verify("driver"), controller.driverRide.LiveStatus);



// ---------------------------------   Ride API     -----------------------------------
router.get('/sum-all-data', verify("driver"), controller.driverRide.SumAllData);

router.post('/update-location', verify("driver"), controller.driverRide.UpdateLocation);
router.post('/update-status', verify("driver"), controller.driverRide.UpdateStatus);
router.post('/latest-rides', verify("driver"), controller.driverRide.NearRides);
router.post('/accept-ride', verify("driver"), controller.driverRide.AcceptRide);
router.post('/arrived-driver', verify("driver"), controller.driverRide.ArrivedStatus);
router.post('/start-ride', verify("driver"), controller.driverRide.StartRide);
router.post('/cancel-ride', verify("driver"), controller.driverRide.CancelRide);
router.post('/complete-ride', verify("driver"), controller.driverRide.CompleteRide);
router.post('/add-review',  verify("driver"),  controller.driverRide.addUserReview);
router.get('/life-cycle', verify("driver"), controller.driverRide.Lifecycle);


// ---------------------------------   Driver Wallet     -----------------------------------
router.get('/get-wallet', verify("driver"), controller.driverRide.WalletBalance);
router.get('/get-filter-wallet', verify("driver"), controller.driverRide.FilterWallet);


module.exports = router;