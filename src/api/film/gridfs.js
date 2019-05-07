const mongoose = require('../../services/mongoose');
const { createModel } = require('mongoose-gridfs');

const filmFileModel = createModel(
    {
        bucketName: 'films',
        modelName: 'Film',
        connection: mongoose.connection
    }
);

module.exports = filmFileModel.model;