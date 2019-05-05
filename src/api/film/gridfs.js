const gridfs = require('mongoose-gridfs');
const mongoose = require('../../services/mongoose');

const filmFileModel = gridfs(
    {
        collection: 'films',
        model: 'FilmFile',
        mongooseConnection: mongoose.connection
    }
);

module.exports = filmFileModel.model;