const mongoose = require("mongoose");
const TravelPlan = mongoose.model("TravelPlan");
const PackagePlan = mongoose.model("PackagePlan");
const response = require("./../responses");
const { getReview, getUserStatus } = require("../helper/user");
const { notify } = require("../services/notification");
const Notification = mongoose.model("Notification");
const Idcount = mongoose.model("IdcountSchema");
const User = mongoose.model("User");
const Connection = mongoose.model("Connection");
const moment = require('moment')
const Review = mongoose.model("Review");


module.exports = {
  create: async (req, res) => {
    try {
      const status = await getUserStatus(req.user.id)
      // if (!status) {
      //   return response.error(res, { message: "Your account blocked by Admin. Please contact with our support team, Thanks." });
      // }

      const payload = {
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
      console.log(payload);
      const id = await Idcount.find()
      payload.track_id = id[0].package
      console.log(payload);
      const d = new TravelPlan(payload);
      await d.save();
      if (!payload.paymentDetail) {
        const userDetail = await User.findById(req.user.id)
        userDetail.vault = userDetail.vault - (Number(payload.payamount) * 3)
        await userDetail.save();
      }

      const package = id[0].package + 1
      await Idcount.updateMany({}, { package })

      if (status) {
        let jobs = []
        let newDate = moment().format('YYYY-MM-DD')
        let data = {
          delivery_date: { $gt: new Date(newDate) },
          jobStatus: { $in: ["PENDING", "REJECTED", "REVOKE"] },
          active: true,
          user: { $ne: mongoose.Types.ObjectId(req.user.id) },
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
        let jobs1 = await PackagePlan.find(data).lean();
        delete data.tolocation
        data.location = {
          $near: {
            $maxDistance: 1609.34 * 5,
            $geometry: {
              type: "Point",
              coordinates: req.body.location, // [lang, lat]
            },
          },
        }
        // data.$or = [{
        //   newlocation: {
        //     $near: {
        //       $maxDistance: 1609.34 * 5,
        //       $geometry: {
        //         type: "Point",
        //         coordinates: req.body.location, // [lang, lat]
        //       },
        //     },
        //   }
        // },
        // {
        //   location: {
        //     $near: {
        //       $maxDistance: 1609.34 * 5,
        //       $geometry: {
        //         type: "Point",
        //         coordinates: req.body.location, // [lang, lat]
        //       },
        //     },
        //   }
        // },]

        let jobs2 = await PackagePlan.find(data).lean();
        console.log('jobs2------->', jobs2)
        const traveller = await User.findById(req.user.id)
        await Promise.all(
          jobs2.map(f => {
            jobs1.map(async j => {

              if (f._id.toString() === j._id.toString()) {
                jobs.push(j)
                let userDetail = await User.findById(j.user)
                let travelller = await User.findById(req.user.id)
                if (travelller.verified) {
                  const notObj = {
                    userType: 'USER',
                    senderId: j.user,
                    receverId: req.user.id,
                    travelPlan: d._id,
                    packagePlan: j._id,
                    notification: `New delivery request : Earn ${j.total} by delivering this package for ${userDetail.fullName}`
                  };
                  await Notification.create(notObj);

                  await notify({
                    content: `New delivery request : Earn ${j.total} by delivering this package for ${userDetail.fullName}`,
                    to: req.user.id,
                  });


                  let content = `${traveller.fullName} is heading to "${f.delivery_address}" at ${moment(f.jurney_date).format('DD/MM/YYYY hh:mm A')}`
                  const notObj2 = {
                    userType: 'TRAVELLER',
                    senderId: req.user.id,
                    receverId: j.user,
                    travelPlan: d._id,
                    packagePlan: j._id,
                    notification: content
                  };
                  await notify({
                    content,
                    to: j.user,
                  });
                  await Notification.create(notObj2);


                  let content2 = `${traveller.fullName} is leaving to ${f.delivery_address} at ${moment(f.jurney_date).format('DD/MM/YYYY hh:mm A')}`
                  const notObj3 = {
                    userType: 'TRAVELLER',
                    senderId: req.user.id,
                    receverId: j.user,
                    travelPlan: d._id,
                    packagePlan: j._id,
                    notification: content2
                  };
                  await notify({
                    content: content2,
                    to: j.user,
                  });
                  await Notification.create(notObj3);
                }
              }
            })
          })
        )
        return response.ok(res, { message: "Travel plan posted successfully", verified: true });
      }

      return response.ok(res, { message: "Verify your ID and get started", verified: false });



      // let jobs = await PackagePlan.find({
      //   delivery_date: { $gt: new Date().getTime() },
      //   jobStatus: { $in: ["PENDING", "REJECTED"] },
      //   active: true,
      //   location: {
      //     $near: {
      //       $maxDistance: 1609.34 * 5,
      //       $geometry: {
      //         type: "Point",
      //         coordinates: req.body.location, // [lang, lat]
      //       },
      //     },
      //   },
      // }).lean();
      // jobs.map(async (item) => {
      //   const notObj = {
      //     userType: req.user.type,
      //     senderId: item.user,
      //     receverId: req.user.id,
      //     travelPlan: d._id,
      //     packagePlan: item._id,
      //   };
      //   await Notification.create(notObj);

      // });

      // if (jobs.length) {
      //   await notify({
      //     content: `${jobs.length} package(s) near to your travelplan location`,
      //     to: req.user.id,
      //   });
      // }
      return response.ok(res, { message: "Travel Plan Created" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  gettravelplan: async (req, res) => {
    try {
      let cond = {}
      if (req.user.type !== 'ADMIN') {
        cond.jurney_date = { $gte: new Date() }
      }
      // const data = await TravelPlan.find(cond).populate("user", "-password").sort({ 'createdAt': -1 });
      const data = await TravelPlan.aggregate([
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
                  'completedDelivery': 1
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
            foreignField: 'travelPlan',
            as: 'connection',
            pipeline: [
              {
                $match: { status: { $in: ['PICUPED', 'PICKUP', 'ACCEPTED', 'DELIVER', 'DELIVERED', 'CANCELED'] } }
              },
              {
                $project: {
                  'packagerid': 1,
                  'packagePlan': 1,
                },
              },

              {
                $lookup: {
                  from: 'packageplans',
                  localField: 'packagePlan',
                  foreignField: '_id',
                  as: 'packagePlan',
                  pipeline: [
                    {
                      $project: {
                        'track_id': 1,
                        'track': 1,
                      },
                    },
                  ],
                }
              },
              {
                $unwind: {
                  path: '$packagePlan',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'packagerid',
                  foreignField: '_id',
                  as: 'packagerid',
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
                  path: '$packagerid',
                  preserveNullAndEmptyArrays: true
                }
              },

            ],
          }
        },
        // {
        //   $unwind: {
        //     path: '$connection',
        //     preserveNullAndEmptyArrays: true
        //   }
        // },
      ])
      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },

  gettravelplanById: async (req, res) => {
    try {
      const data = await TravelPlan.findOne({
        _id: req?.params?.id,
      }).populate("user", "-password");
      let d = {
        ...data._doc,
        rating: await getReview(data.user._id),
      }
      return response.ok(res, d);
    } catch (error) {
      return response.error(res, error);
    }
  },

  gettravelplanByUser: async (req, res) => {
    console.log(req.user);

    try {
      let newDate = moment().format('YYYY-MM-DD')
      if (req.query.from === 'Connection') {
        // newDate =moment().format('YYYY-MM-DD')
      } else {
        newDate = new Date(newDate).setDate(new Date(newDate).getDate() - 3);
      }
      // const newDate = new Date().setDate(new Date().getDate() - 3);
      const data = await TravelPlan.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(req.user.id),
            active: true,
            estimate_time: { $gt: new Date(newDate) }
          }
        },
        {
          $lookup: {
            from: 'connections',
            localField: '_id',
            foreignField: 'travelPlan',
            as: 'connections',
            pipeline: [
              {
                $match: { status: 'PICUPED' }
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
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        { $sort: { 'createdAt': -1 } }
      ])



      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },
  getTravelPlanByUserHistory: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      let newDate = moment().format('YYYY-MM-DD')
      if (req.query.from === 'Connection') {
        // newDate = new Date()
      } else {
        newDate = new Date(newDate).setDate(new Date(newDate).getDate() - 3);
      }

      const data = await TravelPlan.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(req.user.id),
            active: true,
            estimate_time: { $lt: new Date(newDate) }
          }
        },

        {
          $lookup: {
            from: 'connections',
            localField: '_id',
            foreignField: 'travelPlan',
            as: 'connections',
            pipeline: [
              {
                $match: { status: "DELIVERED" }
              },
              {
                $project: {
                  '_id': 1,
                  'status': 1,
                  'packagePlan': 1,
                  'packagerid': 1,
                },
              },
            ],
          }
        },
        {
          $unwind: {
            path: '$connections',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'connections.packagerid',
            foreignField: '_id',
            as: 'packager',
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
            path: '$packager',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'packageplans',
            localField: 'connections.packagePlan',
            foreignField: '_id',
            as: 'packagePlan',
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
            path: '$packagePlan',
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
        { $sort: { 'createdAt': -1 } },
        { $limit: limit * 1 },
        { $skip: (page - 1) * limit },
      ])
      let newData = []
      if (data.length > 0) {
        await Promise.all(
          data.map(async item => {
            if (item.user && item.user._id && item.packager && item.packager._id) {
              const rating = await Review.findOne({
                posted_by: item.user._id,
                user: item.packager._id,
              })
              if (rating) {
                item.rating = rating
              }
            }
            newData.push(item)
          }
          )
        )
      }

      return response.ok(res, newData);
    } catch (error) {
      return response.error(res, error);
    }
  },



  cancelPlan: async (req, res) => {
    console.log(';;;;;;;;;;;;;;', req.user);
    try {
      let jobs1;
      let jobs2;
      const travellPlan = await TravelPlan.findById(req.body.id).populate('user');
      travellPlan.active = false;
      await travellPlan.save();
      await Connection.updateMany({ travelPlan: req.body.id, status: { $nin: ['PENDING', 'REJECTED', 'CONNECTED'] } }, { status: "CANCELED" })
      let connection = await Connection.find({ travelPlan: req.body.id, status: { $nin: ['PENDING', 'REJECTED', 'CONNECTED'] } })
      await Promise.all(
        connection.map(async c => {
          // , jobStatus: { $ne: 'PENDING' }
          let package = await PackagePlan.findOne({ _id: c.packagePlan, jobStatus: { $ne: 'PENDING' } }).populate('user');
          // console.log(package)

          if (package) {
            if (package.jobStatus === 'PICUPED') {
              const notObj = {
                userType: req.user.type,
                senderId: req.user.id,
                receverId: package.user._id,
                travelPlan: travellPlan._id,
                packagePlan: package._id,
                notification: `Apologies for the inconvenience, While ${travellPlan.user.fullName} had to cancel his trip, rest assured that your ${package.name} will be delivered by another traveller.`
              };
              await Notification.create(notObj);
              await notify({
                content: `Apologies for the inconvenience, While ${travellPlan.user.fullName} had to cancel his trip, rest assured that your ${package.name} will be delivered by another traveller.`,
                to: package.user._id,
              });
              if (req.body.newLoc) {
                package.oldlocation = package.location
                package.oldpickup = package.address;
                package.newlocation = {
                  type: 'Point',
                  coordinates: req.body.newLoc.location,
                };
                package.newpickup = req.body.newLoc.address;
                package.location = {
                  type: 'Point',
                  coordinates: req.body.newLoc.location,
                };
                package.pickupaddress = req.body.newLoc.address;
              }
            }
            package.jobStatus = "REVOKE";
            await package.save();
            let newDate = moment().format('YYYY-MM-DD')
            let jobs = []
            let data = {
              jurney_date: { $gte: new Date(newDate) },
              active: true,
              mot: { $in: ['Car', 'Bike', 'Auto'] },
              user: { $ne: mongoose.Types.ObjectId(req.user.id) }
            }
            data.tolocation = {
              $near: {
                $maxDistance: 1609.34 * 5,
                $geometry: {
                  type: "Point",
                  coordinates: package.tolocation.coordinates, // [lang, lat]
                },
              },
            }
            jobs1 = await TravelPlan.find(data).populate('user').lean();

            delete data.tolocation
            data.location = {
              $near: {
                $maxDistance: 1609.34 * 8,
                $geometry: {
                  type: "Point",
                  coordinates: req.body.newLoc ? req.body.newLoc.location : package.location.coordinates, // [lang, lat]
                },
              },
            }
            console.log(data.location.$near.$geometry)
            jobs2 = await TravelPlan.find(data).lean();
            await Promise.all(
              jobs2.map(f => {
                jobs1.map(async j => {
                  if (f._id.toString() === j._id.toString()) {
                    jobs.push(j)
                    const notObj = {
                      userType: package.user.type,
                      senderId: package.user.id,
                      receverId: j.user._id,
                      travelPlan: j._id,
                      packagePlan: package._id,
                      notification: `New delivery request : Earn Rs.${package.total} by delivering this package for ${package.user.fullName}`
                    };
                    await Notification.create(notObj);
                    await notify({
                      content: `New delivery request : Earn Rs.${package.total} by delivering this package for ${package.user.fullName}`,
                      to: j.user._id,
                    });
                  }
                })
              })
            )
          }
        })
        // const data = await TravelPlan.findByIdAndUpdate(req.body.id, {
        //   $set: { active: false },
        // });
      )
      return response.ok(res, { message: "Cancelled successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  travellerNearMe2: async (req, res) => {
    try {
      console.log("nearBy location", req.body.location);
      //   let user = await userHelper.find({ _id: req.user.id });
      let newDate = moment().format('YYYY-MM-DD')
      let jobs = await TravelPlan.find({
        jurney_date: { $gte: new Date(newDate) },
        active: true,
        user: { $ne: mongoose.Types.ObjectId(req.user.id) },

        location: {
          $near: {
            $maxDistance: 1609.34 * 5,
            $geometry: {
              type: "Point",
              coordinates: req.body.location, // [lang, lat]
            },
          },
        },
      })
        .populate("user", "-password")
        .lean();
      return response.ok(res, { jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },

  travellerNearMe: async (req, res) => {
    try {
      console.log("nearBy location", req.body.location);
      let newDate = moment().format('YYYY-MM-DD')
      //   let user = await userHelper.find({ _id: req.user.id });
      const payload = req.body;
      let cond = {
        active: true,
        jurney_date: { $gte: new Date(newDate) },

      }
      if (payload.type) {
        cond.user = req.user.id
      }
      let jobs = []
      if (payload.location && payload.tolocation) {
        let data = {
          active: true,
          jurney_date: { $gte: new Date(newDate) },
          user: { $ne: mongoose.Types.ObjectId(req.user.id) },
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
        } else {
          data.user = { $ne: mongoose.Types.ObjectId(req.user.id) }
        }
        let jobs1 = await TravelPlan.find(data)
          .populate("user", "-password").sort({ estimate_time: 1 })
          .lean();

        let data1 = {
          active: true,
          jurney_date: { $gte: new Date(newDate) },
          location: {
            $near: {
              $maxDistance: 1609.34 * 5,
              $geometry: {
                type: "Point",
                coordinates: payload.location, // [lang, lat]
              },
            },
          },

        }
        if (payload.type) {
          data1.user = req.user.id
        } else {
          data1.user = { $ne: mongoose.Types.ObjectId(req.user.id) }
        }
        let jobs2 = await TravelPlan.find(data1)
          .populate("user", "-password").sort({ estimate_time: 1 })
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
          jobs = await TravelPlan.find(cond)
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

  travellerNearMeForUser: async (req, res) => {
    try {
      const payload = req.body;
      const getConnbyStatus = await Connection.find({
        packagePlan: payload.packagePlan,
        status: {
          $in: [
            "ACCEPTED",
            "PICKUP",
            "PICUPED",
            "DELIVER",
            "DELIVERED",
            // "CANCELED"
          ]
        }
      });
      console.log(getConnbyStatus)
      if (getConnbyStatus.length > 0) {
        if (getConnbyStatus[0].travellerid.toString() !== res.user.id) {
          return res.status(201).json({
            success: false,
            message: "Package has been assigned someone else",
          });
        }
        // else {
        //   return res.status(201).json({
        //     success: false,
        //     message: "Package has been assigned someone else",
        //   });
        // }
      }
      console.log("nearBy location", req.body.location);
      //   let user = await userHelper.find({ _id: req.user.id });
      let newDate = moment().format('YYYY-MM-DD')
      let cond = {
        active: true,
        user: { $ne: mongoose.Types.ObjectId(req.user.id) },
        jurney_date: { $gte: new Date(payload.newdate) },
      }
      // if (payload.type) {
      //   cond.user = req.user.id
      // }
      let jobs = []
      let jobs1;
      let jobs2;
      if (payload.location && payload.tolocation) {
        let data = {
          active: true,
          user: mongoose.Types.ObjectId(req.user.id),
          jurney_date: { $gte: new Date(payload.newdate) },
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
        // if (payload.type) {
        //   data.user = req.user.id
        // }
        jobs1 = await TravelPlan.find(data)
          .populate("user", "-password")
          .lean();
        console.log('jobs==========>', jobs1)
        let data1 = {
          active: true,
          jurney_date: { $gte: new Date(payload.newdate) },
          user: mongoose.Types.ObjectId(req.user.id),
          location: {
            $near: {
              $maxDistance: 1609.34 * 5,
              $geometry: {
                type: "Point",
                coordinates: payload.location, // [lang, lat]
              },
            },
          },

        }
        // if (payload.type) {
        //   data1.user = req.user.id
        // }
        jobs2 = await TravelPlan.find(data1)
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
          jobs = await TravelPlan.find(cond)
            .populate("user", "-password")
            .lean();
        };




      // let jobs = await PackagePlan.find(cond)
      //   .populate("user", "-password")
      //   .lean();
      return response.ok(res, { jobs: jobs1 });
    } catch (error) {
      return response.error(res, error);
    }
  },
};
