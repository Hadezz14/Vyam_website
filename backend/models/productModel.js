const mongoose = require("mongoose"); 

// Declare the Schema of the Mongo model
var productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    profit: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    size: [
      {
        size: String,
        quantity: Number,
      },
    ],    
    discount: {
      type: Number,
      max: 100,
      min:1,
    },
    sold: {
      type: Number,
      default: 0,
    },
    color: [
      {
        type: String,
        required: true,
      },
    ],    
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    tags: String,
    ratings: [
      {
        star: Number,
        comment: String,
        postedby: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    totalrating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

//Export the model
module.exports = mongoose.model("Product", productSchema);
