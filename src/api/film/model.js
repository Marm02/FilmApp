const mongoose = require('mongoose');
const {Schema} = require('mongoose');

const Comment = require('../comment/model').commentSchema;
const Thumbnail = require('../thumbnail/model').thumbnailSchema;

const filmSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    author: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    description: {
        type: String,
        required: true
    },
    thumbnail: Thumbnail,
    meta: {
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        dislikes: {
            type: Number,
            default: 0
        }
    },
    comments: [Comment]

}, {
    timestamps: true,
});


filmSchema.methods = {
    view(full) {
        const view = {
            author: this.author,
            title: this.title,
            description: this.description,
            comments: this.comments,
            views: this.meta.views,
            thumbsUp: this.meta.likes,
            thumbsDown: this.meta.dislikes,
            thumbnail: this.thumbnail

        };

        return full ? {
            ...view,
            id: this._id,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        } : view;
    }
};

const model = mongoose.model('Film', filmSchema);

module.exports = {model, filmSchema};