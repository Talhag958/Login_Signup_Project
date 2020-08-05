const express = require('express')
const router = express.Router()


const {
    validSign,
    validLogin,
    forgotPasswordValidator,
    resetPasswordValidator
} = require('../helpers/valid')
// load controllers
const{ registerController,activationController,loginController, forgotPasswordController,
    resetPasswordController,} = require('../controllers/auth.controller.js')

router.post('/register',validSign,registerController)
router.post('/login',validLogin,loginController)
router.post('/activation',activationController)

// forgot reset password
router.put('/forgotpassword', forgotPasswordValidator, forgotPasswordController);
router.put('/resetpassword', resetPasswordValidator, resetPasswordController);

module.exports = router