const mongoose = require("mongoose");

const {Schema} = require("mongoose");

const commentSchema = new Schema({

        film_id: {
            type: Schema.ObjectId,
            ref: "Film",
            required: true
        },
        author_id: {
            type: Schema.ObjectId,
            ref: "User",
            required: true
        },
        author_nick: {
            type: "String"
        },
        text: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    });


commentSchema.methods = {
    view(full) {
        const view = {
            id: this._id,
            author_id: this.author_id,
            text: this.text,
            createdAt: this.createdAt
        };

        return full ? {
            ...view,
            film_id: this.film_id,
            updatedAt: this.updatedAt
        } : view;
    }
};

const model = mongoose.model('Comment', commentSchema);

module.exports = {model, commentSchema};