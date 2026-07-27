const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const {
  register,
  login,
  verifyTwoFactor,
  setupTwoFactor,
  confirmTwoFactor,
  me
} = require('../controllers/authController');

router.post('/register',    register);
router.post('/login',       login);
router.post('/verify-2fa',  verifyTwoFactor);
router.post('/setup-2fa',   verifyToken, setupTwoFactor);
router.post('/confirm-2fa', verifyToken, confirmTwoFactor);
router.get('/me',           verifyToken, me);

module.exports = router;
