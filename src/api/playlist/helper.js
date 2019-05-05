const catchDuplicatePlaylistTitle = (res, err, next) => {
    if (err.name === 'MongoError' && err.code === 11000) {
        res.status(409).json({
            errors: ['`title` already in use']
        })
    } else {
        next(err)
    }
};

const catchFilmNonExists = (res, err, next) => {
    if (err.name === 'MongoError' && err.code === 11000) {
        res.status(409).json({
            errors: ['film with this `id` not exists!']
        })
    } else {
        next(err)
    }
};

module.exports = {
    catchFilmNonExists, catchDuplicatePlaylistTitle
};
