const fs = require("fs");
const asyncHandler = require("express-async-handler");

const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("../utils/cloudinary");

const cache = {};

// Function to check if an image URL is cached
const checkCacheForImage = (key) => {
  return cache[key];
};

// Function to cache an image URL
const cacheImage = (key, value) => {
  cache[key] = value;
};

// const uploadImages = asyncHandler(async (req, res) => {
//   try {
//     const uploader = (path) => cloudinaryUploadImg(path, "images");
//     const urls = [];
//     const files = req.files;
//     for (const file of files) {
//       const { path } = file;
//       const newpath = await uploader(path);
//       console.log(newpath);
//       urls.push(newpath);
//       fs.unlinkSync(path);
//     }
//     const images = urls.map((file) => {
//       return file;
//     });
//     res.json(images);
//   } catch (error) {
//     throw new Error(error);
//   }
// });

const uploadImages = asyncHandler(async(req,res) =>{
  try {
    const uploader = (path) => cloudinaryUploadImg(path, "images");
    const urls =[];
    const files = req.files;

    for(const file of files){
      const {originalname,path} = file;
      const cachedImageUrl = await checkCacheForImage(originalname);

      if(cachedImageUrl){
        urls.push(cachedImageUrl);

      }
      else{
        const newpath = await uploader(path);
        console.log(newpath);
        urls.push(newpath);
       
        cacheImage(originalname, newpath);
      }

      fs.unlinkSync(path);
      }
      const images = urls.map((file) => {
        return file;
      });
      
      res.json(images);
  } catch (error) {
    throw new Error(error);
  }
})


const deleteImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = cloudinaryDeleteImg(id, "images");
    res.json({ message: "Deleted" });
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  uploadImages,
  deleteImages,
};
