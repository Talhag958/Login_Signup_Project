const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cors  = require('cors')


// Config .env  to /config/config.env
require('dotenv').config({
    path:'./config/config.env'
}) 

const app = express()
app.use(cors())
// body parser
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Connect to db
const connectDb = require('./config/db')
connectDb()


// Load all routes
const authRouter = require('./routes/auth.route')
// Use routes
app.use('/api/',authRouter)

// Config for development purpose
if(process.env.NODE_ENV === 'development'){
    app.use(cors({
        origin : process.env.CLIENT_URL
    }))
    app.use(morgan('dev'))
    // Morgan Give information about each request
    // Cors allow to deal with react without problem on localhost
}




app.use((req,res,next)=>{
    res.status(404).json({
        success:false,
        message:"Page not found"
    })
})

// Port
const PORT = process.env.PORT || 5000
app.listen(PORT,()=>{
    console.log(`App listening on port ${PORT}`)
})