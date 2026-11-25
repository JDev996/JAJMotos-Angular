import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 1. Simulamos Multer: uploadSingleImage ejecuta el callback sin exigir un archivo real
jest.unstable_mockModule('../src/middleware/upload.js', () => ({
    uploadSingleImage: jest.fn((req, res, callback) => callback(null)),
    uploadImage: jest.fn(),
    uploadProductImage: jest.fn(),
}));

// 2. Simulamos el modelo de Mongoose (soporta "new modelAccesorios()" y los métodos estáticos)
const mockSave = jest.fn();
const mockModelAccesorios = jest.fn().mockImplementation((datos) => ({
    ...datos,
    save: mockSave,
}));
mockModelAccesorios.find = jest.fn();
mockModelAccesorios.findById = jest.fn();
mockModelAccesorios.findByIdAndUpdate = jest.fn();
mockModelAccesorios.findByIdAndDelete = jest.fn();

jest.unstable_mockModule('../src/models/modelAccesorios.js', () => ({
    default: mockModelAccesorios,
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
const { default: modelAccesorios } = await import('../src/models/modelAccesorios.js');
const { default: controllerAccesorios } = await import('../src/controllers/controllerAccesorios.js');

describe('PRUEBA UNITARIA: controllerAccesorios (JAJ Motos)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: readAccesorios (try)
    test('readAccesorios debe responder "fine" con la lista de accesorios', async () => {
        // ARRANGE
        const accesoriosFalsos = [
            { _id: '1', nombre: 'Casco integral', marca: 'Shaft', referencia: 'SH-526', precio: 350000, stock: 5, Foto: 'casco.jpg' },
            { _id: '2', nombre: 'Guantes', marca: 'Alpinestars', referencia: 'SMX-1', precio: 120000, stock: 10, Foto: 'guantes.jpg' },
        ];
        modelAccesorios.find.mockResolvedValue(accesoriosFalsos);
        const req = {};
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.readAccesorios(req, res);
        // ASSERT
        expect(modelAccesorios.find).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Accesorios consultados',
            data: accesoriosFalsos,
        });
    });

    // Prueba 2: readAccesorios (catch)
    test('readAccesorios debe responder "mistake" si falla la BD', async () => {
        // ARRANGE
        const errorSimulado = new Error('Fallo de conexion a Mongo');
        modelAccesorios.find.mockRejectedValue(errorSimulado);
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.readAccesorios({}, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Ocurrio un error al consultar los accesorios',
            data: errorSimulado,
        });
    });

    // Prueba 3: readAccesorioId (try)
    test('readAccesorioId debe devolver el accesorio buscado', async () => {
        // ARRANGE
        const accesorio = { _id: 'id123', nombre: 'Casco', marca: 'Shaft', referencia: 'SH-526', precio: 350000 };
        modelAccesorios.findById.mockResolvedValue(accesorio);
        const req = { params: { id: 'id123' } };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.readAccesorioId(req, res);
        // ASSERT
        expect(modelAccesorios.findById).toHaveBeenCalledWith('id123');
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Accesorio consultado',
            data: accesorio,
        });
    });

    // Prueba 4: readAccesorioId no encontrado
    test('readAccesorioId debe responder "mistake" si no existe', async () => {
        // ARRANGE
        modelAccesorios.findById.mockResolvedValue(null);
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.readAccesorioId({ params: { id: 'noexiste' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Accesorio no encontrado',
            data: null,
        });
    });

    // Prueba 5: readAccesorioId (catch)
    test('readAccesorioId debe responder "mistake" si falla la BD', async () => {
        // ARRANGE
        const errorRead = new Error('Fallo leyendo el accesorio');
        modelAccesorios.findById.mockRejectedValue(errorRead);
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.readAccesorioId({ params: { id: 'id1' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Ocurrio un error al consultar el accesorio por su identificador',
            data: errorRead,
        });
    });

    // Prueba 6: createAccesorio (try)
    test('createAccesorio debe crear el accesorio y responder "fine"', async () => {
        // ARRANGE
        const datosNuevos = {
            nombre: 'Chaqueta',
            marca: 'Dainese',
            referencia: 'DN-200',
            descripcion: 'Chaqueta con protecciones',
            precio: 800000,
            stock: 3,
        };
        const accesorioGuardado = { _id: 'a1', ...datosNuevos, Foto: 'chaqueta.jpg' };
        mockSave.mockResolvedValue(accesorioGuardado);
        const req = { body: datosNuevos, file: { filename: 'chaqueta.jpg' } };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.createAccesorio(req, res);
        // ASSERT
        expect(uploadSingleImage).toHaveBeenCalledTimes(1);
        expect(modelAccesorios).toHaveBeenCalledWith({ ...datosNuevos, Foto: 'chaqueta.jpg' });
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Accesorio creado',
            data: accesorioGuardado,
        });
    });

    // Prueba 7: createAccesorio sin nombre usa la referencia
    test('createAccesorio sin nombre debe usar la referencia como nombre', async () => {
        // ARRANGE
        mockSave.mockResolvedValue({ _id: 'a2' });
        const req = { body: { marca: 'LS2', referencia: 'FF353', precio: 280000, stock: 2 }, file: { filename: 'ls2.jpg' } };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.createAccesorio(req, res);
        // ASSERT
        expect(modelAccesorios.mock.calls[0][0].nombre).toBe('FF353');
    });

    // Prueba 8: createAccesorio sin imagen
    test('createAccesorio debe responder "mistake" si no llega la imagen', async () => {
        // ARRANGE
        const req = { body: { nombre: 'Sin foto' } };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.createAccesorio(req, res);
        // ASSERT
        expect(mockSave).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'La imagen es obligatoria',
            data: null,
        });
    });

    // Prueba 9: createAccesorio error al subir la imagen
    test('createAccesorio debe responder "mistake" si falla la subida de la imagen', async () => {
        // ARRANGE
        uploadSingleImage.mockImplementationOnce((req, res, callback) => {
            callback('Archivo demasiado pesado');
        });
        const req = { body: {}, file: { filename: 'x.jpg' } };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.createAccesorio(req, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Ocurrio un error al cargar la imagen',
            data: 'Archivo demasiado pesado',
        });
    });

    // Prueba 10: createAccesorio (catch)
    test('createAccesorio debe responder "mistake" si ocurre un error inesperado', async () => {
        // ARRANGE
        const errorSimulado = new Error('fallo al procesar la peticion');
        uploadSingleImage.mockImplementationOnce(() => {
            throw errorSimulado;
        });
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.createAccesorio({ body: {} }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'An error occurred creating the accesorio',
            data: errorSimulado,
        });
    });

    // Prueba 11: updateAccesorio sin imagen nueva
    test('updateAccesorio debe actualizar y conservar la foto anterior', async () => {
        // ARRANGE
        const accesorioViejo = { _id: 'abc', nombre: 'Casco', descripcion: 'Casco abierto', Foto: 'casco.jpg' };
        const cambios = { marca: 'Shaft', referencia: 'SH-526', precio: 320000, stock: 4 };
        const accesorioActualizado = { _id: 'abc', nombre: 'Casco', descripcion: 'Casco abierto', ...cambios, Foto: 'casco.jpg' };
        modelAccesorios.findById.mockResolvedValue(accesorioViejo);
        modelAccesorios.findByIdAndUpdate.mockResolvedValue(accesorioActualizado);
        const req = { params: { id: 'abc' }, body: cambios };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.updateAccesorio(req, res);
        // ASSERT
        expect(modelAccesorios.findByIdAndUpdate).toHaveBeenCalledWith(
            'abc',
            { nombre: 'Casco', descripcion: 'Casco abierto', ...cambios, Foto: 'casco.jpg' },
            { new: true, runValidators: true }
        );
        expect(mockUnlinkSync).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Accesorio actualizado correctamente',
            data: accesorioActualizado,
        });
    });

    // Prueba 12: updateAccesorio con imagen nueva
    test('updateAccesorio con imagen nueva debe borrar la foto anterior', async () => {
        // ARRANGE
        modelAccesorios.findById.mockResolvedValue({ _id: 'abc', Foto: 'vieja.jpg' });
        modelAccesorios.findByIdAndUpdate.mockResolvedValue({ _id: 'abc', Foto: 'nueva.jpg' });
        mockExistsSync.mockReturnValue(true);
        const req = { params: { id: 'abc' }, body: {}, file: { filename: 'nueva.jpg' } };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.updateAccesorio(req, res);
        // ASSERT
        expect(modelAccesorios.findByIdAndUpdate.mock.calls[0][1].Foto).toBe('nueva.jpg');
        expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
        expect(res.json.mock.calls[0][0].result).toBe('fine');
    });

    // Prueba 13: updateAccesorio no encontrado (borra la imagen recién subida)
    test('updateAccesorio debe responder "mistake" si no existe y borrar la imagen subida', async () => {
        // ARRANGE
        modelAccesorios.findById.mockResolvedValue(null);
        const req = { params: { id: 'noexiste' }, body: {}, file: { filename: 'tmp.jpg', path: 'imagenes/tmp.jpg' } };
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.updateAccesorio(req, res);
        // ASSERT
        expect(mockUnlinkSync).toHaveBeenCalledWith('imagenes/tmp.jpg');
        expect(modelAccesorios.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Accesorio no encontrado',
            data: null,
        });
    });

    // Prueba 14: updateAccesorio (catch)
    test('updateAccesorio debe responder "mistake" si falla la BD', async () => {
        // ARRANGE
        modelAccesorios.findById.mockRejectedValue(new Error('Fallo actualizando'));
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.updateAccesorio({ params: { id: 'abc' }, body: {} }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Ocurrio un error al actualizar el accesorio',
            data: 'Fallo actualizando',
        });
    });

    // Prueba 15: deleteAccesorio (try)
    test('deleteAccesorio debe eliminar el accesorio y su foto', async () => {
        // ARRANGE
        modelAccesorios.findByIdAndDelete.mockResolvedValue({ _id: 'd1', Foto: 'borrar.jpg' });
        mockExistsSync.mockReturnValue(true);
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.deleteAccesorio({ params: { id: 'd1' } }, res);
        // ASSERT
        expect(modelAccesorios.findByIdAndDelete).toHaveBeenCalledWith('d1');
        expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Accesorio eliminado correctamente',
            data: null,
        });
    });

    // Prueba 16: deleteAccesorio no encontrado
    test('deleteAccesorio debe responder "mistake" si no existe', async () => {
        // ARRANGE
        modelAccesorios.findByIdAndDelete.mockResolvedValue(null);
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.deleteAccesorio({ params: { id: 'nada' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Accesorio no encontrado para eliminar',
            data: null,
        });
    });

    // Prueba 17: deleteAccesorio (catch)
    test('deleteAccesorio debe responder "mistake" si falla la BD', async () => {
        // ARRANGE
        modelAccesorios.findByIdAndDelete.mockRejectedValue(new Error('Fallo eliminando'));
        const res = { json: jest.fn() };
        // ACT
        await controllerAccesorios.deleteAccesorio({ params: { id: 'd1' } }, res);
        // ASSERT
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Ocurrio un error al eliminar el accesorio',
            data: 'Fallo eliminando',
        });
    });
});