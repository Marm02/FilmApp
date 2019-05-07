const mongoose = require('mongoose');
const {Schema} = require('mongoose');

const thumbnailSchema = new Schema({
    small: {
        type: Schema.ObjectId
    },
    poster: {
    type: Schema.ObjectId
    },
    preview: {
        type:Schema.ObjectId
    }


}, {

    //timestamps: true

});


thumbnailSchema.methods = {
    view(full) {
        const view = {
            small: this.small,
            poster: this.poster,
            preview: this.preview,
            id: this._id,
        };

        return full ? {
            ...view
        } : view;
    }
};

const model = mongoose.model('Thumbnail', thumbnailSchema);

module.exports = {model, thumbnailSchema};