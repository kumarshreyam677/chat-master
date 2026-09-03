// Cloudinary storage config. Falls back to in-memory storage if keys aren't configured.
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

const isConfigured = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

let upload;
let uploadBufferToCloudinary;

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "wispr_listings",
      allowed_formats: ["jpeg", "jpg", "png", "webp"],
      transformation: [{ width: 1400, height: 900, crop: "limit" }],
    },
  });
  upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
  uploadBufferToCloudinary = async (buffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "wispr_chat" },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(buffer);
    });
  };
} else {
  // Fallback: memory storage. Files are returned as data URIs (limited size).
  const storage = multer.memoryStorage();
  upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });
  uploadBufferToCloudinary = async () => {
    throw new Error("Cloudinary not configured");
  };
}

// Adapter: normalize req.files -> [{ url, publicId }]
function filesToImages(files = []) {
  return files.map((f) => {
    if (isConfigured) {
      return { url: f.path, publicId: f.filename };
    }
    // Local mock: turn buffer into data URI (only used if Cloudinary not configured)
    const base64 = f.buffer.toString("base64");
    return {
      url: `data:${f.mimetype};base64,${base64}`,
      publicId: `mock_${uuidv4()}`,
    };
  });
}

module.exports = { upload, cloudinary, isConfigured, uploadBufferToCloudinary, filesToImages };
