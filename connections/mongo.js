const mongoose = require("mongoose");
global.ObjectId = mongoose.Types.ObjectId;
module.exports.mongodb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
    
        mongoose.set('debug', false);  // Enable query debugging
        console.log("Mongodb connected successfully")
    } catch (error) {
        throw error
    }
};




