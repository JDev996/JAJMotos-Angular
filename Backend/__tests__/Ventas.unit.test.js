import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 1. Simulamos el modelo de Mongoose (soporta "new modelVentas()" y los métodos estáticos)
const mockSave = jest.fn();
const mockModelVentas = jest.fn().mockImplementation((datos) => ({
    ...datos,
    save: mockSave,
}));
mockModelVentas.find = jest.fn();
mockModelVentas.findById = jest.fn();
mockModelVentas.findByIdAndUpdate = jest.fn();
mockModelVentas.findByIdAndDelete = jest.fn();

jest.unstable_mockModule('../src/models/modelVentas.js', () => ({
    default: mockModelVentas,
}));

// 2. Importamos dinámicamente (después del mock)
const { default: modelVentas } = await import('../src/models/modelVentas.js');
const { default: controllerVentas } = await import('../src/controllers/controllerVentas.js');

describe('PRUEBA UNITARIA: controllerVentas (JAJ Motos)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: createVenta (try)
    test('createVenta debe crear la venta', async () => {
        // ARRANGE
        const datosVenta = { fecha: '2026-11-24', total: 12500000, mes: 'noviembre' };
        const ventaGuardada = { _id: 'v1', ...datosVenta };
        mockSave.mockResolvedValue(ventaGuardada);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.createVenta({ body: datosVenta }, res);
        // ASSERT
        expect(modelVentas).toHaveBeenCalledWith(datosVenta);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Venta creada satisfactoriamente',
            datos: ventaGuardada,
        });
    });

    // Prueba 2: createVenta (catch)
    test('createVenta debe responder con error si falla al guardar', async () => {
        // ARRANGE
        const errorSimulado = new Error('total es obligatorio');
        mockSave.mockRejectedValue(errorSimulado);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.createVenta({ body: {} }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Ocurrio un error creando la Venta',
            datos: errorSimulado,
        });
    });

    // Prueba 3: readVentas (try)
    test('readVentas debe devolver todas las ventas', async () => {
        // ARRANGE
        const ventasFalsas = [
            { _id: '1', fecha: '2026-10-01', total: 8000000, mes: 'octubre' },
            { _id: '2', fecha: '2026-11-01', total: 12500000, mes: 'noviembre' },
        ];
        modelVentas.find.mockResolvedValue(ventasFalsas);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.readVentas({}, res);
        // ASSERT
        expect(modelVentas.find).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Ventas encontradas satisfactoriamente',
            datos: ventasFalsas,
        });
    });

    // Prueba 4: readVentas (catch)
    test('readVentas debe responder con error si falla la BD', async () => {
        // ARRANGE
        const errorSimulado = new Error('Fallo de conexion a Mongo');
        modelVentas.find.mockRejectedValue(errorSimulado);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.readVentas({}, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Ocurrio un error encontrando las Ventas',
            datos: errorSimulado,
        });
    });

    // Prueba 5: readVenta (try)
    test('readVenta debe devolver la venta buscada', async () => {
        // ARRANGE
        const venta = { _id: 'v1', total: 12500000, mes: 'noviembre' };
        modelVentas.findById.mockResolvedValue(venta);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.readVenta({ params: { id: 'v1' } }, res);
        // ASSERT
        expect(modelVentas.findById).toHaveBeenCalledWith('v1');
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Venta encontrada satisfactoriamente',
            datos: venta,
        });
    });

    // Prueba 6: readVenta no encontrada
    test('readVenta debe avisar si la venta no existe', async () => {
        // ARRANGE
        modelVentas.findById.mockResolvedValue(null);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.readVenta({ params: { id: 'noexiste' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Venta no encontrada',
            datos: null,
        });
    });

    // Prueba 7: readVenta (catch)
    test('readVenta debe responder con error si falla la BD', async () => {
        // ARRANGE
        const errorSimulado = new Error('Fallo leyendo la venta');
        modelVentas.findById.mockRejectedValue(errorSimulado);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.readVenta({ params: { id: 'v1' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Ocurrio un error encontrando la Venta',
            datos: errorSimulado,
        });
    });

    // Prueba 8: updateVenta (try)
    test('updateVenta debe actualizar la venta', async () => {
        // ARRANGE
        const cambios = { fecha: '2026-11-24', total: 13000000, mes: 'noviembre' };
        const ventaActualizada = { _id: 'v1', ...cambios };
        modelVentas.findById.mockResolvedValue({ _id: 'v1', total: 12500000 });
        modelVentas.findByIdAndUpdate.mockResolvedValue(ventaActualizada);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.updateVenta({ params: { id: 'v1' }, body: cambios }, res);
        // ASSERT
        expect(modelVentas.findByIdAndUpdate).toHaveBeenCalledWith('v1', cambios, { new: true, runValidators: true });
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Venta actualizada',
            datos: ventaActualizada,
        });
    });

    // Prueba 9: updateVenta no encontrada
    test('updateVenta debe avisar si la venta no existe', async () => {
        // ARRANGE
        modelVentas.findById.mockResolvedValue(null);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.updateVenta({ params: { id: 'noexiste' }, body: {} }, res);
        // ASSERT
        expect(modelVentas.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Venta no encontrada',
            datos: null,
        });
    });

    // Prueba 10: updateVenta (catch)
    test('updateVenta debe responder con error si falla la BD', async () => {
        // ARRANGE
        const errorSimulado = new Error('Fallo actualizando');
        modelVentas.findById.mockRejectedValue(errorSimulado);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.updateVenta({ params: { id: 'v1' }, body: {} }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Error al actualizar la Venta',
            datos: errorSimulado,
        });
    });

    // Prueba 11: deleteVenta (try)
    test('deleteVenta debe eliminar la venta', async () => {
        // ARRANGE
        modelVentas.findByIdAndDelete.mockResolvedValue({ _id: 'v1' });
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.deleteVenta({ params: { id: 'v1' } }, res);
        // ASSERT
        expect(modelVentas.findByIdAndDelete).toHaveBeenCalledWith('v1');
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Venta eliminada correctamente',
            datos: null,
        });
    });

    // Prueba 12: deleteVenta no encontrada
    test('deleteVenta debe avisar si la venta no existe', async () => {
        // ARRANGE
        modelVentas.findByIdAndDelete.mockResolvedValue(null);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.deleteVenta({ params: { id: 'nada' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Venta no encontrada para eliminar',
            datos: null,
        });
    });

    // Prueba 13: deleteVenta (catch)
    test('deleteVenta debe responder con error si falla la BD', async () => {
        // ARRANGE
        const errorSimulado = new Error('Fallo eliminando');
        modelVentas.findByIdAndDelete.mockRejectedValue(errorSimulado);
        const res = { json: jest.fn() };
        // ACT
        await controllerVentas.deleteVenta({ params: { id: 'v1' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Error al eliminar la Venta',
            datos: errorSimulado,
        });
    });
});