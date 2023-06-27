const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongodbId");
const cloudinaryUploadImg = require("../utils/cloudinary");
const fs = require("fs");
const Feedback = require("../models/feedModel");
const createFeed = asyncHandler(async (req, res) => {
  try {
    const newFeed = await Feedback.create(req.body);
    res.json(newFeed);
  } catch (error) {
    throw new Error(error);
  }
});

const updateFeed = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updateFeed = await Blog.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updateFeed);
  } catch (error) {
    throw new Error(error);
  }
});

const getFeed = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const getFeed = await Feedback.findById(id)
      .populate("likes")
      .populate("dislikes");
    const updateViews = await Blog.findByIdAndUpdate(
      id,
      {
        $inc: { numViews: 1 },
      },
      { new: true }
    );
    res.json(getFeed);
  } catch (error) {
    throw new Error(error);
  }
});
const getAllFeeds = asyncHandler(async (req, res) => {
  try {
    const getFeeds = await Feedback.find();
    res.json(getFeeds);
  } catch (error) {
    throw new Error(error);
  }
});

const deleteFeed = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deletedFeed = await Blog.findByIdAndDelete(id);
    res.json(deletedFeed);
  } catch (error) {
    throw new Error(error);
  }
});

const liketheFeed = asyncHandler(async (req, res) => {
  const { FeedId } = req.body;
  validateMongoDbId(blogId);
  
  const feed = await Feedback.findById(FeedId);
  // find the login user
  const loginUserId = req?.user?._id;
  // find if the user has liked the blog
  const isLiked = feed?.isLiked;
  // find if the user has disliked the blog
  const alreadyDisliked = feed?.dislikes?.find(
    (userId) => userId?.toString() === loginUserId?.toString()
  );
  if (alreadyDisliked) {
    const feed = await Feedback.findByIdAndUpdate(
      FeedId,
      {
        $pull: { dislikes: loginUserId },
        isDisliked: false,
      },
      { new: true }
    );
    res.json(blog);
  }
  if (isLiked) {
    const feed = await Feedback.findByIdAndUpdate(
      FeedId,
      {
        $pull: { likes: loginUserId },
        isLiked: false,
      },
      { new: true }
    );
    res.json(blog);
  } else {
    const feed = await Feedback.findByIdAndUpdate(
      FeedId,
      {
        $push: { likes: loginUserId },
        isLiked: true,
      },
      { new: true }
    );
    res.json(feed);
  }
});
const disliketheFeed = asyncHandler(async (req, res) => {
  const { feedId } = req.body;
  validateMongoDbId(feedId);
  // Find the blog which you want to be liked
  const feed = await Feedback.findById(feedId);
  // find the login user
  const loginUserId = req?.user?._id;
  // find if the user has liked the blog
  const isDisLiked = feed?.isDisliked;
  // find if the user has disliked the blog
  const alreadyLiked = feed?.likes?.find(
    (userId) => userId?.toString() === loginUserId?.toString()
  );
  if (alreadyLiked) {
    const feed = await Feedback.findByIdAndUpdate(
      feedIdId,
      {
        $pull: { likes: loginUserId },
        isLiked: false,
      },
      { new: true }
    );
    res.json(feed);
  }
  if (isDisLiked) {
    const feed = await Feedback.findByIdAndUpdate(
      feedId,
      {
        $pull: { dislikes: loginUserId },
        isDisliked: false,
      },
      { new: true }
    );
    res.json(feed);
  } else {
    const feed = await Feedback.findByIdAndUpdate(
      feedIdId,
      {
        $push: { dislikes: loginUserId },
        isDisliked: true,
      },
      { new: true }
    );
    res.json(feed);
  }
});

const uploadImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const uploader = (path) => cloudinaryUploadImg(path, "images");
    const urls = [];
    const files = req.files;
    for (const file of files) {
      const { path } = file;
      const newpath = await uploader(path);
      console.log(newpath);
      urls.push(newpath);
      fs.unlinkSync(path);
    }
    const findFeed = await Feedback.findByIdAndUpdate(
      id,
      {
        images: urls.map((file) => {
          return file;
        }),
      },
      {
        new: true,
      }
    );
    res.json(findBlog);
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createFeed,
  updateFeed,
  getFeed,
  getAllFeeds,
  deleteFeed,
  liketheFeed,
  disliketheFeed,
  uploadImages,
};
