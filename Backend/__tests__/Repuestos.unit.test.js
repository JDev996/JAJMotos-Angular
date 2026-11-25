import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 1. Simulamos Multer: uploadSingleImage ejecuta el callback sin exigir un archivo real
jest.unstable_mockModule('../src/middleware/upload.js', () => ({
    uploadSingleImage: jest.fn((req, res, callback) => callback(null)),
    uploadImage: jest.fn(),
    uploadProductImage: jest.fn(),
}));

// 2. Simulamos el modelo de Mongoose (soporta "new modelRepuestos()" y los métodos estáticos)
const mockSave = jest.fn();
const mockModelRepuestos = jest.fn().mockImplementation((datos) => ({
    ...datos,
    save: mockSave,
}));
mockModelRepuestos.find = jest.fn();
mockModelRepuestos.findById = jest.fn();
mockModelRepuestos.findByIdAndUpdate = jest.fn();
mockModelRepuestos.findByIdAndDelete = jest.fn();

jest.unstable_mockModule('../src/models/modelRepuestos.js', () => ({
    default: mockModelRepuestos,
}));

// 3. Simulamos fs para no borrar imágenes reales del disco
const mockExistsSync = jest.fn();
const mockUnlinkSync = jest.fn();
jest.unstable_mockModule('fs', () => ({
    default: { existsSync: mockExistsSync, unlinkSync: mockUnlinkSync },
    existsSync: mockExistsSync,
    unlinkSync: mockUnlinkSync,
}));

// 4. Importamos dinámicamente todo (después de los mocks)
const { uploadSingleImage } = await import('../src/middleware/upload.js');
const { default: modelRepuestos } = await import('../src/models/modelRepuestos.js');
const { default: controllerRepuestos } = await import('../src/controllers/controllerRepuestos.js');

// Respuesta falsa: algunos catch usan res.status(500).json(...), por eso status devuelve el mismo res
const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('PRUEBA UNITARIA: controllerRepuestos (JAJ Motos)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: readRepuestos (try)
    test('readRepuestos debe responder "bien" con la lista de repuestos', async () => {
        // ARRANGE
        const repuestosFalsos = [
            { _id: '1', marca: 'NGK', referencia: 'CR7HSA', precio: 18000, stock: 40, Foto: 'bujia.jpg' },
            { _id: '2', marca: 'Brembo', referencia: 'PST-07', precio: 65000, stock: 12, Foto: 'pastillas.jpg' },
        ];
        modelRepuestos.find.mockResolvedValue(repuestosFalsos);
        const res = crearRes();
        // ACT
        await controllerRepuestos.readRepuestos({}, res);
        // ASSERT
        expect(modelRepuestos.find).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'bien',
            mensaje: 'Repuestos consultados',
            datos: repuestosFalsos,
        });
    });

    // Prueba 2: readRepuestos (catch)
    test('readRepuestos debe responder 500 y "mal" si falla la BD', async () => {
        // ARRANGE
        modelRepuestos.find.mockRejectedValue(new Error('Fallo de conexion a Mongo'));
        const res = crearRes();
        // ACT
        await controllerRepuestos.readRepuestos({}, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Ocurrio un error al consultar los repuestos',
            datos: null,
        });
    });

    // Prueba 3: readRepuestoId (try)
    test('readRepuestoId debe devolver el repuesto buscado', async () => {
        // ARRANGE
        const repuesto = { _id: 'id123', marca: 'NGK', referencia: 'CR7HSA', precio: 18000 };
        modelRepuestos.findById.mockResolvedValue(repuesto);
        const res = crearRes();
        // ACT
        await controllerRepuestos.readRepuestoId({ params: { id: 'id123' } }, res);
        // ASSERT
        expect(modelRepuestos.findById).toHaveBeenCalledWith('id123');
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'bien',
            mensaje: 'Repuesto consultado',
            datos: repuesto,
        });
    });

    // Prueba 4: readRepuestoId no encontrado
    test('readRepuestoId debe responder "mal" si no existe', async () => {
        // ARRANGE
        modelRepuestos.findById.mockResolvedValue(null);
        const res = crearRes();
        // ACT
        await controllerRepuestos.readRepuestoId({ params: { id: 'noexiste' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Repuesto no encontrado',
            datos: null,
        });
    });

    // Prueba 5: readRepuestoId (catch)
    test('readRepuestoId debe responder 500 si falla la BD', async () => {
        // ARRANGE
        modelRepuestos.findById.mockRejectedValue(new Error('Fallo leyendo'));
        const res = crearRes();
        // ACT
        await controllerRepuestos.readRepuestoId({ params: { id: 'id1' } }, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Ocurrio un error al consultar el repuesto por su identificador',
            datos: null,
        });
    });

    // Prueba 6: createRepuesto (try)
    test('createRepuesto debe crear el repuesto y responder "bien"', async () => {
        // ARRANGE
        const datosNuevos = { marca: 'DID', referencia: '428H-120', precio: 95000, stock: 8 };
        const repuestoGuardado = { _id: 'r1', ...datosNuevos, Foto: 'cadena.jpg' };
        mockSave.mockResolvedValue(repuestoGuardado);
        const req = { body: datosNuevos, file: { filename: 'cadena.jpg' } };
        const res = crearRes();
        // ACT
        await controllerRepuestos.createRepuesto(req, res);
        // ASSERT
        expect(uploadSingleImage).toHaveBeenCalledTimes(1);
        expect(modelRepuestos).toHaveBeenCalledWith({ ...datosNuevos, Foto: 'cadena.jpg' });
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'bien',
            mensaje: 'Repuesto creado',
            datos: repuestoGuardado,
        });
    });

    // Prueba 7: createRepuesto sin imagen
    test('createRepuesto debe responder "mal" si no llega la imagen', async () => {
        // ARRANGE
        const res = crearRes();
        // ACT
        await controllerRepuestos.createRepuesto({ body: { marca: 'NGK' } }, res);
        // ASSERT
        expect(mockSave).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'La imagen es obligatoria',
            datos: null,
        });
    });

    // Prueba 8: createRepuesto error al subir la imagen
    test('createRepuesto debe responder "mal" si falla la subida de la imagen', async () => {
        // ARRANGE
        uploadSingleImage.mockImplementationOnce((req, res, callback) => {
            callback('Archivo demasiado pesado');
        });
        const res = crearRes();
        // ACT
        await controllerRepuestos.createRepuesto({ body: {}, file: { filename: 'x.jpg' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Ocurrio un error al cargar la imagen',
            datos: null,
        });
    });

    // Prueba 9: createRepuesto (catch)
    test('createRepuesto debe responder "mal" si ocurre un error inesperado', async () => {
        // ARRANGE
        uploadSingleImage.mockImplementationOnce(() => {
            throw new Error('fallo al procesar la peticion');
        });
        const res = crearRes();
        // ACT
        await controllerRepuestos.createRepuesto({ body: {} }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Ocurrio un error al crear el repuesto',
            datos: null,
        });
    });

    // Prueba 10: updateRepuesto sin imagen nueva
    test('updateRepuesto debe actualizar y conservar la foto anterior', async () => {
        // ARRANGE
        const cambios = { marca: 'NGK', referencia: 'CR8E', precio: 21000, stock: 30 };
        const repuestoActualizado = { _id: 'abc', ...cambios, Foto: 'bujia.jpg' };
        modelRepuestos.findById.mockResolvedValue({ _id: 'abc', Foto: 'bujia.jpg' });
        modelRepuestos.findByIdAndUpdate.mockResolvedValue(repuestoActualizado);
        const res = crearRes();
        // ACT
        await controllerRepuestos.updateRepuesto({ params: { id: 'abc' }, body: cambios }, res);
        // ASSERT
        expect(modelRepuestos.findByIdAndUpdate).toHaveBeenCalledWith(
            'abc',
            { ...cambios, Foto: 'bujia.jpg' },
            { new: true, runValidators: true }
        );
        expect(mockUnlinkSync).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'bien',
            mensaje: 'Repuesto actualizado correctamente',
            datos: repuestoActualizado,
        });
    });

    // Prueba 11: updateRepuesto con imagen nueva
    test('updateRepuesto con imagen nueva debe borrar la foto anterior', async () => {
        // ARRANGE
        modelRepuestos.findById.mockResolvedValue({ _id: 'abc', Foto: 'vieja.jpg' });
        modelRepuestos.findByIdAndUpdate.mockResolvedValue({ _id: 'abc', Foto: 'nueva.jpg' });
        mockExistsSync.mockReturnValue(true);
        const req = { params: { id: 'abc' }, body: {}, file: { filename: 'nueva.jpg' } };
        const res = crearRes();
        // ACT
        await controllerRepuestos.updateRepuesto(req, res);
        // ASSERT
        expect(modelRepuestos.findByIdAndUpdate.mock.calls[0][1].Foto).toBe('nueva.jpg');
        expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
        expect(res.json.mock.calls[0][0].resultado).toBe('bien');
    });

    // Prueba 12: updateRepuesto no encontrado
    test('updateRepuesto debe responder "mal" si no existe y borrar la imagen subida', async () => {
        // ARRANGE
        modelRepuestos.findById.mockResolvedValue(null);
        const req = { params: { id: 'noexiste' }, body: {}, file: { filename: 'tmp.jpg', path: 'imagenes/tmp.jpg' } };
        const res = crearRes();
        // ACT
        await controllerRepuestos.updateRepuesto(req, res);
        // ASSERT
        expect(mockUnlinkSync).toHaveBeenCalledWith('imagenes/tmp.jpg');
        expect(modelRepuestos.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Repuesto no encontrado',
            datos: null,
        });
    });

    // Prueba 13: updateRepuesto (catch)
    test('updateRepuesto debe responder 500 si falla la BD', async () => {
        // ARRANGE
        modelRepuestos.findById.mockRejectedValue(new Error('Fallo actualizando'));
        const res = crearRes();
        // ACT
        await controllerRepuestos.updateRepuesto({ params: { id: 'abc' }, body: {} }, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Ocurrio un error al actualizar el repuesto',
            datos: null,
        });
    });

    // Prueba 14: deleteRepuesto (try)
    test('deleteRepuesto debe eliminar el repuesto y su foto', async () => {
        // ARRANGE
        modelRepuestos.findByIdAndDelete.mockResolvedValue({ _id: 'd1', Foto: 'borrar.jpg' });
        mockExistsSync.mockReturnValue(true);
        const res = crearRes();
        // ACT
        await controllerRepuestos.deleteRepuesto({ params: { id: 'd1' } }, res);
        // ASSERT
        expect(modelRepuestos.findByIdAndDelete).toHaveBeenCalledWith('d1');
        expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'bien',
            mensaje: 'Repuesto eliminado correctamente',
            datos: null,
        });
    });

    // Prueba 15: deleteRepuesto no encontrado
    test('deleteRepuesto debe responder "mal" si no existe', async () => {
        // ARRANGE
        modelRepuestos.findByIdAndDelete.mockResolvedValue(null);
        const res = crearRes();
        // ACT
        await controllerRepuestos.deleteRepuesto({ params: { id: 'nada' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Repuesto no encontrado para eliminar',
            datos: null,
        });
    });

    // Prueba 16: deleteRepuesto (catch)
    test('deleteRepuesto debe responder 500 si falla la BD', async () => {
        // ARRANGE
        modelRepuestos.findByIdAndDelete.mockRejectedValue(new Error('Fallo eliminando'));
        const res = crearRes();
        // ACT
        await controllerRepuestos.deleteRepuesto({ params: { id: 'd1' } }, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            resultado: 'mal',
            mensaje: 'Ocurrio un error al eliminar el repuesto',
            datos: null,
        });
    });
});