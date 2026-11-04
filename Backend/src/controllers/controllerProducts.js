import fs from 'fs';
import path from 'path';
import modelProducto from '../models/modelProducto.js';

const controllerProducts = {
    createProduct: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ result: 'mistake', message: 'La imagen es obligatoria', data: null });
            }
            const product = await modelProducto.create({
                modelo: req.body.modelo,
                descripcion: req.body.descripcion,
                precio: req.body.precio,
                color: req.body.color,
                imagen: req.file.filename,
            });
            return res.json({ result: 'fine', message: 'Producto creado', data: product });
        } catch (error) {
            return res.status(400).json({ result: 'mistake', message: 'Error al crear producto', data: error.message });
        }
    },

    readProducts: async (req, res) => {
        try {
            const products = await modelProducto.find();
            return res.json({ result: 'fine', message: 'Productos consultados', data: products });
        } catch (error) {
            return res.status(500).json({ result: 'mistake', message: 'Error al consultar productos', data: error.message });
        }
    },

    updateProduct: async (req, res) => {
        try {
            const existing = await modelProducto.findById(req.params.id);
            if (!existing) {
                return res.status(404).json({ result: 'mistake', message: 'Producto no encontrado', data: null });
            }
            const updates = {
                modelo: req.body.modelo,
                descripcion: req.body.descripcion,
                precio: req.body.precio,
                color: req.body.color,
                imagen: req.file ? req.file.filename : existing.imagen,
            };
            const updated = await modelProducto.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
            if (req.file && existing.imagen) {
                const oldPath = path.join('imagenes', existing.imagen);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            return res.json({ result: 'fine', message: 'Producto actualizado', data: updated });
        } catch (error) {
            return res.status(400).json({ result: 'mistake', message: 'Error al actualizar producto', data: error.message });
        }
    },

    deleteProduct: async (req, res) => {
        try {
            const deleted = await modelProducto.findByIdAndDelete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ result: 'mistake', message: 'Producto no encontrado', data: null });
            }
            if (deleted.imagen) {
                const imagePath = path.join('imagenes', deleted.imagen);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }
            return res.json({ result: 'fine', message: 'Producto eliminado', data: null });
        } catch (error) {
            return res.status(500).json({ result: 'mistake', message: 'Error al eliminar producto', data: error.message });
        }
    }
};

export default controllerProducts;
