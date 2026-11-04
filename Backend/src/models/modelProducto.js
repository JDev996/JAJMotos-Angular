import { Schema, model } from 'mongoose';

const esquemaProducto = new Schema({
    modelo: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    precio: { type: Number, required: true, min: 0 },
    color: { type: String, required: true, trim: true },
    categoria: { type: String, required: true, trim: true },
    imagen: { type: String, required: true, trim: true }
}, {
    timestamps: true
});

export default model('Producto', esquemaProducto);
