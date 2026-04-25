const crypto = require('crypto');

const DEFAULT_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const DEFAULT_PURPOSE = 'account-verification';
const DEFAULT_PEPPER = process.env.OTP_PEPPER || 'water-station-otp';

const normalizeCode = (code) => String(code ?? '').replace(/\s+/g, '').trim();

const generateVerificationCode = (length = 6) => {
    const upperBound = 10 ** length;
    return crypto.randomInt(0, upperBound).toString().padStart(length, '0');
};

const hashVerificationCode = ({ uid, code, purpose = DEFAULT_PURPOSE }) => {
    return crypto
        .createHash('sha256')
        .update([uid, purpose, normalizeCode(code), DEFAULT_PEPPER].join(':'))
        .digest('hex');
};

const createVerificationCodeRecord = ({ uid, purpose = DEFAULT_PURPOSE, expiresInMinutes = DEFAULT_EXPIRY_MINUTES }) => {
    const verificationCode = generateVerificationCode();
    const otpExpiresAt = new Date(Date.now() + (expiresInMinutes * 60 * 1000)).toISOString();

    return {
        verificationCode,
        otpHash: hashVerificationCode({ uid, code: verificationCode, purpose }),
        otpExpiresAt,
        expiresInMinutes,
        purpose
    };
};

const isOtpExpired = (expiresAt) => {
    if (!expiresAt) {
        return true;
    }

    const expiryTime = new Date(expiresAt).getTime();
    return Number.isNaN(expiryTime) || expiryTime <= Date.now();
};

const verifyVerificationCode = ({ uid, code, otpHash, purpose = DEFAULT_PURPOSE, otpExpiresAt }) => {
    if (!otpHash || isOtpExpired(otpExpiresAt)) {
        return false;
    }

    const expectedHash = hashVerificationCode({ uid, code, purpose });
    const expectedBuffer = Buffer.from(expectedHash);
    const actualBuffer = Buffer.from(otpHash);

    if (expectedBuffer.length !== actualBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

module.exports = {
    createVerificationCodeRecord,
    generateVerificationCode,
    hashVerificationCode,
    isOtpExpired,
    verifyVerificationCode
};