const mongoose = require('mongoose');
const mongooseHidden = require('mongoose-hidden');
const mongooseDelete = require('mongoose-delete');
const paginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

/** @class */
let UserSchema = new Schema({
	email: { type: String, required: true },
	name: { type: String, required: true },
	password: { type: String, rquired: false }
}, { timestamps: true });

UserSchema.plugin(mongooseHidden({ defaultHidden: { _v: true, password: true } }));
UserSchema.plugin(paginate);

module.exports = mongoose.model('User', UserSchema);