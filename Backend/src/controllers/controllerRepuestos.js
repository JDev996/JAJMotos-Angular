import { uploadSingleImage } from '../middleware/upload.js';
import modelRepuestos from '../models/modelRepuestos.js';
import fs from 'fs';
import path from 'path';

const controllerRepuestos = {
    createRepuesto: async (req, res) => {
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

                const newRepuesto = new modelRepuestos({
                    marca: req.body.marca,
                    referencia: req.body.referencia,
                    precio: req.body.precio,
                    stock: req.body.stock,
                    foto: req.file.filename
                });

                const savedRepuesto = await newRepuesto.save();

                res.json({
                    resultado: 'bien',
                    mensaje: 'Repuesto creado',
                    datos: savedRepuesto,
                });
            });
        } catch (error) {
            res.json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al crear el repuesto',
                datos: null,
            });
        }
    },

    readRepuestoId: async (req, res) => {
        try {
            const repuestoFound = await modelRepuestos.findById(req.params.id);

            if (!repuestoFound) {
                return res.json({
                    resultado: 'mal',
                    mensaje: 'Repuesto no encontrado',
                    datos: null,
                });
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Repuesto consultado',
                datos: repuestoFound,
            });
        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al consultar el repuesto por su identificador',
                datos: null,
            });
        }
    },

    readRepuestos: async (req, res) => {
        try {
            const allRepuestosFound = await modelRepuestos.find();
            return res.json({
                resultado: 'bien',
                mensaje: 'Repuestos consultados',
                datos: allRepuestosFound,
            });

        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al consultar los repuestos',
                datos: null,
            });
        }
    },

    updateRepuesto: async (req, res) => {
        try {
            const { id } = req.params;

            const repuestoExistente = await modelRepuestos.findById(id);

            if (!repuestoExistente) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }

                return res.json({
                    resultado: 'mal',
                    mensaje: 'Repuesto no encontrado',
                    datos: null,
                });
            }

            if (req.file && repuestoExistente.Foto) {
                const rutaImagenAntigua = path.join('imagenes', repuestoExistente.Foto);

                if (fs.existsSync(rutaImagenAntigua)) {
                    fs.unlinkSync(rutaImagenAntigua);
                }
            }

            const nuevosDatos = {
                marca: req.body.marca,
                referencia: req.body.referencia,
                precio: req.body.precio,
                stock: req.body.stock,
                imagen: req.file ? req.file.filename : repuestoExistente.Foto,
            };

            const repuestoActualizado = await modelRepuestos.findByIdAndUpdate(
                id,
                nuevosDatos,
                { new: true, runValidators: true }
            );

            return res.json({
                resultado: 'bien',
                mensaje: 'Repuesto actualizado correctamente',
                datos: repuestoActualizado,
            });

        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al actualizar el repuesto',
                datos: null,
            });
        }
    },

    deleteRepuesto: async (req, res) => {
        try {
            const repuestoToDelete = await modelRepuestos.findByIdAndDelete(
                req.params.id
            );

            if (!repuestoToDelete) {
                return res.json({
                    resultado: 'mal',
                    mensaje: 'Repuesto no encontrado para eliminar',
                    datos: null,
                });
            }

            if (repuestoToDelete.Foto) {
                const rutaImagen = path.join('imagenes', repuestoToDelete.Foto);

                if (fs.existsSync(rutaImagen)) {
                    fs.unlinkSync(rutaImagen);
                }
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Repuesto eliminado correctamente',
                datos: null,
            });

        } catch (error) {
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al eliminar el repuesto',
                datos: null,
            });
        }
    },

}

export default controllerRepuestos;