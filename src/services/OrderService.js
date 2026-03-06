const Order = require("../models/OrderProduct")
const Product = require("../models/ProductModel")
const EmailService = require("../services/EmailService")

const createOrder = (newOrder) => {
    return new Promise(async (resolve, reject) => {
        const { orderItems, paymentMethod, itemsPrice, shippingPrice, totalPrice, fullName, address, city, phone, user, isPaid, paidAt, email } = newOrder
        try {
            const promises = orderItems.map(async (order) => {
                const productData = await Product.findOneAndUpdate(
                    { _id: order.product, countInStock: { $gte: order.amount } },
                    { $inc: { countInStock: -order.amount, selled: +order.amount } },
                    { new: true }
                )
                if (productData) {
                    return { status: 'OK', message: 'SUCCESS' }
                } else {
                    return { status: 'ERR', message: 'ERR', id: order.product }
                }
            })
            const results = await Promise.all(promises)
            const newData = results.filter((item) => item.id)
            if (newData.length) {
                const arrId = newData.map((item) => item.id)
                resolve({ status: 'ERR', message: `San pham voi id: ${arrId.join(',')} khong du hang` })
            } else {
                const createdOrder = await Order.create({
                    orderItems,
                    shippingAddress: { fullName, address, city, phone },
                    paymentMethod,
                    itemsPrice,
                    shippingPrice,
                    totalPrice,
                    user,
                    isPaid,
                    paidAt
                })
                if (createdOrder) {
                    // FIX: không dùng await — lỗi email không block kết quả đặt hàng
                    EmailService.sendEmailCreateOrder(email, orderItems).catch((err) => {
                        console.log('Send email failed (non-critical):', err.message)
                    })
                    resolve({ status: 'OK', message: 'success' })
                }
            }
        } catch (e) {
            reject(e)
        }
    })
}

const getAllOrderDetails = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const order = await Order.find({ user: id }).sort({ createdAt: -1, updatedAt: -1 })
            if (!order) {
                resolve({ status: 'ERR', message: 'The order is not defined' })
                return
            }
            resolve({ status: 'OK', message: 'SUCCESS', data: order })
        } catch (e) {
            reject(e)
        }
    })
}

const getOrderDetails = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const order = await Order.findById(id)
            if (!order) {
                resolve({ status: 'ERR', message: 'The order is not defined' })
                return
            }
            resolve({ status: 'OK', message: 'SUCCESS', data: order })
        } catch (e) {
            reject(e)
        }
    })
}

const cancelOrderDetails = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const promises = data.map(async (item) => {
                const productData = await Product.findOneAndUpdate(
                    { _id: item.product, selled: { $gte: item.amount } },
                    { $inc: { countInStock: +item.amount, selled: -item.amount } },
                    { new: true }
                )
                if (!productData) {
                    return { status: 'ERR', id: item.product }
                }
                return { status: 'OK' }
            })

            const results = await Promise.all(promises)
            const failed = results.find((r) => r.id)
            if (failed) {
                resolve({ status: 'ERR', message: `San pham voi id: ${failed.id} khong ton tai` })
                return
            }

            const deletedOrder = await Order.findByIdAndDelete(id)
            if (!deletedOrder) {
                resolve({ status: 'ERR', message: 'The order is not defined' })
                return
            }

            resolve({ status: 'OK', message: 'Cancel order success' })
        } catch (e) {
            reject(e)
        }
    })
}

const getAllOrder = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const allOrder = await Order.find().sort({ createdAt: -1, updatedAt: -1 })
            resolve({ status: 'OK', message: 'Success', data: allOrder })
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = {
    createOrder,
    getAllOrderDetails,
    getOrderDetails,
    cancelOrderDetails,
    getAllOrder
}