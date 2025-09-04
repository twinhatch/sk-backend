const Razorpay = require('razorpay');
const response = require("./../responses");
const { getUserStatus } = require('../helper/user');

var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});




module.exports = {
    createPaymentId: async (req, res) => {
        try {
            const status = await getUserStatus(req.user.id)
            if (!status) {
                return response.error(res, { message: "Your account blocked by Admin. Please contact with our support team, Thanks." });
            }
            const paylod = req.body
            console.log(paylod)
            const data = await instance.orders.create({
                "amount": Number(paylod.amount),
                "currency": paylod.currency,
            })
            console.log(data)
            return response.ok(res, data);
        }
        catch (err) {
            return response.error(res, err);
        }
    }
}
