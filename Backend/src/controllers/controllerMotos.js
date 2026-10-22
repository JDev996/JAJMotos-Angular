import { uploadSingleImage } from '../middleware/upload.js';
import modelMotos from '../models/modelMotos.js';
import fs from 'fs';
import path from 'path';

const controllerMotos = {
    createMoto: async (req, res) => {
        try {
            uploadSingleImage(req, res, async (error) => {
                if (error) {
                    return res.json({
                        resultado: 'mal',
                        mensaje: 'Ocurrio un error al cargar la imagen',
                        datos: null,
                    });
                }

                if (!req.file) {
                    return res.json({
                        resultado: 'mal',
                        mensaje: 'La imagen es obligatoria',
                        datos: null,
                    });
                }

                const newMoto = new modelMotos({
                    modelo: req.body.modelo,
                    marca: req.body.marca,
                    referencia: req.body.referencia,
                    cilindraje: req.body.cilindraje,
                    precio: req.body.precio,
                    stock: req.body.stock,
                    Foto: req.file.filename
                });

                const savedMoto = await newMoto.save();

                res.json({
                    resultado: 'bien',
                    mensaje: 'Moto creada',
                    datos: savedMoto,
                });
            });
        } catch (error) {
            res.json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al crear la moto',
                datos: null,
            });
        }
    },

    readMotoId: async (req, res) => {
        try {
            const motoFound = await modelMotos.findById(req.params.id);

            if (!motoFound) {
                return res.json({
                    resultado: 'mal',
                    mensaje: 'Moto no encontrada',
                    datos: null,
                });
            }

            if (motoFound._id) {
                return res.json({
                    resultado: 'bien',
                    mensaje: 'Moto consultada',
                    datos: motoFound,
                });
            }
        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al consultar la moto por su identificador',
                datos: null,
            });
        }
    },

    readMotos: async (req, res) => {
        try {
            const allMotosFound = await modelMotos.find();
            return res.json({
                resultado: 'bien',
                mensaje: 'Motos consultadas',
                datos: allMotosFound,
            });

        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al consultar las motos',
                datos: null,
            });
        }
    },

    updateMoto: async (req, res) => {
        try {
            const { id } = req.params;

            const motoExistente = await modelMotos.findById(id);

            if (!motoExistente) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }

                return res.json({
                    resultado: 'mal',
                    mensaje: 'Moto no encontrada',
                    datos: null,
                });
            }

            if (req.file) {
                if (motoExistente.Foto) {
                    const rutaImagenAntigua = path.join('imagenes', motoExistente.Foto);

                    if (fs.existsSync(rutaImagenAntigua)) {
                        fs.unlinkSync(rutaImagenAntigua);
                    }
                }
            }

            const nuevosDatos = {
                modelo: req.body.modelo,
                marca: req.body.marca,
                referencia: req.body.referencia,
                cilindraje: req.body.cilindraje,
                precio: req.body.precio,
                stock: req.body.stock,
                Foto: req.file ? req.file.filename : motoExistente.Foto,
            };

            const motoActualizada = await modelMotos.findByIdAndUpdate(
                id,
                nuevosDatos,
                { new: true }
            );

            return res.json({
                resultado: 'bien',
                mensaje: 'Moto actualizada correctamente',
                datos: motoActualizada,
            });

        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al actualizar la moto',
                datos: null,
            });
        }
    },

    deleteMoto: async (req, res) => {
        try {
            const motoToDelete = await modelMotos.findByIdAndDelete(
                req.params.id
            );

            if (!motoToDelete) {
                return res.json({
                    resultado: 'mal',
                    mensaje: 'Moto no encontrada para eliminar',
                    datos: null,
                });
            }

            if (motoToDelete.Foto) {
                const rutaImagen = path.join('imagenes', motoToDelete.Foto);

                if (fs.existsSync(rutaImagen)) {
                    fs.unlinkSync(rutaImagen);
                }
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Moto eliminada correctamente',
                datos: null,
            });

        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al eliminar la moto',
                datos: null,
            });
        }
    },

}

export default controllerMotos;