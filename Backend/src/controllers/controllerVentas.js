import modelVentas from '../models/modelVentas.js';

const controllerVentas = {

    createVenta: async (req, res) => {
        try {
            const newVenta = new modelVentas({
                fecha: req.body.fecha,
                total: req.body.total,
                mes: req.body.mes,
            });

            const savedVenta = await newVenta.save();

            return res.json({
                mensaje: 'Venta creada satisfactoriamente',
                datos: savedVenta,
            });
        } catch (error) {
            return res.json({
                mensaje: 'Ocurrio un error creando la Venta',
                datos: error,
            });
        }
    },

    readVenta: async (req, res) => {
        try {
            const ventaFound = await modelVentas.findById(req.params.id);

            if (!ventaFound) {
                return res.json({
                    mensaje: 'Venta no encontrada',
                    datos: null,
                });
            }

            return res.json({
                mensaje: 'Venta encontrada satisfactoriamente',
                datos: ventaFound,
            });
        } catch (error) {
            return res.json({
                mensaje: 'Ocurrio un error encontrando la Venta',
                datos: error,
            });
        }
    },

    readVentas: async (req, res) => {
        try {
            const ventas = await modelVentas.find();
            return res.json({
                mensaje: 'Ventas encontradas satisfactoriamente',
                datos: ventas,
            });
        } catch (error) {
            return res.json({
                mensaje: 'Ocurrio un error encontrando las Ventas',
                datos: error,
            });
        }
    },

    updateVenta: async (req, res) => {
        try {
            const ventaExistente = await modelVentas.findById(req.params.id);

            if (!ventaExistente) {
                return res.json({
                    mensaje: 'Venta no encontrada',
                    datos: null,
                });
            }

            const nuevosDatos = {
                fecha: req.body.fecha,
                total: req.body.total,
                mes: req.body.mes,
            };

            const ventaUpdate = await modelVentas.findByIdAndUpdate(
                req.params.id,
                nuevosDatos,
                { new: true, runValidators: true }
            );

            return res.json({
                mensaje: 'Venta actualizada',
                datos: ventaUpdate,
            });

        } catch (error) {
            return res.json({
                mensaje: 'Error al actualizar la Venta',
                datos: error,
            });
        }
    },

    deleteVenta: async (req, res) => {
        try {
            const ventaToDelete = await modelVentas.findByIdAndDelete(
                req.params.id
            );

            if (!ventaToDelete) {
                return res.json({
                    mensaje: 'Venta no encontrada para eliminar',
                    datos: null,
                });
            }

            return res.json({
                mensaje: 'Venta eliminada correctamente',
                datos: null,
            });

        } catch (error) {
            return res.json({
                mensaje: 'Error al eliminar la Venta',
                datos: error,
            });
        }
    },

}

export default controllerVentas;