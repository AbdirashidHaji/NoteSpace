const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/error');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }).withMessage('Name must be at most 100 characters.'),
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters.'),
];

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const profileRules = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }).withMessage('Name must be at most 100 characters.'),
];

const passwordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8, max: 128 }).withMessage('New password must be 8-128 characters.'),
];

router.post('/register', registerRules, validate, auth.register);
router.post('/login', loginRules, validate, auth.login);

router.use(authenticate); // everything below requires a valid token
router.get('/me', auth.me);
router.patch('/profile', profileRules, validate, auth.updateProfile);
router.patch('/password', passwordRules, validate, auth.changePassword);

module.exports = router;
