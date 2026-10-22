import { Schema, model } from 'mongoose';

const esquemaVenta = new Schema({
    fecha: {
        type: Date,
        required: true,
        default: Date.now
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    mes: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

export default model('Venta', esquemaVenta);