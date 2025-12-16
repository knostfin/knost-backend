/**
 * Phone number validation and formatting utilities
 */

/**
 * Validates phone number format and length
 * Phone must be in format: +{countrycode}{number}
 * Number part must be 10 digits (after country code)
 * @param {string} phone - Phone number to validate
 * @returns {Object} - { valid: boolean, error: string|null, formatted: string|null }
 */
function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
        return { valid: false, error: 'Phone number is required' };
    }

    // Remove any spaces
    const cleanedPhone = phone.trim();

    // Must start with +
    if (!cleanedPhone.startsWith('+')) {
        return { 
            valid: false, 
            error: 'Phone number must start with + (country code required)' 
        };
    }

    // Extract country code and number
    // Country code can be 1-3 digits, number must be exactly 10 digits
    const phoneRegex = /^\+(\d{1,3})(\d{10})$/;
    const match = cleanedPhone.match(phoneRegex);

    if (!match) {
        return { 
            valid: false, 
            error: 'Invalid phone format. Expected format: +{countrycode}{10digits} (e.g., +919876543210)' 
        };
    }

    const countryCode = match[1];
    const number = match[2];

    // Validate that we have a valid country code (1-3 digits, shouldn't start with 0)
    if (countryCode.startsWith('0')) {
        return { 
            valid: false, 
            error: 'Country code cannot start with 0' 
        };
    }

    return {
        valid: true,
        error: null,
        formatted: cleanedPhone,
        countryCode: countryCode,
        number: number
    };
}

/**
 * Formats phone input from separate country code and number
 * @param {string} countryCode - Country code without + (e.g., "91")
 * @param {string} number - Phone number (must be 10 digits)
 * @returns {Object} - { valid: boolean, error: string|null, formatted: string|null }
 */
function formatPhoneFromParts(countryCode, number) {
    if (!countryCode || !number) {
        return { valid: false, error: 'Country code and phone number are required' };
    }

    // Remove any spaces and + from inputs
    const cleanCode = countryCode.trim().replace(/^\+/, '');
    const cleanNumber = number.trim().replace(/\D/g, ''); // Keep only digits

    // Validate country code (1-3 digits, no leading 0)
    if (!/^\d{1,3}$/.test(cleanCode)) {
        return { 
            valid: false, 
            error: 'Country code must be 1-3 digits' 
        };
    }

    if (cleanCode.startsWith('0')) {
        return { 
            valid: false, 
            error: 'Country code cannot start with 0' 
        };
    }

    // Validate number (exactly 10 digits)
    if (!/^\d{10}$/.test(cleanNumber)) {
        return { 
            valid: false, 
            error: 'Phone number must be exactly 10 digits' 
        };
    }

    const formatted = `+${cleanCode}${cleanNumber}`;
    return {
        valid: true,
        error: null,
        formatted: formatted,
        countryCode: cleanCode,
        number: cleanNumber
    };
}

/**
 * Extracts country code and number from combined phone
 * @param {string} phone - Combined phone number (+{countrycode}{number})
 * @returns {Object} - { countryCode: string, number: string } or null if invalid
 */
function parsePhoneNumber(phone) {
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
        return null;
    }

    return {
        countryCode: validation.countryCode,
        number: validation.number,
        formatted: validation.formatted
    };
}

module.exports = {
    validatePhoneNumber,
    formatPhoneFromParts,
    parsePhoneNumber
};
