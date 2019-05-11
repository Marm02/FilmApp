const {createModel} = require("mongoose-gridfs");

const mongoose = require('../../services/mongoose');

const ThumbnailGridFs = createModel({
    modelName: 'thumbnails',
    bucketName: 'thumbnails',
    connection: mongoose.connection
});

module.exports = ThumbnailGridFs;