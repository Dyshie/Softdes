/**
 * Profile Component
 */
async function renderProfile() {
    const container = document.getElementById('app-container');
    const fallbackUser = getCurrentUser() || {};
    let user = fallbackUser;

    try {
        const profile = await apiClient.auth.getProfile();
        user = {
            ...fallbackUser,
            ...profile
        };
        localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
        console.error('Error loading profile:', error);
    }

    const needsOtpVerification = user.otpVerified === false;
    const verificationSection = needsOtpVerification
        ? `
            <div class="verification-panel mb-4 p-4 rounded-4 border border-white bg-white bg-opacity-75">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                    <div>
                        <h2 class="h5 mb-1">Verify Your Account</h2>
                        <p class="text-muted mb-0">Request a code, confirm your email, then save your new password.</p>
                    </div>
                    <span class="badge rounded-pill bg-warning text-dark px-3 py-2">Verification pending</span>
                </div>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <button type="button" class="btn btn-outline-primary" id="request-verification-code">Send Verification Code</button>
                </div>
                <div id="verification-feedback" class="mb-3"></div>
                <div class="row g-3 align-items-end">
                    <div class="col-md-8">
                        <label for="profile-otp-code" class="form-label">Verification Code</label>
                        <input type="text" class="form-control" id="profile-otp-code" inputmode="numeric" maxlength="6" placeholder="Enter the 6-digit code">
                    </div>
                    <div class="col-md-4 d-grid">
                        <button type="button" class="btn btn-primary" id="verify-verification-code">Verify Code</button>
                    </div>
                </div>
            </div>
        `
        : `
            <div class="alert alert-success mb-4">Your account is verified and ready for password changes.</div>
        `;

    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="row justify-content-center">
                <div class="col-lg-8 col-xl-6">
                    <div class="card shadow-sm">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-start mb-4">
                                <div>
                                    <h1 class="h3 mb-1">My Profile</h1>
                                    <p class="text-muted mb-0">View and update your account details.</p>
                                </div>
                            </div>
                            ${user.tempPassword ? '<div class="alert alert-warning">Your account is using a temporary password. Change it below to secure your account.</div>' : ''}
                            ${verificationSection}
                            <form id="profile-form">
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" value="${user.email || ''}" disabled>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Role</label>
                                    <input type="text" class="form-control" value="${user.role || ''}" disabled>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-display-name" class="form-label">Display Name</label>
                                    <input type="text" class="form-control" id="profile-display-name" value="${user.displayName || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-phone" class="form-label">Phone</label>
                                    <input type="tel" class="form-control" id="profile-phone" value="${user.phone || ''}">
                                </div>
                                <div class="mb-3">
                                    <label for="profile-new-password" class="form-label">New Password</label>
                                    <input type="password" class="form-control" id="profile-new-password" placeholder="Leave blank to keep current password">
                                </div>
                                <div class="mb-3">
                                    <label for="profile-confirm-password" class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-control" id="profile-confirm-password" placeholder="Repeat new password">
                                </div>
                                <button type="submit" class="btn btn-primary">Save Changes</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('profile-form').addEventListener('submit', saveProfile);

    const requestCodeButton = document.getElementById('request-verification-code');
    if (requestCodeButton) {
        requestCodeButton.addEventListener('click', requestVerificationCode);
    }

    const verifyCodeButton = document.getElementById('verify-verification-code');
    if (verifyCodeButton) {
        verifyCodeButton.addEventListener('click', verifyVerificationCode);
    }
}

function setVerificationFeedback(message, type = 'info') {
    const feedback = document.getElementById('verification-feedback');

    if (!feedback) {
        return;
    }

    feedback.innerHTML = `<div class="alert alert-${type} mb-0">${message}</div>`;
}

async function requestVerificationCode() {
    try {
        const response = await apiClient.auth.requestVerificationCode();
        const verificationCodeInput = document.getElementById('profile-otp-code');

        if (response.verificationCode && verificationCodeInput) {
            verificationCodeInput.value = response.verificationCode;
            setVerificationFeedback(`Verification code generated in development mode: <strong>${response.verificationCode}</strong>`, 'warning');
            return;
        }

        setVerificationFeedback('Verification code sent to your email address.', 'success');
    } catch (error) {
        setVerificationFeedback(`Error sending verification code: ${error.message}`, 'danger');
    }
}

async function verifyVerificationCode() {
    try {
        const otpCode = document.getElementById('profile-otp-code').value.trim();

        if (!otpCode) {
            setVerificationFeedback('Enter the 6-digit verification code first.', 'warning');
            return;
        }

        const response = await apiClient.auth.verifyVerificationCode({ otpCode });
        const user = {
            ...(getCurrentUser() || {}),
            ...(response.user || {}),
            otpVerified: true
        };

        localStorage.setItem('user', JSON.stringify(user));

        setVerificationFeedback('Account verified successfully. You can now update your password.', 'success');
        routeTo('/profile');
    } catch (error) {
        setVerificationFeedback(`Error verifying code: ${error.message}`, 'danger');
    }
}

async function saveProfile(e) {
    e.preventDefault();

    try {
        const currentUser = getCurrentUser() || {};
        const displayName = document.getElementById('profile-display-name').value.trim();
        const phone = document.getElementById('profile-phone').value.trim();
        const newPassword = document.getElementById('profile-new-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;

        if (newPassword || confirmPassword) {
            if (!newPassword || !confirmPassword) {
                alert('Please fill in both password fields to change your password.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('New password and confirmation do not match.');
                return;
            }

            if (currentUser.otpVerified === false) {
                alert('Verify your account with the OTP code before changing your password.');
                return;
            }
        }

        const response = await apiClient.auth.updateProfile({
            displayName,
            phone,
            ...(newPassword ? { newPassword, confirmPassword } : {})
        });

        const user = {
            ...(getCurrentUser() || {}),
            ...(response.user || {}),
            displayName,
            phone
        };

        localStorage.setItem('user', JSON.stringify(user));

        document.getElementById('user-name').textContent = displayName || user.email || 'User';
        document.getElementById('profile-new-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
        alert('Profile updated successfully');
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    }
}

router.register('/profile', renderProfile);