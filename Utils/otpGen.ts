interface OTPFlags {
    numeric?: boolean;
    alphaNumeric?: boolean;
    alpha?: boolean;
    upperCase?: boolean;
    lowerCase?: boolean;
    specialChars?: boolean;
}

/**
 * Generates a One-Time Password (OTP) based on the provided length and character flags.
 *
 * @param {number} [length=6] - The length of the OTP to be generated. Defaults to 6 if not provided.
 * @param {OTPFlags} [flags={ numeric: true }] - An object with boolean flags to determine the character set.
 * @param {boolean} [flags.numeric] - If true, includes numeric characters (0-9).
 * @param {boolean} [flags.alphaNumeric] - If true, includes alphanumeric characters (0-9, a-z, A-Z).
 * @param {boolean} [flags.alpha] - If true, includes lowercase alphabetic characters (a-z).
 * @param {boolean} [flags.upperCase] - If true, includes uppercase alphabetic characters (A-Z).
 * @param {boolean} [flags.lowerCase] - If true, includes lowercase alphabetic characters (a-z).
 * @param {boolean} [flags.specialChars] - If true, includes special characters (!@#$%^&*()_+{}:"<>?|[];,./`~).
 * @returns {string} The generated OTP string.
 * 
 * @example
 * // Generates a numeric OTP of length 6
 * const otp1 = otpGenerator();
 * 
 * @example
 * // Generates an alphanumeric OTP of length 8
 * const otp2 = otpGenerator(8, { alphaNumeric: true });
 * 
 * @example
 * // Generates an alphabetic OTP of length 10 with uppercase characters
 * const otp3 = otpGenerator(10, { alpha: true, upperCase: true });
 * 
 * @example
 * // Generates a special character OTP of length 12 with lowercase characters
 * const otp4 = otpGenerator(12, { specialChars: true, lowerCase: true });
 * 
 * @example
 * // Generates a numeric and special character OTP of length 14
 * const otp5 = otpGenerator(14, { numeric: true, specialChars: true });
 */
export const otpGenerator = (
    length: number = 6,
    flags: OTPFlags = { numeric: true }
): string => {
    const numericPool = '0123456789';
    const alphaPool = 'abcdefghijklmnopqrstuvwxyz';
    const upperCaseAlphaPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const specialCharsPool = '!@#$%^&*()_+{}:"<>?|[];,./`~';

    let charPool = '';

    if (flags.numeric) {
        charPool += numericPool;
    }
    if (flags.alphaNumeric) {
        charPool += numericPool + alphaPool + upperCaseAlphaPool;
    }
    if (flags.alpha) {
        charPool += alphaPool;
    }
    if (flags.upperCase) {
        charPool += upperCaseAlphaPool;
    }
    if (flags.lowerCase) {
        charPool += alphaPool;
    }
    if (flags.specialChars) {
        charPool += specialCharsPool;
    }

    // Default to numeric if no flags are set to avoid an empty pool
    if (charPool.length === 0) {
        charPool = numericPool;
    }

    let otp = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charPool.length);
        otp += charPool[randomIndex];
    }

    return otp;
};
