const express = require("express");
const controller = require("../controllers")
const router = express.Router();
const { verify } = require("../../common/authenticate")

const upload = require('../../common/uploadfile');

const uploadFields = [
  { name: "profileImage", maxCount: 1 },

];
// ----------------------------Authentication-----------------------------------//

router.post('/signup',  controller.User.SignUp);
router.get('/check-user',  controller.User.CheckUser);
router.post('/verifyotp',  controller.User.VerifyOtp);
router.post('/resend-otp',  controller.User.ResendOtp);
router.post('/login',  controller.User.Login);
router.post('/add-email',  controller.User.addEmail);
router.post('/forgate-password',  controller.User.SendOtpOnForgatePassword);
router.post('/forgate-verify-otp',  controller.User.ForgatepasswordOtpVerify);
router.post('/forgate-resend-otp',  controller.User.ResendOtpOnForgatePassword);
router.post('/new-password',  controller.User.SetNewPassword);
router.post('/edit-password', verify("user"), controller.User.EditPassword);
router.get('/getprofile', verify("user"), controller.User.GetProfile);
router.post('/update-profile', verify("user"), upload.fields([{ name: 'profileImage', maxCount: 1 }]) , controller.User.UpdateProfile);

router.post('/change-phone', verify("user"), controller.User.ChangePhone);
router.post('/verify-phone', verify("user"), controller.User.VerifyOtpOnChangePhone);
router.post('/change-email', verify("user"), controller.User.ChangeEmail);
router.post('/verify-email', verify("user"), controller.User.verifyEmail);
router.post('/logout', verify("user"), controller.User.Logout);
router.post('/create-ticket',  controller.User.createTicket);
// router.post('/update-profile', verify("user"), upload.fields([
//     { name: 'profileImage', maxCount: 1 },
//   ]) ,controller.User.UpdateProfile);



router.post('/pubnub',  controller.UserService.Demo);

// ---------------------------------   Ride API     -----------------------------------
router.post('/update-location', verify("user"), controller.UserService.UpdateLocation);
router.get('/top-3-places', verify("user"), controller.UserService.Top_3_places);
router.get('/search-destination', verify("user"), controller.UserService.SearchDestination);
router.get('/get-near-driver', verify("user"), controller.UserService.GetNearDriver);
router.get('/prices', verify("user"), controller.UserService.getprices);
router.post('/book-ride', verify("user"), controller.UserService.BookRide);
router.post('/book-schedule-ride', verify("user"), controller.UserService.ScheduleBookRide);
router.post('/cancel-schedule-ride', verify("user"), controller.UserService.CancelScheduleRide);
router.post('/cancel-ride',  verify("user"),  controller.UserService.CancelRide);
router.get('/get-cancel-reason',  verify("user"),  controller.UserService.GetUserCancelReason);
router.post('/book-bus',  verify("user"),  controller.UserService.BookBus);
router.post('/add-review',  verify("user"),  controller.UserService.addDriverReview);
router.post('/order-status',  verify("user"),  controller.UserService.OrderStatus);
router.post('/request-refund',  verify("user"),  controller.UserService.RequestRefund);

// ---------------------------------   Ride History API     -----------------------------------

router.get('/ride-history',  verify("user"),  controller.UserService.RideHistory);
router.get('/schedule-ride-history',  verify("user"),  controller.UserService.scheduleRideHistory);


// ---------------------------------   Payment API     -----------------------------------
router.post('/change-payment-method',  verify("user"),  controller.UserService.ChangePaymentMethod);
router.get('/payment',  verify("user"),  controller.UserService.Payment);
router.post('/check-payment',  verify("user"),  controller.UserService.CheckPaymentStatus);
router.post('/enable-autopay',  verify("user"),  controller.UserService.EnableAutopay);
router.post('/disable-autopay',  verify("user"),  controller.UserService.DisableAutopay);
router.get('/setup-intent', verify("user"), controller.UserService.GetSetupIntent);
router.get('/saved-cards', verify("user"), controller.UserService.GetSavedCards);




// ----------------------------Payment Gateway-----------------------------------//

router.get('/sync-payment', verify("user"), controller.UserService.CheckOnboardingStatus);



router.get('/life-cycle',  verify("user"),  controller.UserService.Lifecycle);

module.exports = router;