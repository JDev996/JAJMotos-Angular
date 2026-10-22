import { uploadSingleImage } from '../middleware/upload.js';
import modelAccesorios from '../models/modelAccesorios.js';
import fs from 'fs';
import path from 'path';

const controllerAccesorios = {
    createAccesorio: async (req, res) => {
        try {
            uploadSingleImage(req, res, async (error) => {
                if (error) {
                    return res.json({
                        result: 'mistake',
                        message: 'Ocurrio un error al cargar la imagen',
                        data: error,
                    });
                }

                if (!req.file) {
                    return res.json({
                        result: 'mistake',
                        message: 'La imagen es obligatoria',
                        data: null,
                    });
                }

                const newAccesorio = new modelAccesorios({
                    marca: req.body.marca,
                    referencia: req.body.referencia,
                    precio: req.body.precio,
                    stock: req.body.stock,
                    Foto: req.file.filename
                });

                const savedAccesorio = await newAccesorio.save();

                res.json({
                    result: 'fine',
                    message: 'Accesorio creado',
                    data: savedAccesorio,
                });
            });
        } catch (error) {
            res.json({
                result: 'mistake',
                message: 'An error occurred creating the accesorio',
                data: error,
            });
        }
    },

    readAccesorioId: async (req, res) => {
        try {
            const accesorioFound = await modelAccesorios.findById(req.params.id);

            if (!accesorioFound) {
                return res.json({
                    result: 'mistake',
                    message: 'Accesorio no encontrado',
                    data: null,
                });
            }

            return res.json({
                result: 'fine',
                message: 'Accesorio consultado',
                data: accesorioFound,
            });
        } catch (error) {
            res.json({
                result: 'mistake',
                message: 'Ocurrio un error al consultar el accesorio por su identificador',
                data: error,
            });
        }
    },

    readAccesorios: async (req, res) => {
        try {
            const allAccesoriosFound = await modelAccesorios.find();
            res.json({
                result: 'fine',
                message: 'Accesorios consultados',
                data: allAccesoriosFound,
            });

        } catch (error) {
            res.json({
                result: 'mistake',
                message: 'Ocurrio un error al consultar los accesorios',
                data: error,
            });
        }
    },

    updateAccesorio: async (req, res) => {
        try {
            const { id } = req.params;
            const accesorioExistente = await modelAccesorios.findById(id);

            if (!accesorioExistente) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }

                return res.json({
                    result: 'mistake',
                    message: 'Accesorio no encontrado',
                    data: null,
                });
            }

            if (req.file && accesorioExistente.Foto) {
                const rutaImagenAntigua = path.join('imagenes', accesorioExistente.Foto);

                if (fs.existsSync(rutaImagenAntigua)) {
                    fs.unlinkSync(rutaImagenAntigua);
                }
            }

            const nuevosDatos = {
                marca: req.body.marca,
                referencia: req.body.referencia,
                precio: req.body.precio,
                stock: req.body.stock,
                Foto: req.file ? req.file.filename : accesorioExistente.Foto,
            };

            const accesorioActualizado = await modelAccesorios.findByIdAndUpdate(
                id,
                nuevosDatos,
                { new: true, runValidators: true }
            );

            return res.json({
                result: 'fine',
                message: 'Accesorio actualizado correctamente',
                data: accesorioActualizado,
            });

        } catch (error) {
            res.json({
                result: 'mistake',
                message: 'Ocurrio un error al actualizar el accesorio',
                data: error.message || error,
            });
        }
    },

    deleteAccesorio: async (req, res) => {
        try {
            const accesorioToDelete = await modelAccesorios.findByIdAndDelete(
                req.params.id
            );

            if (!accesorioToDelete) {
                return res.json({
                    result: 'mistake',
                    message: 'Accesorio no encontrado para eliminar',
                    data: null,
                });
            }

            if (accesorioToDelete.Foto) {
                const rutaImagen = path.join('imagenes', accesorioToDelete.Foto);

                if (fs.existsSync(rutaImagen)) {
                    fs.unlinkSync(rutaImagen);
                }
            }

            return res.json({
                result: 'fine',
                message: 'Accesorio eliminado correctamente',
                data: null,
            });

        } catch (error) {
            res.json({
                result: 'mistake',
                message: 'Ocurrio un error al eliminar el accesorio',
                data: error.message || error,
            });
        }
    },

};

export default controllerAccesorios;