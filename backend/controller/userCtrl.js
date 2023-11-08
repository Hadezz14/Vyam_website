const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const Order = require("../models/orderModel");
const uniqid = require("uniqid");

const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtToken");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshtoken");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendEmail = require("./emailCtrl");
const couponModel = require("../models/couponModel");

// Create a User ----------------------------------------------

const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });
  if (!findUser) {
    const newUser = await User.create(req.body);
    res.json(newUser);
  } else {
    throw new Error("User Already Exists");
  }
});

// Login a user
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateuser = await User.findByIdAndUpdate(
      findUser.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findUser?._id,
      firstname: findUser?.firstname,
      lastname: findUser?.lastname,
      email: findUser?.email,
      mobile: findUser?.mobile,
      token: generateToken(findUser?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// optgeneration
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};

// admin login

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findAdmin = await User.findOne({ email });
  if (!findAdmin) {
    return res.status(401).json({ status: "fail", message: "User not found" });
  }
  if (findAdmin.role !== "admin") {
    return res.status(403).json({ status: "fail", message: "Not Authorized" });
  }
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    // Generate OTP
    console.log("Password Check");
    const otp = generateOTP();

    findAdmin.otp = otp;
    console.log(otp);
    await findAdmin.save();

    await sendEmail.sendOTPByEmail(findAdmin.email, otp);

    // const refreshToken = await generateRefreshToken(findAdmin?._id);
    // const updateuser = await User.findByIdAndUpdate(
    //   findAdmin.id,
    //   {
    //     refreshToken: refreshToken,
    //   },
    //   { new: true }
    // );
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   maxAge: 72 * 60 * 60 * 1000,
    // });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      mobile: findAdmin?.mobile,
      // token: generateToken(findAdmin?._id),
    });
  } else {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid Credentials" });
  }
});

const verifyotp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  // check if user exists or not
  const findAdmin = await User.findOne({ email });

  if (!findAdmin) {
    return res.status(401).json({ status: "fail", message: "User not found" });
  }

  if (findAdmin.role !== "admin") {
    return res.status(403).json({ status: "fail", message: "Not Authorized" });
  }

  if (!findAdmin.otp) {
    // Generate OTP if OTP doesn't exist in the database
    const newOTP = generateOTP();
    findAdmin.otp = newOTP;
    await findAdmin.save();
    await sendEmail.sendOTPByEmail(findAdmin.email, newOTP);

    return res
      .status(200)
      .json({ status: "success", message: "OTP sent to your email" });
  }

  if (findAdmin.otp !== otp) {
    return res.status(401).json({ status: "fail", message: "Invalid OTP" });
  }

  // OTP is valid, mark it as verified
  findAdmin.isOTPVerified = true;
  findAdmin.otp = null; // Clear the stored OTP
  await findAdmin.save();

  // Continue with generating tokens and allowing login here

  const refreshToken = await generateRefreshToken(findAdmin?._id);
  const updateuser = await User.findByIdAndUpdate(
    findAdmin.id,
    {
      refreshToken: refreshToken,
    },
    { new: true }
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000,
  });

  res.json({
    _id: findAdmin?._id,
    firstname: findAdmin?.firstname,
    lastname: findAdmin?.lastname,
    email: findAdmin?.email,
    mobile: findAdmin?.mobile,
    token: generateToken(findAdmin?._id),
  });
});

// handle refresh token

const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error(" No Refresh token present in db or not matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with refresh token");
    }
    const accessToken = generateToken(user?._id);
    res.json({ accessToken });
  });
});

// logout functionality

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204); // forbidden
  }
  await User.findOneAndUpdate(refreshToken, {
    refreshToken: "",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.sendStatus(204);
});

// Update a user

const updatedUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
        mobile: req?.body?.mobile,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// save user Address

const saveAddress = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        address: req?.body?.address,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// Get all users

const getallUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find({ role: { $ne: "admin" } }).populate(
      "wishlist"
    );
    res.json(getUsers);
  } catch (error) {
    throw new Error(error);
  }
});

// Get a single user

const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const getaUser = await User.findById(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// Get a single user

const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const blockusr = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );
    res.json(blockusr);
  } catch (error) {
    throw new Error(error);
  }
});

const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const unblock = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );
    res.json(
      {
        message: "User UnBlocked",
      },
      unblock
    );
  } catch (error) {
    throw new Error(error);
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { password } = req.body;
  validateMongoDbId(_id);
  const user = await User.findById(_id);
  if (password) {
    user.password = password;
    const updatedPassword = await user.save();
    res.json(updatedPassword);
  } else {
    res.json(user);
  }
});

const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found with this email");
  try {
    const token = await user.createPasswordResetToken();
    await user.save();
    const resetURL = `Hi, Please follow this link to reset Your Password. This link is valid till 10 minutes from now. <a href='http://localhost:5000/api/user/reset-password/${token}'>Click Here</>`;
    const data = {
      to: email,
      text: "Hey User",
      subject: "Forgot Password Link",
      htm: resetURL,
    };
    sendEmail(data);
    res.json(token);
  } catch (error) {
    throw new Error(error);
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error(" Token Expired, Please try again later");
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json(user);
});

const getWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const findUser = await User.findById(_id).populate("wishlist");
    res.json(findUser);
  } catch (error) {
    throw new Error(error);
  }
});

const userCart = asyncHandler(async (req, res) => {
  const { productId, colour, quantity, price, size } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const newCart = await new Cart({
      userId: _id,
      productId,
      colour,
      price,
      quantity,
      size,
    }).save();
    res.json(newCart);
  } catch (error) {
    throw new Error(error);
  }
});

const getUserCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const cart = await Cart.find({ userId: _id })
      .populate("productId")
      .populate("color");
    res.json(cart);
  } catch (error) {
    throw new Error(error);
  }
});

const reomveProductFromCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { cartItemId } = req.params;
  validateMongoDbId(_id);
  try {
    const deleteProductFromCart = await Cart.deleteOne({
      userId: _id,
      _id: cartItemId,
    });
    res.json(deleteProductFromCart);
  } catch (error) {
    throw new Error(error);
  }
});

const updateProductQuantityFromCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { cartItemId, newQuantity } = req.params;
  validateMongoDbId(_id);
  try {
    const cartItem = await Cart.findOne({ userId: _id, _id: cartItemId });
    cartItem.quantity = newQuantity;
    cartItem.save();
    res.json(cartItem);
  } catch (error) {
    throw new Error(error);
  }
});

const emptyCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const user = await User.findOne({ _id });
    const cart = await Cart.findOneAndRemove({ userId: _id });
    res.json(cart);
  } catch (error) {
    throw new Error(error);
  }
});

const applyCoupon = asyncHandler(async (req, res) => {
  const { promoCode, userId } = req.body;

  try {
    // Find the promo code document
    const promoCodeDoc = await Coupon.findOne({ name: promoCode });

    if (!promoCodeDoc) {
      return res.status(404).json({ error: "Promo code not found." });
    }

    // Check if the user has already used the code
    if (promoCodeDoc.usedBy.includes(userId)) {
      return res
        .status(400)
        .json({ error: "Promo code already used by this user." });
    }

    const discount = promoCodeDoc.discount;

    // Insert the user's ID into the "usedBy" array
    promoCodeDoc.usedBy.push(userId);
    await promoCodeDoc.save();

    res
      .status(200)
      .json({ message: "Promo code applied successfully.", discount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

const createOrder = asyncHandler(async (req, res) => {
  const {
    shippingInfo,
    orderedItems,
    totalPrice,
    totalPriceAfterDiscount,
    profit,
  } = req.body;
  const { _id } = req.user;
  try {
    const order = await Order.create({
      shippingInfo,
      orderedItems,
      totalPrice,
      totalPriceAfterDiscount,
      profit,
      user: _id,
    });
    res.json({
      order,
      success: true,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getOrders = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const userorders = await Order.findOne({ orderby: _id })
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const orders = await Order.find({ user: _id })
      .populate("user")
      .populate("orderedItems.product")
      .populate("orderedItems.color");
    res.json({
      orders,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const alluserorders = await Order.find()
      .populate("user")
      .populate("orderedItems.product")
      .populate("orderedItems.color")
      .exec();

    res.json(alluserorders);
  } catch (error) {
    throw new Error(error);
  }
});

const getOrderByUserId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const userorders = await Order.findOne({ orderby: id })
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  console.log(status);
  validateMongoDbId(id);
  try {
    const updateOrderStatus = await Order.findByIdAndUpdate(
      id,
      {
        OrderStatus: status,
      },
      { new: true }
    );
    res.json(updateOrderStatus);
  } catch (error) {
    throw new Error(error);
  }
});

const googleSignIn = async (req, res) => {
  const { email, firstname, mobile } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        firstname,
        lastname: "",
        mobile: mobile || "",
        role: "user",
        isBlocked: false,
        cart: [],
        address: "",
        wishlist: [],
      });
      await user.save();
    }
    const token = generateToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 100,
    });
    res.json({
      _id: user?._id,
      firstname: user?.firstname,
      lastname: user?.lastname,
      email: user?.email,
      mobile: user?.mobile,
      token: token,
    });
  } catch (error) {
    console.error("Error during Google Sign-in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createUser,
  loginUserCtrl,
  getallUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  emptyCart,
  createOrder,
  getOrders,
  updateOrderStatus,
  getAllOrders,
  getOrderByUserId,
  reomveProductFromCart,
  updateProductQuantityFromCart,
  getMyOrders,
  googleSignIn,
  applyCoupon,
  verifyotp,
};
