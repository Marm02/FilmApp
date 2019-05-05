const mongoose = require('mongoose');

const {mongo} = require('../../config');

for (const key in mongo.options) {
    mongoose.set(key, mongo.options[key]);
}


mongoose.connection.on('connected', function (res, db) {
    console.log('MongoDB connected successfully')
});


mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error: ' + err);
    process.exit(-1);
});

module.exports = mongoose;