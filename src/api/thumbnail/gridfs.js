const mongoose = require('../../services/mongoose');
const { createModel } = require('mongoose-gridfs');

const thumbnailModelGridFS = createModel(
    {
        collection: 'films',
        modelName: 'ThumbnailGridFS',
        mongooseConnection: mongoose.connection
    }
);


module.exports = thumbnailModelGridFS.model;