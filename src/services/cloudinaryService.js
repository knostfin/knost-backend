const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('WARNING: Cloudinary credentials not configured. Image uploads will fail.');
    console.warn('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
}

// Test Cloudinary credentials on startup
async function testCloudinaryConnection() {
    try {
        const result = await cloudinary.api.ping();
        return true;
    } catch (error) {
        console.error('Cloudinary connection test FAILED:', error.message);
        console.error('Your Cloudinary credentials appear to be invalid!');
        console.error('Please verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
        return false;
    }
}

// Run connection test
testCloudinaryConnection();

/**
 * Upload a file to Cloudinary
 * @param {Object} fileBuffer - File buffer from multer
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Public ID for the file
 * @returns {Promise<Object>} - Upload result with secure_url and public_id
 */
async function uploadToCloudinary(fileBuffer, folder, publicId) {
    let tempPath = null;
    try {
        // Validate Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
            throw new Error('Cloudinary credentials not configured in environment variables');
        }

        // Create a temporary file from buffer
        tempPath = path.join(__dirname, `../../temp_${Date.now()}_${publicId}`);
        fs.writeFileSync(tempPath, fileBuffer);

        console.log(`🔄 Uploading to Cloudinary: ${folder}/${publicId}`);
        console.log(`📝 Temp file created at: ${tempPath}`);

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(tempPath, {
            folder: folder,
            public_id: publicId,
            resource_type: 'auto',
            overwrite: true,
            invalidate: true,  // Clear CDN cache when overwriting
            quality: 'auto',
            fetch_format: 'auto'
        });

        console.log(`✅ Upload successful to Cloudinary:`, {
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes,
            format: result.format
        });

        // Validate upload result
        if (!result.secure_url) {
            throw new Error('Cloudinary upload succeeded but no secure_url returned');
        }

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes,
            mimeType: result.format,
            uploadedAt: new Date(result.created_at)
        };
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error.message);
        console.error('Stack:', error.stack);
        throw new Error(`Failed to upload file: ${error.message}`);
    } finally {
        // Clean up temp file in finally block to ensure it always runs
        if (tempPath && fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.warn(`⚠️ Failed to clean up temp file ${tempPath}:`, cleanupError.message);
            }
        }
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
