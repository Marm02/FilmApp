const mongoose = require('mongoose');
const {Schema} = require('mongoose');

const thumbnailSchema = new Schema({
    film: {
        type: Schema.ObjectId,
        ref: 'Film'
    }

}, {

    timestamps: true

});


thumbnailSchema.methods = {
    view(full) {
        const view = {
            film: this.user,
            id: this._id,
        };

        return full ? {
            ...view
        } : view;
    }
};

const model = mongoose.model('Thumbnail', thumbnailSchema);

module.exports = {model, thumbnailSchema};