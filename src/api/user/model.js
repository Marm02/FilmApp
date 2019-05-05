const bcrypt = require('bcrypt');

const mongoose = require('mongoose');
const roles = ['user', 'admin'];

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        match: /^\S+@\S+\.\S+$/,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    nick: {
        type: String,
        trim: true,
        required: true
    },
    role: {
        type: String,
        enum: roles,
        default: 'user'
    },
    meta: {
        liked: [{
            type: Schema.ObjectId,
            ref: "Film"
        }]
        ,
        disliked: [
            {
                type: Schema.ObjectId,
                ref: "Film"
            }
        ]
    }
    ,
    films: [{type: Schema.ObjectId, ref: "Film"}]
    ,
    playlists: [{type: Schema.ObjectId, ref: "Playlist"}]
    ,
    comments: [{type: Schema.ObjectId, ref: "Comment"}],

    resetPasswordToken: String,

    resetPasswordExpires: Date

}, {
    timestamps: true
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password'))
        return next();

    const rounds = 9;

    bcrypt.hash(this.password, rounds).then((hash) => {
        this.password = hash;
        next();
    }).catch(next);

});


userSchema.methods = {
    view(full) {
        let view = {};
        let fields = ['id', 'nick', 'films', 'playlists', 'comments', 'meta', 'meta'];

        if (full) {
            fields = [...fields, 'role', 'email'];
        }

        fields.forEach((field) => {
            view[field] = this[field]
        });

        return view;
    },

    authenticate(password) {
        return bcrypt.compare(password, this.password).then((valid) => valid ? this : false);
    }
};

userSchema.statics = {
    roles
};

const model = mongoose.model('User', userSchema);

module.exports = {model, userSchema};