import { Schema, model } from 'mongoose';

const esquemaRepuesto = new Schema({
marca: {
    type: String,
    required: true,
    trim: true
},
referencia: {
    type: String,
    required: true,
    trim: true
},
precio: {
    type: Number,
    required: true,
    min: 0
},
stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
},
Foto: {
    type: String,
    required: true,
    trim: true
}
}, {
timestamps: true
});

export default model('Repuesto', esquemaRepuesto);