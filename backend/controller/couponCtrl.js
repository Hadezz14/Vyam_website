// const Coupon = require("../models/couponModel");
// const validateMongoDbId = require("../utils/validateMongodbId");
// const asynHandler = require("express-async-handler");

// const createCoupon = asynHandler(async (req, res) => {
//   try {
//     const newCoupon = await Coupon.create(req.body);
//     res.json(newCoupon);
//   } catch (error) {
//     throw new Error(error);
//   }
// });
// const getAllCoupons = asynHandler(async (req, res) => {
//   try {
//     const coupons = await Coupon.find();
//     res.json(coupons);
//   } catch (error) {
//     throw new Error(error);
//   }
// });
// const updateCoupon = asynHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);
//   try {
//     const updatecoupon = await Coupon.findByIdAndUpdate(id, req.body, {
//       new: true,
//     });
//     res.json(updatecoupon);
//   } catch (error) {
//     throw new Error(error);
//   }
// });
// const deleteCoupon = asynHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);
//   try {
//     const deletecoupon = await Coupon.findByIdAndDelete(id);
//     res.json(deletecoupon);
//   } catch (error) {
//     throw new Error(error);
//   }
// });
// const getCoupon = asynHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);
//   try {
//     const getAcoupon = await Coupon.findById(id);
//     res.json(getAcoupon);
//   } catch (error) {
//     throw new Error(error);
//   }
// });

// const checkExpiry = async (req, res) => {
//   try {
//     const coupons = await Coupon.find();

//     const currentDate = new Date();

//     // Filter and delete expired coupons
//     const expiredCoupons = coupons.filter((coupon) => {
//       return coupon.expiry <= currentDate;
//     });

//     // Delete expired coupons from the database
//     for (const coupon of expiredCoupons) {
//       await Coupon.findByIdAndDelete(coupon._id);
//     }

//     // Response indicating success
//     res.status(200).json({ message: 'Expired coupons deleted successfully' });
//   } catch (error) {
//     // Handle any errors
//     console.error('Error deleting expired coupons:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// module.exports = {
//   createCoupon,
//   getAllCoupons,
//   updateCoupon,
//   deleteCoupon,
//   getCoupon,
//   checkExpiry
// };
