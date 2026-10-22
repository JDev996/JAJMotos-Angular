import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const bcryptHashPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const esquemaUsuario = new Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    apellido: {
        type: String,
        required: true,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    edad: {
        type: Number,
        required: true
    },
    rol: {
        type: String,
        enum: ['admin', 'usuario'],
        default: 'usuario'
    },
    password: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                if (bcryptHashPattern.test(v)) return true;
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%?&*])[A-Za-z\d$@$!%?&*]{8,15}$/.test(v);
            },
            message: 'La contraseña debe tener 8-15 caracteres, una mayúscula, una minúscula, un número y un carácter especial'
        }
    },
    Foto: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

esquemaUsuario.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    if (bcryptHashPattern.test(this.password)) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

export default model('Usuario', esquemaUsuario);