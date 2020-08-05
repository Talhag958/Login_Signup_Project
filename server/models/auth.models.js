const mongoose = require('mongoose')
const crypto = require('crypto') // encryption
const { time, timeStamp } = require('console')

// User schema

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        trim:true,
        required:true,
        unique:true,
        lowercase:true
    },
    name: {
        type: String,
        trim:true,
        required:true,
    },
    // save password after encryption
    hashed_password: {
        type: String,
        required:true, 
    },
    salt:String,
    role:{
        type:String,
        default:'Normal'
        // we can have more user types(normal,admin ...)

    },
    resetPasswordLink:{
        data:String,
        default:''
    } 
},{timeStamp:true})

// virtual password
userSchema.virtual('password')
    .set(function(password){
        //set password note
        this._password  = password
        this.salt = this.makeSalt()
        this.hashed_password = this.encryptPassword(password)
    })
    .get(function(){
        return this._password
    })

// methods

userSchema.methods = {
    // generate Salt
    makeSalt: function() {
        return Math.round(new Date().valueOf() * Math.random()) + '';
    },
    // encrypt password
    encryptPassword: function(password){
        if(!password) return ''
        try{
            return crypto.createHmac('sha1',this.salt)
                .update(password)
                .digest('hex')
        }
        catch(err){
            return ''
        }
    },
    // compare passwords between plain password and hashed passwords
    authenticate: function(plainText) {
        return this.encryptPassword(plainText) === this.hashed_password;
      },


}

module.exports = mongoose.model('User',userSchema)