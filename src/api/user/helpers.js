const catchDuplicateEmail = (res, err, next) => {
    if (err.name === 'MongoError' && err.code === 11000) {
        res.status(409).json({
            errors: ['Email already registered']
        })
    } else {
        next(err)
    }
};

module.exports = {
    catchDuplicateEmail
};
