const gridfs = require('mongoose-gridfs');
const mongoose = require('../../services/mongoose');

const thumbnailModelGridFS = gridfs(
    {
        collection: 'films',
        model: 'ThumbnailGridFS',
        mongooseConnection: mongoose.connection
    }
);


module.exports = thumbnailModelGridFS.model;