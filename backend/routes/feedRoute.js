const express = require("express");
const {
  createFeed,
  updateFeed,
  getFeed,
  getAllFeeds,
  deleteFeed,
  liketheFeed,
  disliketheFeed,
  uploadImages,
} = require("../controller/FeedCtrl");
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const { blogImgResize, uploadPhoto } = require("../middlewares/uploadImage");
const router = express.Router();

router.post("/", authMiddleware, isAdmin, createFeed);
router.put(
  "/upload/:id",
  authMiddleware,
  isAdmin,
  uploadPhoto.array("images", 2),
  blogImgResize,
  uploadImages
);
router.put("/likes", authMiddleware, liketheFeed);
router.put("/dislikes", authMiddleware, disliketheFeed);

router.put("/:id", authMiddleware, isAdmin, updateFeed);

router.get("/:id", getFeed);
router.get("/", getAllFeeds);

router.delete("/:id", authMiddleware, isAdmin, deleteFeed);

module.exports = router;
