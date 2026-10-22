import { Schema, model } from 'mongoose';

const esquemaMoto = new Schema({
modelo: {
    type: String,
    required: true,
    trim: true
},
marca: {
    type: String,
    required: true,
    trim: true
},
referencia: {
    type: String,
    required: true,

},
cilindraje: {
    type: Number,
    required: true,
    min: 0
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

export default model('Moto', esquemaMoto);
