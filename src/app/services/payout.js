
const { default: axios } = require("axios");
const mongoose = require("mongoose");

const authHeader = {
    auth: {
        username: process.env.RAZORPAY_KEY,
        password: process.env.RAZORPAY_SECRET
    }
};
module.exports = {
    tranferToAccount: async (account, amount, plan, id) => {
        let reqData = {
            "account_number": process.env.RAZORPAY_ACCOUNT,
            "fund_account_id": account,
            "amount": Number(amount.toFixed(2)) * 100,
            "currency": "INR",
            "mode": "NEFT",
            "purpose": "cashback",
            "queue_if_low_balance": true,
            "notes": {
                "plan": plan,
                "plan_id": id,
            }
        }

        return axios.post('https://api.razorpay.com/v1/payouts', reqData, authHeader)
            .then(async response => {
                console.log('Response:', response.data);
                const data = {
                    status: true,
                    data: response.data
                }
                return data
            })
            .catch(error => {
                const data = {
                    status: false,
                    data: error
                }
                return data

                console.error('Error:', error.message);
            });


    },


    addAccount: async (user, payload) => {

        if (user.razorpay_contact_id) {
            let reqData = {
                contact_id: user.razorpay_contact_id,
                account_type: "bank_account",
                bank_account: {
                    name: user.fullName,
                    ifsc: payload.bank_details.ifsc_code,
                    account_number: payload.bank_details.account_no,
                }
            }

            return axios.post('https://api.razorpay.com/v1/fund_accounts', reqData, authHeader)
                .then(async response => {
                    console.log('Response:', response.data);
                    const data = {
                        status: true,
                        data: response.data
                    }
                    return data

                })
                .catch(error => {
                    const data = {
                        status: false,
                        data: error
                    }
                    return data
                });
        } else {
            let reqData = {
                name: user.fullName,
                email: user.email.toLowerCase(),
                contact: user.phone,
                type: 'customer',
            }

            return axios.post('https://api.razorpay.com/v1/contacts', reqData, authHeader)
                .then(async response => {
                    console.log('Response:', response.data);
                    user.razorpay_contact_id = response.data.id

                    let reqData2 = {
                        contact_id: user.razorpay_contact_id,
                        account_type: "bank_account",
                        bank_account: {
                            name: user.fullName,
                            ifsc: payload.bank_details.ifsc_code,
                            account_number: payload.bank_details.account_no,
                        }
                    }

                    return axios.post('https://api.razorpay.com/v1/fund_accounts', reqData2, authHeader)
                        .then(async res => {
                            console.log('Response:', res.data);
                            const data = {
                                status: true,
                                data: res.data,
                                storeContactid: true
                            }
                            return data

                        })
                        .catch(error => {
                            const data = {
                                status: false,
                                data: error
                            }
                            return data
                        });
                })
                .catch(error => {
                    console.error('Error:', error.message);
                });
        }

    },
};
