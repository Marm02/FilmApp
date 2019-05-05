const mongoose = require('mongoose');
const {Schema} = require('mongoose');

const Film = require('../film/model').model;

const playlistSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    author: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    films: [
        {
            type: Schema.ObjectId,
            ref: "Film"
        }],

    isPublic: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});

playlistSchema.methods = {
    view(full) {
        const view = {
            title: this.title,
            author: this.author,
            films: this.films,
        };

        return full ? {
            ...view,
            id: this._id,
            isPublic: this.isPublic,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        } : view;
    }
};

const model = mongoose.model('Playlist', playlistSchema);

module.exports = {model, playlistSchema};