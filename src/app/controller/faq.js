const response = require("./../responses");
const mongoose = require("mongoose");
const FAQ = mongoose.model("FAQ");

module.exports = {
    create: async (req, res) => {
        try {
            const payload = {
                ...req.body
            }
            // console.log(payload);
            let faq = new FAQ(payload);
            await faq.save();
            return response.ok(res, { message: "FAQ Created", faq });
        } catch (error) {
            console.log(error);
            return response.error(res, error);
        }
    },
    delete: async (req, res) => {
        try {

            await FAQ.findByIdAndDelete(req.params.id);
            return response.ok(res, { message: "FAQ Deleted" });
        } catch (error) {
            console.log(error);
            return response.error(res, error);
        }
    },
    update: async (req, res) => {
        try {
            console.log(req.params)
            await FAQ.findByIdAndUpdate(req.params.id, req.body);
            return response.ok(res, { message: "FAQ updated" });
        } catch (error) {
            console.log(error);
            return response.error(res, error);
        }
    },
    getFAQ: async (req, res) => {
        try {

            const data = await FAQ.find()
            return response.ok(res, data);
        } catch (error) {
            return response.error(res, error);
        }
    }
}