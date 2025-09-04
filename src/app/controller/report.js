const response = require("./../responses");
const mongoose = require("mongoose");
const Report = mongoose.model("Report");

module.exports = {
    create: async (req, res) => {
        try {
            const payload = {
                ...req.body
            }
            console.log(payload);
            let rep = new Report(payload);
            await rep.save();
            return response.ok(res, { message: "Report Created", report: rep });
        } catch (error) {
            console.log(error);
            return response.error(res, error);
        }
    },
    getAllReports: async (req, res) => {
        try {
            const data = await Report.find().sort({ createdAt: -1 })
                .populate({ path: "user", select: "-password" })
                .populate({ path: "connection", populate: { path: "packagerid travellerid", select: '-password' } })
                .populate({ path: "connection", populate: { path: "travelPlan packagePlan" } });
            return response.ok(res, data);
        } catch (error) {
            return response.error(res, error);
        }
    }
}