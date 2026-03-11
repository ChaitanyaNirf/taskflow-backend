const { Router } = require('express');
const { register, login, verifyOtp, resendOtp, getProfile, updateProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;
