const {createModel} = require("mongoose-gridfs");

const mongoose = require('../../services/mongoose');

const FilmGridFs = createModel({
    modelName: 'films',
    bucketName: 'films',
    connection: mongoose.connection
});

module.exports = FilmGridFs;