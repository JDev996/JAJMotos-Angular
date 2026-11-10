import { Schema, model } from 'mongoose';

const esquemaMensajeContacto = new Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    asunto: {
        type: String,
        required: true,
        trim: true
    },
    mensaje: {
        type: String,
        required: true,
        trim: true
    },
    estado: {
        type: String,
        enum: ['pendiente', 'respondido'],
        default: 'pendiente'
    },
    respuesta: {
        type: String,
        trim: true,
        default: ''
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

export default model('MensajeContacto', esquemaMensajeContacto);
