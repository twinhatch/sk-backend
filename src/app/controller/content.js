const response = require("./../responses");
const mongoose = require("mongoose");
const Content = mongoose.model("Content");
const Privacy = mongoose.model("Privacy");

module.exports = {
  create: async (req, res) => {
    try {
      const payload = {
        ...req.body,
      };
      if (payload.id) {
        let updatedData = await Content.findByIdAndUpdate(payload.id, payload, {
          new: true,
          upsert: true,
        });
        return response.ok(res, {
          message: "Content Updated",
          content: updatedData,
        });
      } else {
        //console.log(payload);
        let content = new Content(payload);
        await content.save();
        return response.ok(res, { message: "Content Created", content });
      }
    } catch (error) {
      console.log(error);
      return response.error(res, error);
    }
  },
  getContent: async (req, res) => {
    try {
      const data = await Content.find();
      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },

  createprivacy: async (req, res) => {
    try {
      const payload = {
        ...req.body,
      };
      if (payload.id) {
        let updatedData = await Privacy.findByIdAndUpdate(payload.id, payload, {
          new: true,
          upsert: true,
        });
        return response.ok(res, {
          message: "Content Updated",
          content: updatedData,
        });
      } else {
        //console.log(payload);
        let content = new Privacy(payload);
        await content.save();
        return response.ok(res, { message: "Content Created", content });
      }
    } catch (error) {
      console.log(error);
      return response.error(res, error);
    }
  },
  getprivacy: async (req, res) => {
    try {
      const data = await Privacy.find();
      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },
};
