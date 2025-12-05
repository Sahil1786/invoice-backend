const cloudinary = require("./cloudinary");

const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: folderName },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    ).end(fileBuffer);
  });
};

module.exports = uploadToCloudinary;
