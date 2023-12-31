const Product = require("../models/productModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const validateMongoDbId = require("../utils/validateMongodbId");

const createProduct = asyncHandler(async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const newProduct = await Product.create(req.body);
    res.json(newProduct);
  } catch (error) {
    throw new Error(error);
  }
});

// const updateProduct = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   validateMongoDbId(id);
//   try {
//     if (req.body.title) {
//       req.body.slug = slugify(req.body.title);
//     }
//     const updateProduct = await Product.findOneAndUpdate({ _id:id }, req.body, {
//       new: true,
//     });
//     res.json(updateProduct);
//   } catch (error) {
//     throw new Error(error);
//   }
// });

const updateProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;
  validateMongoDbId(id);
  try {
    if (req.body.title) {
      const newSlug = slugify(req.body.title);
      const existingProduct = await Product.findOne({ slug: newSlug });
    
      if (existingProduct && existingProduct._id.toString() !== id) {
        // If the new slug exists and belongs to a different product
        const uniqueSlug = generateUniqueSlug(newSlug); // Implement a function to make the slug unique
        req.body.slug = uniqueSlug;
      } else {
        req.body.slug = newSlug;
      }
    }
    
    const updateProduct = await Product.findOneAndUpdate({ _id:id }, req.body, {
      new: true,
    });
    res.json(updateProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const id = req.params;
 const _id = id.id
  try {
    console.log(_id);
    const deleteProduct = await Product.findByIdAndDelete(_id);
    console.log(deleteProduct);
    res.json(deleteProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const getaProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const findProduct = await Product.findById(id);
    res.json(findProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const getAllProduct = asyncHandler(async (req, res) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // Sorting

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // limiting the fields

    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // pagination

    const page = req.query.page;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
    if (req.query.page) {
      const productCount = await Product.countDocuments();
      if (skip >= productCount) throw new Error("This Page does not exists");
    }
    const product = await query;
    res.json(product);
  } catch (error) {
    throw new Error(error);
  }
});
const addToWishlist = asyncHandler(async (req, res) => {
  console.log(req.user);
  const { _id } = req.user;
  
  const { prodId } = req.body;
  try {
    const user = await User.findById(_id);
    const alreadyadded = user.wishlist.find((id) => id.toString() === prodId);
    if (alreadyadded) {
      let user = await User.findByIdAndUpdate(
        _id,
        {
          $pull: { wishlist: prodId },
        },
        {
          new: true,
        }
      );
      res.json(user);
    } else {
      let user = await User.findByIdAndUpdate(
        _id,
        {
          $push: { wishlist: prodId },
        },
        {
          new: true,
        }
      );
      res.json(user);
    }
  } catch (error) {
    throw new Error(error);
  }
});

const rating = asyncHandler(async (req, res) => {
  const { _id,firstname } = req.user;
  const { star, prodId, comment } = req.body;
  try {
    const product = await Product.findById(prodId);
    let alreadyRated = product.ratings.find(
      (userId) => userId.postedby.toString() === _id.toString()
    );
    if (alreadyRated) {
      const updateRating = await Product.updateOne(
        {
          ratings: { $elemMatch: alreadyRated },
        },
        {
          $set: { "ratings.$.star": star, "ratings.$.comment": comment },
        },
        {
          new: true,
        }
      );
    } else {
      const rateProduct = await Product.findByIdAndUpdate(
        prodId,
        {
          $push: {
            ratings: {
              star: star,
              comment: comment,
              user:firstname,
              postedby:_id,
            },
          },
        },
        {
          new: true,
        }
      );
    }
    const getallratings = await Product.findById(prodId);
    let totalRating = getallratings.ratings.length;
    let ratingsum = getallratings.ratings
      .map((item) => item.star)
      .reduce((prev, curr) => prev + curr, 0);
    let actualRating = Math.round(ratingsum / totalRating);
    let finalproduct = await Product.findByIdAndUpdate(
      prodId,
      {
        totalrating: actualRating,
      },
      { new: true }
    );
    res.json(finalproduct);
  } catch (error) {
    throw new Error(error);
  }
});

const updateProductDiscount = async (req, res) => {
  try {
    const { productIds, discount } = req.body;
    console.log(req.body)

    // Validate the inputs (e.g., check if productIds is an array, and if discount is valid)
    if (!Array.isArray(productIds) || productIds.length === 0 || !discount || discount < 1 || discount > 100) {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    const updatedProducts = await Promise.all(productIds.map(async (productId) => {
      console.log(productId)
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { discount: discount },
        { new: true }
      );
      return updatedProduct;
    }));

    const notFoundProducts = updatedProducts.filter((product) => !product);
    if (notFoundProducts.length > 0) {
      return res.status(404).json({ message: 'Some products not found' });
    }

    return res.status(200).json({ message: 'Discount updated successfully for all products' });
  } catch (error) {
    console.error('Error updating product discounts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const deleteDiscount = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    const updatedProducts = await Product.updateMany(
      { _id: { $in: productIds } },
      { $unset: { discount: 1 } }
    );

    if (updatedProducts.nModified === 0) {
      return res.status(404).json({ message: 'No products found for the given IDs' });
    }

    return res.status(200).json({ message: 'Discount removed successfully for selected products' });
  } catch (error) {
    console.error('Error deleting product discounts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createProduct,
  getaProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  updateProductDiscount,
  deleteDiscount
};
