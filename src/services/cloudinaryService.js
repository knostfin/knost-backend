const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file to Cloudinary
 * @param {Object} fileBuffer - File buffer from multer
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Public ID for the file
 * @returns {Promise<Object>} - Upload result with secure_url and public_id
 */
async function uploadToCloudinary(fileBuffer, folder, publicId) {
    try {
        // Create a temporary file from buffer
        const tempPath = path.join(__dirname, `../../temp_${Date.now()}_${publicId}`);
        fs.writeFileSync(tempPath, fileBuffer);

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(tempPath, {
            folder: folder,
            public_id: publicId,
            resource_type: 'auto',
            overwrite: true,
            quality: 'auto',
            fetch_format: 'auto'
        });

        // Delete temporary file
        fs.unlinkSync(tempPath);

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes,
            mimeType: result.format,
            uploadedAt: new Date(result.created_at)
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteFromCloudinary(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return {
            success: result.result === 'ok',
            message: result.result
        };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized image URL
 */
function getOptimizedUrl(publicId, options = {}) {
    const defaultOptions = {
        fetch_format: 'auto',
        quality: 'auto',
        width: options.width || 300,
        height: options.height || 300,
        crop: options.crop || 'fill',
        gravity: options.gravity || 'face'
    };

    return cloudinary.url(publicId, defaultOptions);
}

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getOptimizedUrl,
    cloudinary
};
