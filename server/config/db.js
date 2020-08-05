const mongoose = require('mongoose')

const connectDb = async () =>{
    const connection =  await mongoose.connect(process.env.MONGO_URL,{
        useNewUrlParser : true,
        useCreateIndex : true,
        useFindAndModify : false,
        useUnifiedTopology : true
    })
    console.log(`MongoDb  Connected: ${connection.connection.host}`)
}

module.exports = connectDb