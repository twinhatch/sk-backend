const mongoose = require("mongoose");
const Support = mongoose.model("Support");
const SupportChat = mongoose.model("SupportChat");
const response = require("./../responses");

module.exports = {
    support_create: async (req, res) => {
        try {
            const support = await Support.findOne({ support_id: req.body.support_id })
            if (req.body.query) {
                support.satisfied = false
                support.query = req.body.query;
            }
            if (req.body.sub_query) {
                support.satisfied = false
                support.sub_query = req.body.sub_query;
            }

            if (req.body.satisfied) {
                support.satisfied = false
            }
            if (req.body.query || req.body.sub_query || req.body.satisfied) {
                await support.save()
            }
            if (support) {
                return response.ok(res, support);
            }
            const datas = new Support(req.body);
            const data = await datas.save()
            await SupportChat.create({
                connection: data._id,
                receiver: req.user.id,
                message: "May I help you?",
                support_id: req.body.support_id,
                userId: req.user.id
            })
            return response.ok(res, data);
        } catch (error) {
            return response.error(res, error);
        }
    },

    get_support: async (req, res) => {
        try {
            const data = await Support.find();
            return response.ok(res, data);
        } catch (error) {
            return response.error(res, error);
        }
    }




}