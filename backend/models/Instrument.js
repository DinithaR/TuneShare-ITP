import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const instrumentSchema = new mongoose.Schema({
    owner: {type: ObjectId, ref: 'User'},
    brand: {type: String, required: true},
    model: {type: String, required: true},
    image: {type: String, required: true},
    // New: Support multiple images (up to 5). First image will be stored in `image` for backward compatibility
    images: {type: [String], default: []},
    category: {type: String, required: true},
    pricePerDay: {type: Number, required: true},
    location: {type: String, required: true},
    description: {type: String, required: true},
    isAvailable: {type: Boolean, default: true}
},{timestamps: true})

const Instrument = mongoose.model('Instrument', instrumentSchema)

export default Instrument