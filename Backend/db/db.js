const mongoose = require('mongoose');


async function connectToDb(uri = process.env.MONGODB_URI) {
    if (typeof uri !== 'string' || uri.trim() === '') {
        throw new Error('MONGODB_URI is not set. Set it to your MongoDB connection string.');
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    await mongoose.connect(uri, {
        maxPoolSize: 25,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
    });
    console.log('Connected to DB');
    return mongoose;
}


module.exports = connectToDb;