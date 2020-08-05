const User = require('../models/auth.models')
const expressJwt = require('express-jwt')
const _ = require('lodash')
const {OAuth2Client} = require('google-auth-library')
const fetch = require('node-fetch')
const {validationResult} = require('express-validator')
const jwt = require('jsonwebtoken')

// custom error handler  to get usefull from database errors
const { errorHandler } = require('../helpers/dbErrorHandling')
// both @sendgrid and nodemail can be used to send mail
const sgMail = require('@sendgrid/mail')
sgMail .setApiKey(process.env.MAIL_KEY)

// sgmail not working , use nodemail instead
const nodemailer = require('nodemailer');

exports.registerController = (req, res) => {
  const { name, email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map(error => error.msg)[0];
    return res.status(422).json({
      errors: firstError
    });
  } else {
    User.findOne({
      email
    }).exec((err, user) => {
      if (user) {
        return res.status(400).json({
          errors: 'Email is taken'
        });
      }
    });

    const token = jwt.sign(
      {
        name,
        email,
        password
      },
      process.env.JWT_ACCOUNT_ACTIVATION,
      {
        expiresIn: '5m'
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Account activation link',
      html: `
                <h1>Please use the following to activate your account</h1>
                <p>${process.env.CLIENT_URL}/users/activate/${token}</p>
                <hr />
                <p>This email may containe sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `
    };
     // adding changes for nodemailer
     const transporter = nodemailer.createTransport({
      host: "smtp.googlemail.com",
      port: 587,
      secure: false, // secure:true for port 465, secure:false for port 587
      auth: {
        user: "mmta.xyz@gmail.com",
        pass: "pluffy007"
      }
      // service: 'gmail',
      // auth: {
      //   user: 'mmta.xyz@gmail.com',
      //   pass: 'pluffy007' // naturally, replace both with your real credentials or an application-specific password
      // }
    });
    transporter.sendMail(emailData).then(sent => {
      return res.json({
        message: `Email has been sent to ${email}`
      });
    })
    .catch(err => {
      return res.status(400).json({
        success: false,
        errors: "email cann't be sent"
        // errorHandler(err)
      });
    });

   
  }
};


exports.forgotPasswordController = (req, res) => {
  const { email } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map(error => error.msg)[0];
    return res.status(422).json({
      errors: firstError
    });
  } else {
    User.findOne(
      {
        email
      },
      (err, user) => {
        if (err || !user) {
          return res.status(400).json({
            error: 'User with that email does not exist'
          });
        }

        const token = jwt.sign(
          {
            _id: user._id
          },
          process.env.JWT_RESET_PASSWORD,
          {
            expiresIn: '10m'
          }
        );

        const emailData = {
          from: process.env.EMAIL_FROM,
          to: email,
          subject: `Password Reset link`,
          html: `
                    <h1>Please use the following link to reset your password</h1>
                    <p>${process.env.CLIENT_URL}/users/password/reset/${token}</p>
                    <hr />
                    <p>This email may contain sensetive information</p>
                    <p>${process.env.CLIENT_URL}</p>
                `
        };

        return user.updateOne(
          {
            resetPasswordLink: token
          },
          (err, success) => {
            if (err) {
              console.log('RESET PASSWORD LINK ERROR', err);
              return res.status(400).json({
                error:
                  'Database connection error on user password forgot request'
              });
            } else {
               // adding changes for nodemailer
              const transporter = nodemailer.createTransport({
                host: "smtp.googlemail.com",
                port: 587,
                secure: false, // secure:true for port 465, secure:false for port 587
                auth: {
                  user: "mmta.xyz@gmail.com",
                  pass: "pluffy007"
                }
                // service: 'gmail',
                // auth: {
                //   user: 'mmta.xyz@gmail.com',
                //   pass: 'pluffy007' // naturally, replace both with your real credentials or an application-specific password
                // }
              });
              transporter.sendMail(emailData).then(sent => {
                return res.json({
                  message: `Email has been sent to ${email}. Follow the instruction to activate your account`
                });
              })
              .catch(err => {
                return res.status(400).json({
                  success: false,
                  errors: "email cann't be sent"
                  // errorHandler(err)
                });
              });
              // sgMail
              //   .send(emailData)
              //   .then(sent => {
              //     // console.log('SIGNUP EMAIL SENT', sent)
              //     return res.json({
              //       message: `Email has been sent to ${email}. Follow the instruction to activate your account`
              //     });
              //   })
              //   .catch(err => {
              //     // console.log('SIGNUP EMAIL SENT ERROR', err)
              //     return res.json({
              //       message: err.message
              //     });
              //   });
            }
          }
        );
      }
    );
  }
};

exports.resetPasswordController = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map(error => error.msg)[0];
    return res.status(422).json({
      errors: firstError
    });
  } else {
    if (resetPasswordLink) {
      jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(
        err,
        decoded
      ) {
        if (err) {
          return res.status(400).json({
            error: 'Expired link. Try again'
          });
        }

        User.findOne(
          {
            resetPasswordLink
          },
          (err, user) => {
            if (err || !user) {
              return res.status(400).json({
                error: 'Something went wrong. Try later'
              });
            }

            const updatedFields = {
              password: newPassword,
              resetPasswordLink: ''
            };

            user = _.extend(user, updatedFields);

            user.save((err, result) => {
              if (err) {
                return res.status(400).json({
                  error: 'Error resetting user password'
                });
              }
              res.json({
                message: `Great! Now you can login with your new password`
              });
            });
          }
        );
      });
    }
  }
};


// exports.registerController = (req, res) => {
//     const { name, email, password } = req.body;
//     console.log(name,email,password)
//     const errors = validationResult(req);
  
//     if (!errors.isEmpty()) {
//       const firstError = errors.array().map(error => error.msg)[0];
//       return res.status(422).json({
//         errors: firstError
//       });
//     } else {
//       User.findOne({
//         email
//       }).exec((err, user) => {
//         if (user) {
//           return res.status(400).json({
//             errors: 'Email is taken'
//           });
//         }
//       });
  
//       const token = jwt.sign(
//         {
//           name,
//           email,
//           password
//         },
//         process.env.JWT_ACCOUNT_ACTIVATION,
//         {
//           expiresIn: '5m'
//         }
//       );
//       console.log(token)
  
//       const emailData = {
//         from: process.env.EMAIL_FROM,
//         to: email,
//         subject: 'Account activation link',
//         html: `
//                   <h1>Please use the following to activate your account</h1>
//                   <p>${process.env.CLIENT_URL}/users/activate/${token}</p>
//                   <hr />
//                   <p>This email may containe sensetive information</p>
//                   <p>${process.env.CLIENT_URL}</p>
//               `
//       };
//       console.log(emailData)
//       // adding changes for nodemailer
//       const transporter = nodemailer.createTransport({
//         host: "smtp.googlemail.com",
//         port: 587,
//         secure: false, // secure:true for port 465, secure:false for port 587
//         auth: {
//           user: "mmta.xyz@gmail.com",
//           pass: "pluffy007"
//         }
//         // service: 'gmail',
//         // auth: {
//         //   user: 'mmta.xyz@gmail.com',
//         //   pass: 'pluffy007' // naturally, replace both with your real credentials or an application-specific password
//         // }
//       });
//       transporter.sendMail(emailData).then(sent => {
//         return res.json({
//           message: `Email has been sent to ${email}`
//         });
//       })
//       .catch(err => {
//         return res.status(400).json({
//           success: false,
//           errors: "email cann't be sent"
//           // errorHandler(err)
//         });
//       });
//       // sgMail
//       //   .send(emailData)
//       //   .then(sent => {
//       //     return res.json({
//       //       message: `Email has been sent to ${email}`
//       //     });
//       //   })
//       //   .catch(err => {
//       //     return res.status(400).json({
//       //       success: false,
//       //       errors: "email cann't be sent"
//       //       // errorHandler(err)
//       //     });
//       //   });
//     // return res.json({
//     //     message: `Email has been sent to ${email}`
//     // })
//     }
//   };
 
// Activate and save to database
exports.activationController = (req, res) => {
  const { token } = req.body;

  if (token) {
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, (err, decoded) => {
      if (err) {
        console.log('Activation error' + err);
        return res.status(401).json({
          errors: 'Expired link. Signup again'
        });
      } else {
        const { name, email, password } = jwt.decode(token);

        console.log(email);
        const user = new User({
          name,
          email,
          password
        });

        user.save((err, user) => {
          if (err) {
            console.log('Save error', errorHandler(err));
            return res.status(401).json({
              errors: errorHandler(err)
            });
          } else {
            return res.json({
              success: true,
              message: user,
              message: 'Signup success'
            });
          }
        });
      }
    });
  } else {
    return res.json({
      message: 'error happening please try again'
    });
  }
};

exports.loginController = (req,res) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array().map(error => error.msg)[0];
    return res.status(422).json({
      errors: firstError
    });
  } else {
    // check if user exist
    User.findOne({
      email
    }).exec((err, user) => {
      if (err || !user) {
        return res.status(400).json({
          errors: 'User with that email does not exist. Please signup'
        });
      }
      // authenticate
      if (!user.authenticate(password)) {
        return res.status(400).json({
          errors: 'Email and password do not match'
        });
      }
      // generate a token and send to client
      const token = jwt.sign(
        {
          _id: user._id
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '7d'
        }
      );
      const { _id, name, email, role } = user;

      return res.json({
        token,
        user: {
          _id,
          name,
          email,
          role
        }
      });
    });
  }

}

// exports.activationController = (req,res) =>{
//   console.log("activation ")
//   const { token } = req.body
//   if(token){
//     //verify token validity
//     jwt.verify(token,process.env.JWT_ACCOUNT_ACTIVATION,(err,decoded)=>{
//       if(err){
//         return res.status(401).json({
//           error: 'Expired Token! Signup again'
//         })
//       }
//     })
//   }
//   else{
//     // token is valid, save data to DB
//     const {name,email,password} = jwt.decode(token)

//     //create user
//     const user = new User({
//       name,
//       email,
//       password
//     })
//     user.save((err,user )=>{
//       if(err){
//         return res.status(401).json({
//           error: errorHandler(err)
//         })
//       }
//       else{
//         return res.json({
//           success : true,
//           message : "Signup successfull",
//           user
//         })
//       }
//     })
//   }
// } 






// exports.registerController = (req, res) => {
//     const { name, email, password } = req.body;

//     const errors = validationResult(req)

//     if(!errors.isEmpty()){
//         const firsterror = errors.array().map(error=>error.msg()[0])
//         return res.status(422).json({
//             error: firsterror
//         })
//     }
//     else{
//         User.findOne({
//             email
//         }).exec((err,user)=>{
//             // if user exists
//             if(user){
//                 return res.status(400).json({
//                     error:'Email is taken'
//                 })
//             }
//         })
//         // Generate Token
//         const token = jwt.sign(
//             {
//                 name,
//                 email,
//                 password
//             },
//             process.env.JWT_ACCOUNT_ACTIVATION,
//             {
//                 expiresIn: '15m'
//             }
//         )
//        const emailData = {
//            from : process.env.EMAIL_FROM,
//            to : email,
//            subject : "Account activation Link",
//            html : `
//                 <h1>Please click the link to activcate</h1>
//                 <p>${process.env.CLIENT_URL}/users/activate/${token}</p>
//                 <hr>
//                 <p>This email contain sensitive information</p>
//                 <p>${process.env.CLIENT_URL}</p>
//            `
//        }
//        sgmail.send(emailData).then(sent=>{
//            message: 'Email has been sent to ${email}'
//        }).catch(err=>{
//            return res.status(400).json({
//                error : errorHandler(err)
//            })
//        })
//     }
//     // console.log(name, email, password);
//     // console.log(req.body);

//     // res.status(404).json({ 
//     //     success: true,
//     //     message: `Register route ${name}`
        
//     // })
// } 