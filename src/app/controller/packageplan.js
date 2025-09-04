const mongoose = require("mongoose");
const PackagePlan = mongoose.model("PackagePlan");
const response = require("./../responses");
const { notify } = require("../services/notification");
const { getReview, getUserStatus } = require("../helper/user");

const TravelPlan = mongoose.model("TravelPlan");
const Notification = mongoose.model("Notification");
const Idcount = mongoose.model("IdcountSchema");
const User = mongoose.model("User");
const Connection = mongoose.model("Connection");
var cron = require('node-cron');
const moment = require('moment')
const geolib = require('geolib');
const Review = mongoose.model("Review");

module.exports = {
  create: async (req, res) => {
    try {
      const status = await getUserStatus(req.user.id)
      if (!status) {
        return response.error(res, { message: "Your account blocked by Admin. Please contact with our support team, Thanks." });
      }
      let payload = {
        ...req.body,
        user: req.user.id,
        location: {
          type: "Point",
          coordinates: req.body.location,
        },
        tolocation: {
          type: "Point",
          coordinates: req.body.tolocation,
        },
      };
      if (payload.track) {
        payload.track = {
          type: "Point",
          coordinates: req.body.location,
        };
      }
      const id = await Idcount.find()
      payload.track_id = id[0].package
      let pkg = new PackagePlan(payload);
      let d = await pkg.save();
      const package = id[0].package + 1
      await Idcount.updateMany({}, { package })
      const newDate = new Date().setDate(new Date().getDate() + 5);
      const format = moment(newDate).format('ss mm HH DD MMM dddd')
      // cron.schedule(format.toString(), async () => {
      //   const con = await Connection.findOne({
      //     packagePlan: d._id, status: {
      //       $in: ["ACCEPTED",
      //         "PICKUP",
      //         "PICUPED",
      //         "DELIVER",
      //         "DELIVERED",]
      //     }
      //   })
      //   if (!con) {

      //     let content = `Apologies for the inconvenience. Unfortunately, no travellers were available to deliver "${d.name}" from "${d.address}" to "${d.delivery_address}". Full refund has been processed.`
      //     await notify({
      //       to: d.user,
      //       content
      //     })
      //     const notObj = {
      //       userType: 'ADMIN',
      //       senderId: d.user,
      //       receverId: d.user,
      //       travelPlan: d._id,
      //       packagePlan: d._id,
      //       notification: content
      //     };
      //     const noti = new Notification(notObj)
      //     const newNoti = await noti.save()
      //     const packager = await User.findById(d.user)
      //     packager.wallet = (packager?.wallet || 0) + d.total
      //     packager.paymetStatus = 'Pending'
      //     await packager.save();
      //     await PackagePlan.findByIdAndUpdate(d._id, { active: false })
      //   }
      // }
      // );
      let newDates = moment().format('YYYY-MM-DD')
      let userDetail = await User.findById(req.user.id)
      let jobs = []
      let data = {
        jurney_date: { $gte: new Date(newDates) },
        active: true,
        user: { $ne: mongoose.Types.ObjectId(req.user.id) },
        newlocation: { $exists: false }
        // mot: { $in: ['Car', 'Bike', 'Auto'] }
      }
      data.tolocation = {
        $near: {
          $maxDistance: 1609.34 * 5,
          $geometry: {
            type: "Point",
            coordinates: req.body.tolocation, // [lang, lat]
          },
        },
      }
      let jobs1 = await TravelPlan.find(data).lean();
      delete data.tolocation
      data.location = {
        $near: {
          $maxDistance: 1609.34 * 8,
          $geometry: {
            type: "Point",
            coordinates: req.body.location, // [lang, lat]
          },
        },
      }

      let jobs2 = await TravelPlan.find(data).lean();
      if (jobs2.length > 0) {
        const traveller = await User.findById(jobs2[0].user)
        await Promise.all(
          jobs2.map(f => {
            jobs1.map(async j => {
              if (f._id.toString() === j._id.toString() && traveller.verified) {
                jobs.push(j)
                let notObj = {
                  userType: req.user.type,
                  senderId: req.user.id,
                  receverId: j.user,
                  travelPlan: j._id,
                  packagePlan: d._id,
                  notification: `New delivery request : Earn Rs.${d.total} by delivering ${d.name} to "${d.delivery_address}" for ${userDetail.fullName}`
                };
                await Notification.create(notObj);
                await notify({
                  content: notObj.notification,
                  to: j.user,
                });

                let content = `${traveller.fullName} is heading to "${d.delivery_address}" at ${moment(d.jurney_date).format('DD/MM/YYYY hh:mm A')}`
                const notObj2 = {
                  userType: 'TRAVELLER',
                  senderId: j.user,
                  receverId: req.user.id,
                  travelPlan: j._id,
                  packagePlan: d._id,
                  notification: content
                };
                await notify({
                  content,
                  to: req.user.id,
                });
                await Notification.create(notObj2);


                let content2 = `${traveller.fullName} is leaving to ${d.delivery_address} at ${moment(d.jurney_date).format('DD/MM/YYYY hh:mm A')}`
                const notObj3 = {
                  userType: 'TRAVELLER',
                  senderId: j.user,
                  receverId: req.user.id,
                  travelPlan: j._id,
                  packagePlan: d._id,
                  notification: content2
                };
                await notify({
                  content: content2,
                  to: req.user.id,
                });
                await Notification.create(notObj3);

              }
            })
          })
        )
      }

      return response.ok(res, { message: "Package posted successfully" });
    } catch (error) {
      console.log(error)
      return response.error(res, error);
    }
  },

  getPackages: async (req, res) => {
    try {
      let cond = {}
      if (req.user.type !== 'ADMIN') {
        cond.delivery_date = { $gt: new Date().getTime() }
      }
      console.log(req.user)
      // const data = await PackagePlan.find(cond).populate("user", "-password").sort({ createdAt: -1 });
      const data = await PackagePlan.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  'email': 1,
                  'fullName': 1,
                  'phone': 1,
                  'profile': 1,
                  'userID': 1,
                  'track': 1,
                },
              },
            ],
          }
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'connections',
            localField: '_id',
            foreignField: 'packagePlan',
            as: 'connection',
            pipeline: [
              {
                $match: { status: { $in: ['PICUPED', 'PICKUP', 'ACCEPTED', 'DELIVER', 'DELIVERED',] } }
              },
              {
                $project: {
                  'travellerid': 1,
                  'travelPlan': 1,
                },
              },

            ],
          }
        },

        {
          $unwind: {
            path: '$connection',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'connection.travellerid',
            foreignField: '_id',
            as: 'connection.travellerid',
            pipeline: [
              {
                $project: {
                  'email': 1,
                  'fullName': 1,
                  'phone': 1,
                  'profile': 1,
                  'userID': 1,
                  'track': 1,
                },
              },
            ],
          }
        },
        {
          $unwind: {
            path: '$connection.travellerid',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'travelplans',
            localField: 'connection.travelPlan',
            foreignField: '_id',
            as: 'connection.travelPlan',
            pipeline: [
              {
                $project: {
                  // '_id': 1,
                  'track_id': 1,
                },
              },
            ],
          }
        },
        {
          $unwind: {
            path: '$connection.travelPlan',
            preserveNullAndEmptyArrays: true
          }
        },

      ])
      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },

  verifyPackage: async (req, res) => {
    console.log(req.body);
    try {
      const u = await PackagePlan.findByIdAndUpdate(
        req.body.package_id,
        {
          $set: { status: req.body.status },
        },
        { new: true, upsert: true }
      );
      if (req.body.status === 'Rejected') {
        const notObj = {
          userType: 'ADMIN',
          senderId: req.user.id,
          receverId: u.user,
          travelPlan: u._id,
          packagePlan: u._id,
          notification: `Your ${u.name} has been rejected by Admin. Contact Support team for clarification`
        };
        console.log(notObj)
        const noti = new Notification(notObj)
        await noti.save();
        await notify({
          to: u.user,
          content: notObj.notification
        })
      }
      return response.ok(res, { message: `${req.body.status} successfully` });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getPackagesByID: async (req, res) => {
    try {
      const data = await PackagePlan.findOne({
        _id: req?.params.id,
      }).populate("user", "-password");
      let d = {
        ...data._doc,
        rating: await getReview(data.user._id),
      }
      // if (req.query.to) {
      //   const user = await User.findById(req.query.to)
      //   d.track = user.track
      // }
      console.log(req.query.push, typeof req.query.push)
      if (req.query.push) {
        const connect = await Connection.findOne({ packagePlan: req?.params.id, $and: [{ jobStatus: { $ne: "PENDING" } }, { jobStatus: { $ne: 'ACCEPTED' } }, { jobStatus: { $ne: 'ACCEPT' } }, { jobStatus: { $ne: "REJECTED" } },] }, 'travellerid').populate('travellerid', 'track')
        // const user = await User.findById(connect.travellerid)
        d.track = connect.travellerid.track
        if (req.query.push === 'true')
          await notify({
            content: `"Sadanam Kayyilundo?" "Is the package with you?"`,
            to: connect.travellerid._id,
          });
      }
      return response.ok(res, d);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getPackagesByUser: async (req, res) => {
    try {
      let newDate
      if (req.query.from === 'Connection') {
        newDate = new Date()
      } else {
        newDate = new Date().setDate(new Date().getDate() - 3);
      }

      // const data = await PackagePlan.find({
      //   user: req?.user?.id,
      //   active: true,
      //   $or: [
      //     { finaldeliveryDate: { $exists: false } },
      //     { finaldeliveryDate: { $gt: new Date(newDate).getTime() } }
      //   ]
      //   // delivery_date: {
      //   //   $gt: new Date(newDate).getTime(),
      //   // },
      // }).populate("user", "-password").sort({ 'createdAt': -1 });

      const data = await PackagePlan.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(req.user.id),
            active: true,
            jobStatus: { $ne: 'TIMEUP' },
            $or: [
              { finaldeliveryDate: { $exists: false } },
              { finaldeliveryDate: { $gt: new Date(newDate) } }
            ]
          }
        },

        {
          $lookup: {
            from: 'connections',
            localField: '_id',
            foreignField: 'packagePlan',
            as: 'connections',
            pipeline: [
              {
                $match: { status: { $in: ['PICUPED', 'PICKUP', 'ACCEPTED', 'DELIVER', 'DELIVERED', 'CANCELED'] } }
              },
              {
                $project: {
                  '_id': 1,
                  'status': 1
                },
              },
            ],
          }
        },
        // { $unwind: "$connections" },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  'password': 0,
                },
              },
            ],
          }
        },
        { $unwind: "$user" },
        { $sort: { 'createdAt': -1 } }

      ])
      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getPackagesByUserHistory: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      let newDate
      if (req.query.from === 'Connection') {
        newDate = new Date()
      } else {
        newDate = new Date().setDate(new Date().getDate() - 3);
      }

      const data = await PackagePlan.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(req.user.id),
            active: true,
            $or: [
              { jobStatus: 'TIMEUP' },
              { finaldeliveryDate: { $lt: new Date(newDate) } },
            ]
          }
        },

        {
          $lookup: {
            from: 'connections',
            localField: '_id',
            foreignField: 'packagePlan',
            as: 'connections',
            pipeline: [
              {
                $project: {
                  '_id': 1,
                  'status': 1,
                  'travelPlan': 1,
                  'travellerid': 1,
                },
              },
            ],
          }
        },
        // {
        //   $unwind: {
        //     path: '$connections',
        //     preserveNullAndEmptyArrays: true
        //   }
        // },
        {
          $lookup: {
            from: 'users',
            localField: 'connections.travellerid',
            foreignField: '_id',
            as: 'traveller',
            pipeline: [
              {
                $project: {
                  'password': 0,
                },
              },
            ],
          }
        },
        {
          $unwind: {
            path: '$traveller',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'travelplans',
            localField: 'connections.travelPlan',
            foreignField: '_id',
            as: 'travelPlan',
            pipeline: [
              {
                $project: {
                  'password': 0,
                },
              },
            ],
          }
        },
        {
          $unwind: {
            path: '$travelPlan',
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  'password': 0,
                },
              },
            ],
          }
        },
        { $unwind: "$user" },

        // {
        //   $lookup: {
        //     from: 'reviews',
        //     localField: 'user._id',
        //     foreignField: 'posted_by',
        //     as: 'rating',
        //     pipeline: [

        //       {
        //         $match: {
        //           $let:
        //           {
        //             vars: { high: "$traveller._id" },
        //             in: { user: '$high' }
        //           }
        //         }
        //       }
        //     ]
        //   },
        // },



        // {
        //   $unwind: {
        //     path: '$rating',
        //     preserveNullAndEmptyArrays: true
        //   }
        // },
        // { $unwind: "$rating" },

        { $sort: { 'createdAt': -1 } },
        { $limit: limit * 1 },
        { $skip: (page - 1) * limit },
      ])
      let newData = []
      await Promise.all(
        data.map(async item => {
          const rating = await Review.findOne({
            posted_by: item.user._id,
            user: item.traveller._id,
          })
          if (rating) {
            item.rating = rating
          }
          newData.push(item)
        }
        )
      )
      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },

  cancelPlan: async (req, res) => {
    console.log(req.user);
    try {
      const package = await PackagePlan.findByIdAndUpdate(req.body.id, {
        $set: { active: false },
      }, { upsert: true, new: true }).populate('user');
      let connection = await Connection.find({ packagePlan: req.body.id, status: { $nin: ['PENDING', 'REJECTED', 'CONNECTED'] } })
      let packager = await User.findById(package.user._id)
      console.log(package)
      if (connection.length === 0) {
        packager.refund = packager.refund + package.total
        packager.paymetStatus = 'Pending'
        await packager.save()
        return response.ok(res, { message: "Cancelled successfully" });
      }
      await Promise.all(
        connection.map(async (item) => {
          const travelPlans = await TravelPlan.findOne({ _id: item.travelPlan }).populate('user');
          if (travelPlans) {
            let content = `${package.user.fullName}'s delivery to ${package.delivery_address} was cancelled. We'll notify if other packages match your route`

            if (item.status === 'ACCEPTED') {
              const start = {
                latitude: package.location.coordinates[1],
                longitude: package.location.coordinates[0],
              };
              const end = {
                latitude: package.track.coordinates[1],
                longitude: package.track.coordinates[0],
              };
              const distance = geolib.getDistance(start, end);
              const km = geolib.convertDistance(distance, 'km');
              if (km <= 3) {

                let custamount = (package.total / 100) * 30
                let vaultAmount = (custamount / 100) * 5
                const traveller = await User.findById(travelPlans.user._id)
                // {
                //   $inc: { wallet: custamount - vaultAmount },
                //   $inc: { vault: vaultAmount * 3 }
                // }
                content = `${package.user.fullName} has cancelled the ${package.name}. You have earned Rs.${custamount}`
                traveller.wallet = (traveller?.wallet || 0) + (custamount - vaultAmount);
                traveller.vault = (traveller?.vault || 0) + (vaultAmount * 3)
                await traveller.save();
                packager.refund = (packager?.refund || 0) + package.total - custamount
                await packager.save()

              } else {
                packager.refund = (packager?.refund || 0) + package.total
                await packager.save()
              }

              const notObj = {
                userType: req.user.type,
                senderId: req.user.id,
                receverId: travelPlans.user._id,
                travelPlan: travelPlans._id,
                packagePlan: req.body.id,
                notification: content
              };
              await Notification.create(notObj);
              await notify({
                content,
                to: travelPlans.user._id,
              });
            }

          } else {
            packager.refund = (packager?.refund || 0) + package.total
            await packager.save()
          }
        })
      )
      await Connection.updateMany({ packagePlan: req.body.id, status: { $nin: ['PENDING', 'REJECTED', 'CONNECTED'] } }, { status: "CANCELED" }, { upsert: true, new: true })

      return response.ok(res, { message: "Cancelled successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  updatetrack: async (req, res) => {
    console.log(req.user);
    try {
      let newDate = new Date().setDate(new Date().getDate() - 2);
      // { status: { $ne: 'ACCEPT' } }
      let connection = await Connection.find({
        travellerid: req.user.id, $and: [{ status: { $ne: "PENDING" } }, { status: { $ne: 'CONNECTED' } },], $or: [
          { finaldeliveryDate: { $exists: false } },
          { finaldeliveryDate: { $gt: newDate } }
        ]
      })
      let newdata = {}
      if (connection.length > 0) {
        const pkgIDs = connection.map(ids => ids.packagePlan);
        await PackagePlan.updateMany(
          {
            _id: { $in: pkgIDs }
            // deviceToken: req.body.deviceToken,
            // delivery_date: { $gt: new Date().getTime() },
          },
          {
            $set: {
              track: {
                type: "Point",
                coordinates: req.body.track,
              },
              track_address: req.body.address
            },
          }
        );
        await Promise.all(
          connection.map(async c => {
            newdata = await TravelPlan.findByIdAndUpdate(c.travelPlan,
              {
                track: {
                  type: "Point",
                  coordinates: req.body.track,
                },
                track_address: req.body.address
              })
          })
        )
      }

      const travellPlan = await TravelPlan.find({
        user: req.user.id,
        jurney_date: { $lte: new Date() },
        estimate_time: { $gte: new Date() },
        active: true,
      }).populate('user')
      let jobs = []
      if (travellPlan.length > 0) {
        //  if (payload.location && payload.tolocation) {
        await Promise.all(
          travellPlan.map(async (plan) => {
            let mot = ['Car', 'Bike', 'Auto']
            if (mot.includes(plan.mot)) {
              const data = {
                jobStatus: 'PENDING',
                active: true,
                // delivery_date: { $gt: new Date().getTime() },
                tolocation: {
                  $near: {
                    $maxDistance: 1609.34 * 5,
                    $geometry: {
                      type: "Point",
                      coordinates: plan.tolocation.coordinates, // [lang, lat]
                    },
                  },

                }
              }
              let jobs1 = await PackagePlan.find(data)
                .populate("user", "-password")
                .lean();
              const data1 = {
                jobStatus: 'PENDING',
                active: true,
                // delivery_date: { $gt: new Date().getTime() },

                location: {
                  $near: {
                    $maxDistance: 1609.34 * 8,
                    $geometry: {
                      type: "Point",
                      coordinates: req.body.track // [lang, lat]
                    },
                  },
                },

              }

              let jobs2 = await PackagePlan.find(data1)
                .populate("user", "-password")
                .lean();
              jobs2.map(f => {
                jobs1.map(j => {
                  if (f._id.toString() === j._id.toString()) {
                    jobs.push(j)
                  }
                })
              })

            }
          }
          )
        )


        // } 
      }

      console.log(jobs)

      if (jobs.length > 0) {
        // jobs.map(async (j) => {
        await notify({ to: req.user.id, content: 'Found new package near your cuurent location. if intrested, please contact to the client.' })

        // })
      }


      return response.ok(res, { message: "updated successfully", data: newdata });
    } catch (error) {
      return response.error(res, error);
    }
  },

  packagesNearMe: async (req, res) => {
    try {
      const id = ['66419e52d9e2dab8d87c26f8', '6641fd4fbdadd4bc8c34be0c', '66446bede3d73baebea8fe56', '66448ffb0b96d03d16c52ab7', '6644a217246c2d3d0c7c5d6c', '6644a3d0246c2d3d0c7c5e9b'];
      let ids = id.map(f => new mongoose.Types.ObjectId(f))
      console.log("nearBy location", req.body.location);
      //   let user = await userHelper.find({ _id: req.user.id });
      const das = new Date(new Date().setDate(new Date().getDate() - 5))
      const newDate = moment(new Date(das)).format('YYYY-MM-DD')
      const payload = req.body;
      console.log(payload)
      let cond = {
        jobStatus: { $in: ['PENDING', 'REJECTED', "REVOKE"] },
        // $or: [{ jobStatus: { $eq: "PENDING" } }, { jobStatus: { $eq: 'REJECTED' } }],
        active: true,
        status: "Approved",
        // $or:[]
        $or: [{ createdAt: { $gt: new Date(newDate) } }, { user: { $in: ids } }],
        $or: [{ accepted_delivery_date: { $exists: false } }, { accepted_delivery_date: { $gt: new Date().getTime() } }],
      }
      if (payload.type) {
        cond.user = req.user.id
      }
      let jobs = []
      if (payload.location && payload.location.length > 0 && payload.tolocation && payload.tolocation.length > 0) {
        const data = {
          // $or: [{ jobStatus: { $eq: "PENDING" } }, { jobStatus: { $eq: 'REJECTED' } }],
          jobStatus: { $in: ['PENDING', 'REJECTED', "REVOKE"] },
          active: true,
          // accepted_delivery_date: { $gt: new Date().getTime() },
          $or: [{ accepted_delivery_date: { $gt: new Date().getTime() } }, { delivery_date: { $gt: new Date().getTime() } }],
          tolocation: {
            $near: {
              $maxDistance: 1609.34 * 5,
              $geometry: {
                type: "Point",
                coordinates: payload.tolocation, // [lang, lat]
              },
            },

          }
        }
        if (payload.type) {
          data.user = req.user.id
        }
        let jobs1 = await PackagePlan.find(data)
          .populate("user", "-password")
          .lean();

        const data1 = {
          jobStatus: { $in: ['PENDING', 'REJECTED', "REVOKE"] },
          // $or: [{ jobStatus: { $eq: "PENDING" } }, { jobStatus: { $eq: 'REJECTED' } }],
          active: true,
          // accepted_delivery_date: { $gt: new Date().getTime() },
          $or: [{ accepted_delivery_date: { $gt: new Date().getTime() } }, { delivery_date: { $gt: new Date().getTime() } }],
          location: {
            $near: {
              $maxDistance: 1609.34 * 5,
              $geometry: {
                type: "Point",
                coordinates: payload.location, // [lang, lat]
              },
            },
          },

          // $or: [{
          //   newlocation: {
          //     $near: {
          //       $maxDistance: 1609.34 * 5,
          //       $geometry: {
          //         type: "Point",
          //         coordinates: payload.location, // [lang, lat]
          //       },
          //     },
          //   },
          // },

          // {
          //   location: {
          //     $near: {
          //       $maxDistance: 1609.34 * 5,
          //       $geometry: {
          //         type: "Point",
          //         coordinates: payload.location, // [lang, lat]
          //       },
          //     },
          //   },

          // }
          // ]


        }
        if (payload.type) {
          data1.user = req.user.id
        }
        let jobs2 = await PackagePlan.find(data1)
          .populate("user", "-password")
          .lean();

        await Promise.all(
          jobs2.map(f => {
            jobs1.map(j => {
              if (f._id.toString() === j._id.toString()) {
                jobs.push(j)
              }
            })
          })
        )

      } else
        if (payload.location) {
          cond.location = {
            $near: {
              $maxDistance: 1609.34 * 5,
              $geometry: {
                type: "Point",
                coordinates: payload.location, // [lang, lat]
              },
            },
          }
          // cond.$or = [{
          //   newlocation: {
          //     $near: {
          //       $maxDistance: 1609.34 * 5,
          //       $geometry: {
          //         type: "Point",
          //         coordinates: payload.location, // [lang, lat]
          //       },
          //     },
          //   },
          // },
          // {
          //   location: {
          //     $near: {
          //       $maxDistance: 1609.34 * 5,
          //       $geometry: {
          //         type: "Point",
          //         coordinates: payload.location, // [lang, lat]
          //       },
          //     },
          //   },

          // }
          // ]

          jobs = await PackagePlan.find(cond)
            .populate("user", "-password")
            .lean();
        };




      // let jobs = await PackagePlan.find(cond)
      //   .populate("user", "-password")
      //   .lean();
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },

  createId: async (req, res) => {
    const id = await Idcount.create({
      package: 1,
      traveller: 1
    })
    return response.ok(res, { id });
  },

  getPolygoneData: async (req, res) => {
    var pointFields = { '_id': 1, 'location': 1 };
    PackagePlan.find({
      location:
      {
        $geoWithin:
        {
          $geometry:
          {
            type: "Polygon",
            coordinates: [[
              [72.8506921, 21.1710689],

              [72.8493196, 21.2062952],
              [72.8312383, 21.2266205],
            ]]
          }
        }
      }
    }).select(pointFields).lean().exec(function (error, result) {
      console.log("Error: " + error);
      return response.ok(res, { result });
      // processResponse(error, result, response);
    });
    // return response.ok(res, { id });
  }


};
