const catchDuplicateFilm = (res, err, next) => {
    if (err.name === 'MongoError' && err.code === 11000) {
        res.status(409).json({
            errors: ['`title` already in use']
        })
    } else {
        next(err)
    }
};

module.exports = {
    catchDuplicateFilm
};
