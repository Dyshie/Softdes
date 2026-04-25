const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createVerificationCodeRecord,
    isOtpExpired,
    verifyVerificationCode
} = require('../utils/verificationOtp');

test('createVerificationCodeRecord creates a six-digit code and hash', () => {
    const record = createVerificationCodeRecord({ uid: 'user-1' });

    assert.equal(record.verificationCode.length, 6);
    assert.match(record.verificationCode, /^\d{6}$/);
    assert.equal(typeof record.otpHash, 'string');
    assert.equal(record.purpose, 'account-verification');
});

test('verifyVerificationCode accepts the generated code and rejects a wrong code', () => {
    const record = createVerificationCodeRecord({ uid: 'user-2' });

    assert.equal(
        verifyVerificationCode({
            uid: 'user-2',
            code: record.verificationCode,
            otpHash: record.otpHash,
            otpExpiresAt: record.otpExpiresAt
        }),
        true
    );

    assert.equal(
        verifyVerificationCode({
            uid: 'user-2',
            code: '000000',
            otpHash: record.otpHash,
            otpExpiresAt: record.otpExpiresAt
        }),
        false
    );
});

test('isOtpExpired detects expired timestamps', () => {
    assert.equal(isOtpExpired('2000-01-01T00:00:00.000Z'), true);
    assert.equal(isOtpExpired('2999-01-01T00:00:00.000Z'), false);
});