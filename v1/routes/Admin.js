const express = require("express");
const controller = require("../controllers")
const router = express.Router();
const { verify } = require("../../common/authenticate")
const { checkpermission , superAdminpermissions } = require("../../common/checkpermissions")

const uploadFields = [
  { name: "issueImage", maxCount: 1 },
  { name: "brandLogo", maxCount: 1 },
  { name: "trademark", maxCount: 1 },
  { name: "ItemImage", maxCount: 1 },
];
const { configureUpload } = require("../../common/uploadfile");
// ----------------------------Admin Auth API-----------------------------------//
router.post('/signup',  controller.Admin.SignUp);
// router.post('/verify-otp',  controller.Admin.VerifyAdminOTP);
router.post('/login',  controller.Admin.Login);
router.post('/logout', verify("admin"), controller.Admin.Logout);
router.post('/forgate-password',  controller.Admin.ForgatePassword);
router.post('/verify-forgate-password',  controller.Admin.VerifyForgotPasswordOTP);
router.post('/set-new-password',  controller.Admin.SetNewPassword);
router.post('/create-role', verify("admin"), controller.Admin.createOrUpdateRole);
router.post('/assign-role', verify("admin"), controller.Admin.assignRoleToAdmin);
router.post('/get-all-admin', verify("admin"), controller.Admin.GetAllAdmin);




// ---------------------------------   Customer Management    -----------------------------------

router.get('/get-all-user', verify("admin"), controller.AdminUser.GetAllUser);
router.get('/get-user-id', verify("admin"), controller.AdminUser.getUserbyId);
router.post('/change-user-status', verify("admin"), controller.AdminUser.BlockUserById);
router.get('/get-user-trips', verify("admin"), controller.AdminUser.GetAllTripByUserId);
router.get('/get-trip-id', verify("admin"), controller.AdminUser.GetTripById);
router.get('/get-user-trip-state', verify("admin"), controller.AdminUser.GetUserTripState);




// ---------------------------------   Admin changes api    -----------------------------------
router.post('/add-vehicle-price',  verify("admin"),controller.Admin.AddVehicleType);
router.get('/get-all-vehicle',  verify("admin"), controller.Admin.GetAllVehicle);
router.get('/get-all-ticket',  verify("admin"), controller.Admin.GetAllTicket);
router.get('/get-ticket-id', verify("admin"),  controller.Admin.GetTicketById);
router.post('/send-reply', verify("admin"),  controller.Admin.SendReply);
router.post('/change-ticket-status', verify("admin"),  controller.Admin.ChangeTicketStatus);

router.post('/edit-vehicle-price',  verify("admin"),controller.Admin.EditVehicleType);
router.post('/delete-vehicle-type',  verify("admin"),controller.Admin.DeleteBankAccountType);

router.post('/add-account-type',  verify("admin"),controller.Admin.AddAccountType);
router.post('/edit-account-type',  verify("admin"),controller.Admin.EditBankAccountType);
router.post('/delete-account-type',  verify("admin"),controller.Admin.DeleteBankAccountType);
router.post('/change-status-account-type',  verify("admin"),controller.Admin.ChangeStatusAccountType);
router.get('/get-account-type' ,controller.Admin.GetAllBankAccount);
router.get('/get-all-vehicleType', controller.Admin.GetAllVehicleType);

router.get('/dashboard-state',  verify("admin"),controller.Admin.DashboardState);
router.get('/recent-order',  verify("admin"),controller.Admin.recentOrders);
router.get('/top-rider',  verify("admin"),controller.Admin.Top_5_Rider);
router.get('/weekly-performance',  verify("admin"),controller.Admin.WeeklyRiderPerformace);



router.post('/add-cancel-reason',  verify("admin"),controller.Admin.AddCancelReason);
router.get('/get-cancel-reason',  verify("admin"),controller.Admin.GetCancelReasons);
router.post('/edit-cancel-reason',  verify("admin"),controller.Admin.EditCancelReason);
router.post('/delete-cancel-reason',  verify("admin"),controller.Admin.DeleteCancelReason);
router.post('/change-status-cancel-reason',  verify("admin"),controller.Admin.ChangeStatusCancelReason);


// ---------------------------------   Driver Management api    -----------------------------------
router.get('/get-all-driver', verify("admin"),  controller.AdminDriver.GetAllDriver);
router.get('/get-driver-id', verify("admin"),  controller.AdminDriver.getDriverbyId);
router.post('/change-driver-status', verify("admin"), controller.AdminDriver.BlockdriverById);
router.get('/get-driver-trips', verify("admin"), controller.AdminDriver.GetAllTripBydriverId);
router.get('/get-trip-id', verify("admin"), controller.AdminDriver.GetTripById);
router.post('/verify-by-admin', verify("admin"), controller.AdminDriver.VerifyDocuments);
router.get('/get-driver-trip-state', verify("admin"), controller.AdminDriver.GetDriverTripSTate);


// ---------------------------------   Ride Management api    -----------------------------------
router.get('/get-all-ride', verify("admin"),  controller.AdminRide.GetAllRide);
router.get('/get-ride-id', verify("admin"),  controller.AdminRide.getRidebyId);
router.get('/get-all-bus-ride', verify("admin"),  controller.AdminRide.GetAllBusRide);
router.post('/assisgn-bus', verify("admin"),  controller.AdminRide.AssignBusDriver);

module.exports = router;