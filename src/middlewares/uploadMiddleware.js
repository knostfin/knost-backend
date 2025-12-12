const multer = require('multer');
const path = require('path');

// Use memory storage since we're uploading to Cloudinary
const storage = multer.memoryStorage();

// Define allowed file types and their MIME types
const ALLOWED_MIMES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
};

// Define upload constraints
const UPLOAD_CONSTRAINTS = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    minFileSize: 10 * 1024, // 10KB minimum
    maxDimensions: {
        width: 5000,
        height: 5000
    }
};

/**
 * File filter for multer
 * Validates file type and provides helpful error messages
 */
const fileFilter = (req, file, cb) => {
    // Check if MIME type is allowed
    if (!ALLOWED_MIMES[file.mimetype]) {
        const allowedTypes = Object.keys(ALLOWED_MIMES).join(', ');
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes}`), false);
        return;
    }

    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ALLOWED_MIMES[file.mimetype];
    if (!allowedExts.includes(ext)) {
        cb(new Error(`File extension ${ext} not allowed for ${file.mimetype}`), false);
        return;
    }

    // File is valid
    cb(null, true);
};

/**
 * Multer upload middleware
 * Handles file validation and memory storage for Cloudinary upload
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: UPLOAD_CONSTRAINTS.maxFileSize
    },
    fileFilter: fileFilter,
    onError: (err, next) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                const maxSizeMB = UPLOAD_CONSTRAINTS.maxFileSize / (1024 * 1024);
                return next(new Error(`File size exceeds ${maxSizeMB}MB limit`));
            }
        }
        next(err);
    }
});

module.exports = {
    upload,
    UPLOAD_CONSTRAINTS,
    ALLOWED_MIMES
};
