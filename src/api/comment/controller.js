const {success, notFound} = require('../../services/response');

const Filmmodel = require('../film/model').model;
const ObjectId = require('mongoose').Types.ObjectId;

const User = require('../user/model').model;


const createComment = async (req, res, next) => {
    const {film_id} = req.params;
    const user = req.user;
    const {text} = req.body;
    if (!text)
        return res.status(400).json({
            errors: ['path text is required']
        });

    let film = await Filmmodel.findById(film_id).exec();

    if (film === null)
        return notFound(res)(film);

    const commentId = ObjectId();

    try {
        film.comments.unshift({
            "_id": commentId,
            "film_id": film_id,
            "author_id": user._id,
            "text": text
        });

    } catch (e) {


        return res.status(400).json({
            errors: e.errors.text.message
        }).end();
    }
    user.comments.unshift(commentId);
    {
        await film.save();
        await user.save();
        success(res)({
            "_id": commentId,
            "film_id": film_id,
            "author_id": user._id,
            "text": text,
            "createdAt": commentId.getTimestamp()
        })
    }
};

const updateComment = async (req, res, next) => {
    const {film_id, commentId} = req.params;
    const user = req.user;

    let film = await Filmmodel.findOne({_id: film_id, comments: {$elemMatch: {_id: commentId}}});

    if (film === null || film.comments.length === 0)
        return notFound(res)(null);

    if (user.role === 'admin' || (user.comments.indexOf(commentId) > -1)) {

        if (req.body.text === null || req.body.text === undefined)
            return res.status(400).send({error: 'Path text is required'}).end();

        if (!(typeof req.body.text === 'string' || req.body.text instanceof String))
            return res.status(400).send({error: 'Path text must be of type String'}).end();

        Filmmodel.findOneAndUpdate({comments: {$elemMatch: {_id: commentId}}}, {$set: {"comments.$.text": (req.body.text)}},
            {
                "projection": {
                    "comments": {
                        "$elemMatch": {"_id": commentId}
                    }
                },
                "new": true
            })
            .populate("comments")
            .then((film) => film ? film.comments.map((comment) => comment.view(true)) : null)
            .then(success(res))
            .catch(next);

    } else {
        return res.status(403).end()
    }

};

const destroyComment = async (req, res, next) => {

    const {film_id, commentId} = req.params;

    let film = await Filmmodel.findOne({_id: film_id}, {comments: {$elemMatch: {_id: commentId}}});

    if (film === null || film.comments.length === 0)
        return notFound(res)(null);

    const userId = film.comments[0].author_id;

    if (!((req.user.role === 'admin') || (req.user._id.equals(userId))))
        return res.status(401).end();

    const filmPromise =
        Filmmodel.findByIdAndUpdate({_id: film_id}, {$pull: {comments: {_id: commentId}}}, {new: true}).exec();

    const userPromise =
        User.findOneAndUpdate({_id: userId}, {$pull: {comments: commentId}}, {new: true}).exec();


    {
        await Promise.all([
            filmPromise,
            userPromise
        ]);

        try {
            success(res, 200)(null)
        } catch (e) {
            res.status(400).end()
        }
    }
};


const sortCommentsByCreationDate = async ({params, query}, res, next) => {

    let film = await Filmmodel.findById({_id: params.film_id});

    if (film === null)
        return notFound(res)(null);

    if (!query.limit && parseInt(query.limit) === 0) {
        return res.status(400).json({
            errors: 'bad request'
        }).end();
    }

    Filmmodel.aggregate([
        {"$match": {"_id": ObjectId(params.film_id)}},
        {
            "$unwind": "$comments"
        },
        {
            "$limit": parseInt(query.limit)
        },
        {
            $lookup: {
                from: "users",
                localField: "comments.author_id",
                foreignField: "_id",
                as: "author",
            }
        },
        {
            "$unwind": {
                "path": "$author",
                "preserveNullAndEmptyArrays": true
            }
        },

        {
            "$sort": {
                "comments.createdAt": parseInt(params.dir)
            }
        }, {
            "$group": {
                "comments": {
                    "$push": {comment: "$comments", author: "$author.nick"},

                },
                "_id": 1
            }
        }, {
            "$project": {
                "_id": 0,
                "comments": 1,

            }
        }]).then((result) => {
        result[0].comments.forEach(comment => {
            if (!comment.author) {
                comment.author = "user delted"
            }
        });

        if (params.dir == 1)
            result[0].comments.sort((a, b) => (new Date(a.comment.createdAt) - new Date(b.comment.createdAt)));
        else
            result[0].comments.sort((a, b) => (new Date(b.comment.createdAt) - new Date(a.comment.createdAt)));


        return success(res)(result);

    }).catch((err) => {
        return res.status(400).send({error: err.errmsg}).end();
    });

};

const sortCommentsByAuthorName = async ({params, query}, res, next) => {

    let film = await Filmmodel.findById({_id: params.film_id});

    if (film === null)
        return notFound(res)(null);

    if (!query.limit && parseInt(query.limit) === 0) {
        return res.status(400).json({
            errors: 'bad request'
        }).end();
    }

    Filmmodel.aggregate([
        {"$match": {"_id": ObjectId(params.film_id)}},
        {
            "$unwind": "$comments"
        },
        {
            "$limit": parseInt(query.limit)
        },
        {
            $lookup: {
                from: "users",
                localField: "comments.author_id",
                foreignField: "_id",
                as: "author",
            }
        },
        {
            "$unwind": {
                "path": "$author",
                "preserveNullAndEmptyArrays": true
            }
        },

        {
            "$sort": {
                "author.nick": parseInt(params.dir)
            }
        }, {
            "$group": {
                "comments": {
                    "$push": {comment: "$comments", author: "$author.nick"},

                },
                "_id": 1
            }
        }, {
            "$project": {
                "_id": 0,
                "comments": 1,

            }
        }]).then((result) => {
        result[0].comments.forEach(comment => {
            if (!comment.author) {
                comment.author = "user delted"
            }
        });

        if (params.dir == 1)
            result[0].comments.sort((a, b) => (a.author.toLowerCase() > b.author.toLowerCase()) ? 1 :
                ((b.author.toLowerCase() > a.author.toLowerCase()) ? -1 : 0));
        else
            result[0].comments.sort((a, b) => (a.author.toLowerCase() < b.author.toLowerCase()) ? 1 :
                ((b.author.toLowerCase() < a.author.toLowerCase()) ? -1 : 0));

        return success(res)(result);
    }).catch((err) => {
        return res.status(400).send({error: err.errmsg}).end();
    });

};

const sortCommentsByText = ({params}, res, next) =>
    Filmmodel.findById({_id: params.film_id})
        .populate({path: 'comments', options: {sort: {text: params.dir}}})
        .then(notFound(res))
        .then((film) => film ? film.comments.map((comment) => comment.view(false)) : null)
        .then(success(res))
        .catch(next);


const filterByAuthorName = async ({params}, res, next) => {

    let film = await Filmmodel.findById({_id: params.film_id});

    if (film === null)
        return notFound(res)(null);


    Filmmodel.aggregate([
        {"$match": {"_id": ObjectId(params.film_id)}},
        {
            "$unwind": "$comments"
        },
        {
            $lookup: {
                from: "users",
                localField: "comments.author_id",
                foreignField: "_id",
                as: "author",
            }
        },
        {
            "$unwind": "$author"
        },

        {
            "$match": {
                "author.nick": params.name
            }
        }, {
            "$group": {
                "comments": {
                    "$push": {comment: "$comments", author: "$author.nick"},

                },
                "_id": 1
            }
        }, {
            "$project": {
                "_id": 0,
                "comments": 1,

            }
        }], function (err, result) {


        if (err)
            return res.status(400).send({error: err.errmsg}).end();
        else
            return success(res)(result);


    });
};

const filterByDateBetween = async ({params}, res, next) => {

    let film = await Filmmodel.findById({_id: params.film_id});

    if (film === null)
        return notFound(res)(null);


    Filmmodel.aggregate([
        {"$match": {"_id": ObjectId(params.film_id)}},
        {
            "$unwind": "$comments"
        },
        {
            "$match": {
                "comments.createdAt": {
                    "$gte": new Date(2018, 11, 15),
                    "$lt": new Date(2018, 11, 17)
                }
            }
        }, {
            "$group": {
                "comments": {
                    "$push": {comment: "$comments"},

                },
                "_id": 1
            }
        }, {
            "$project": {
                "_id": 0,
                "comments": 1,

            }
        }], function (err, result) {


        if (err)
            return res.status(400).send({error: err.errmsg}).end();
        else
            return success(res)(result);


    });
};

const filterByTextContains = async ({params}, res, next) => {

    let film = await Filmmodel.findById({_id: params.film_id});

    if (film === null)
        return notFound(res)(null);


    Filmmodel.aggregate([
        {"$match": {"_id": ObjectId(params.film_id)}},
        {
            "$unwind": "$comments"
        },
        {
            "$match": {
                "comments.text": new RegExp(params.text)
            }
        }, {
            "$group": {
                "comments": {
                    "$push": {comment: "$comments"},

                },
                "_id": 1
            }
        }, {
            "$project": {
                "_id": 0,
                "comments": 1,

            }
        }], function (err, result) {


        if (err)
            return res.status(400).send({error: err.errmsg}).end();
        else
            return success(res)(result);


    });
};


module.exports = {
    createComment,
    updateComment,
    destroyComment,
    showAllCommentsSortByCreationDate: sortCommentsByCreationDate,
    showAllSortByAuthorName: sortCommentsByAuthorName,
    showAllSortByText: sortCommentsByText,
    filterByAuthorName,
    filterByDateBetween,
    filterByTextContains
};
