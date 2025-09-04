"use strict";
const router = require("express").Router();
const connection = require("../../app/controller/connection");
const notification = require("../../app/controller/notification");
const content = require("../../app/controller/content");
const faq = require("../../app/controller/faq");
const packageplan = require("../../app/controller/packageplan");
const report = require("../../app/controller/report");
const travelletPlan = require("../../app/controller/travelletPlan");
const user = require("../../app/controller/user");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const { upload } = require("./../../app/services/fileUpload");
const support = require("../../app/controller/support");
const payment = require("../../app/controller/payment");
const blog = require("../../app/controller/blogs");

router.post("/login", user.login);
router.post('/createContact', user.createContact)
router.post("/notifyuser", user.notifyUser);
// router.get("/createId", packageplan.createId);
router.post("/signUp", user.signUp);
router.post("/sendotp", user.sendotp);
router.post(
  "/profile/changePassword",
  isAuthenticated(["USER", "TRAVELLER"]),
  user.changePasswordProfile
);
router.post("/auth/forgottpassword", user.forgotPassword);
router.get("/getusers", isAuthenticated(["ADMIN"]), user.getAllusers);
router.post("/verifyUser", isAuthenticated(["ADMIN"]), user.verifyUser);


//otp by email//
router.post("/sendOTP", user.sendOTPByEmail);
router.post("/verifyOTP", user.verifyOTPByEmail);
router.post("/changePassword", user.changePasswordByEmail);

router.post("/updateUserLocation", isAuthenticated(["USER", "TRAVELLER", "ADMIN"]), user.updateUserLocation)

router.get(
  "/getProfile",
  isAuthenticated(["USER", "TRAVELLER"]),
  user.getProfile
);
router.post(
  "/updateProfile",
  isAuthenticated(["USER", "TRAVELLER", "ADMIN"]),
  user.updateProfile
);

router.post(
  "/sendreview",
  isAuthenticated(["USER", "TRAVELLER"]),
  user.giverate
);

router.get(
  "/getreview/:id",
  isAuthenticated(["ADMIN"]),
  user.getReview
);

router.get(
  "/getreview",
  isAuthenticated(["ADMIN"]),
  user.getReview
);

router.post(
  "/user/fileupload",

  upload.single("file"),
  user.fileUpload
);

router.post(
  "/user/checkplanstatus",
  isAuthenticated(["ADMIN", "USER", "TRAVELLER"]),
  connection.checkuserConnection
);





router.post("/add-subscriber", user.addNewsLetter);

router.get("/get-subscriber/:type", user.getNewsLetter);

/// packages
router.post("/createpackage", isAuthenticated(["USER"]), packageplan.create);
router.post(
  "/verifyPackage",
  isAuthenticated(["ADMIN"]),
  packageplan.verifyPackage
);
router.get(
  "/getpackages",
  isAuthenticated(["ADMIN", "TRAVELLER", "USER"]),
  packageplan.getPackages
);
router.get(
  "/getpackages/:id",
  isAuthenticated(["ADMIN", "TRAVELLER", "USER"]),
  packageplan.getPackagesByID
);

router.get(
  "/getpackagesbyuser",
  isAuthenticated(["ADMIN", "TRAVELLER", "USER"]),
  packageplan.getPackagesByUser
);
router.get(
  "/getPackagesByUserHistory",
  isAuthenticated(["ADMIN", "TRAVELLER", "USER"]),
  packageplan.getPackagesByUserHistory
);


router.post(
  "/packagesNearMe",
  isAuthenticated(["USER", "TRAVELLER"]),
  packageplan.packagesNearMe
);

router.post(
  "/cancelpackage",
  isAuthenticated(["USER", "TRAVELLER"]),
  packageplan.cancelPlan
);



///traveller
router.post(
  "/createtravelplan",
  isAuthenticated(["USER", "TRAVELLER"]),
  travelletPlan.create
);
router.get(
  "/gettravelplan",
  isAuthenticated(["ADMIN", "USER", "TRAVELLER"]),
  travelletPlan.gettravelplan
);
router.get(
  "/gettravelplan/:id",
  isAuthenticated(["ADMIN", "USER", "TRAVELLER"]),
  travelletPlan.gettravelplanById
);
router.get(
  "/gettravelplanbyuser",
  isAuthenticated(["ADMIN", "USER", "TRAVELLER"]),
  travelletPlan.gettravelplanByUser
);

router.get(
  "/gettravelplanbyuserhistory",
  isAuthenticated(["ADMIN", "USER", "TRAVELLER"]),
  travelletPlan.getTravelPlanByUserHistory
);

router.post(
  "/gettravelplanbyuserwithlocation",
  isAuthenticated(["ADMIN", "USER", "TRAVELLER"]),
  travelletPlan.travellerNearMeForUser
);

router.post(
  "/travellerNearMe",
  isAuthenticated(["USER", "TRAVELLER"]),
  travelletPlan.travellerNearMe
);

router.post(
  "/canceltravelplan",
  isAuthenticated(["USER", "TRAVELLER"]),
  travelletPlan.cancelPlan
);

// Notification
router.post(
  "/sendinvite",
  isAuthenticated(["USER", "TRAVELLER"]),
  notification.createNotification
);

router.post(
  "/sendinvitefromadmin",
  isAuthenticated(["ADMIN"]),
  notification.createNotificationFromAdmin
);

router.get(
  "/getnotification",
  isAuthenticated(["USER", "TRAVELLER", "ADMIN"]),
  notification.getNotification
);

router.get(
  "/getnotification/:id",
  isAuthenticated(["USER", "TRAVELLER"]),
  notification.getNotificationByID
);
/// connection

router.post(
  "/accept-invitation",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.createConnection
);

router.get(
  "/getconnectionbyplan/:plan_id",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.getConnectionByplan
);

router.get(
  "/getconnection/:noti_id",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.getConnectionByNoti
);

router.post(
  "/updateStatus",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.conctionAcceptReject
);

router.get(
  "/history",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.getConnectionHistory
);

router.get(
  "/getconnectionbyuser",
  isAuthenticated(["USER", "TRAVELLER", "ADMIN"]),
  connection.getConnectionByUser
);

router.post(
  "/send-message",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.createChat
);



router.post(
  "/get-message",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.getChat
);

// Report
router.post("/report", isAuthenticated(["USER", "ADMIN", "TRAVELLER"]), report.create);
router.get("/getAllReports", isAuthenticated(["ADMIN"]), report.getAllReports);

//content
router.post("/content", isAuthenticated(["ADMIN"]), content.create);
router.get("/content", content.getContent);

router.post("/privacy", isAuthenticated(["ADMIN"]), content.createprivacy);
router.get("/privacy", content.getprivacy);

//FAQ
router.post("/faq", isAuthenticated(["ADMIN"]), faq.create);
router.delete("/deletfaq/:id", isAuthenticated(["ADMIN"]), faq.delete);
router.post("/updatefaq/:id", isAuthenticated(["ADMIN"]), faq.update);
router.get("/faq", faq.getFAQ);


router.post("/sendnotificationbyadmin", isAuthenticated(["ADMIN"]), notification.sedPushnotification);

router.get("/getpoligon", packageplan.getPolygoneData);

//support
router.post("/create-support", isAuthenticated(["USER", "ADMIN", "TRAVELLER"]), support.support_create);
router.get("/get-support", isAuthenticated(["USER", "ADMIN", "TRAVELLER"]), support.get_support);

//payment
router.post("/create-payment", isAuthenticated(["USER", "ADMIN", "TRAVELLER"]), payment.createPaymentId);


router.post(
  "/isonline",
  isAuthenticated(["USER", "TRAVELLER"]),
  connection.onlineNotify
);

router.post(
  "/updatetrack",
  isAuthenticated(["USER", "TRAVELLER"]),
  packageplan.updatetrack
);

router.post(
  "/user/support",
  user.supportMail
);


//blogs
router.get("/getblogcategory", blog.getBloggCategory);
router.post(
  "/create-blog",
  isAuthenticated(["USER", "ADMIN"]),
  blog.createBlog
);
router.get("/get-blog", blog.getBlog);
router.post(
  "/update-blog",
  isAuthenticated(["USER", "ADMIN"]),
  blog.updateBlog
);
router.post("/getBlogById", blog.getBlogById);
router.post("/getBlogByCategory", blog.getBlogByCategory);
router.delete(
  "/delete-blog",
  isAuthenticated(["USER", "ADMIN"]),
  blog.deleteBlog
);

module.exports = router;
