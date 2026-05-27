const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Automatically create 'uploads' directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Allowed file types
const fileTypes = /jpeg|jpg|png|webp/;

// Filter to validate file types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (fileTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'), false);
  }
};

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s/g, '')}`;
    cb(null, uniqueName);
  }
});

// Limits (5MB max)
const limits = {
  fileSize: 5 * 1024 * 1024 // 5 MB
};

// Export configured multer instance
const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = upload;
