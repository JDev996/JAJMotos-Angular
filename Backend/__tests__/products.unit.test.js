import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 1. SIMULACION DE  MONGOOSE (modelProducto) "EVITAMOS TOCAR LA BASE DE DATOS"
const mockModelProducto = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
};

jest.unstable_mockModule('../src/models/modelProducto.js', () => ({
    default: mockModelProducto,
}));

// 2. MAS SIMULACIONES QUE EVITAN BORRAR IMAGENES DE LA BD
const mockExistsSync = jest.fn();
const mockUnlinkSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
    default: { existsSync: mockExistsSync, unlinkSync: mockUnlinkSync },
    existsSync: mockExistsSync,
    unlinkSync: mockUnlinkSync,
}));

// 3. IMPORTACION DINAMICA 
const { default: modelProducto } = await import('../src/models/modelProducto.js');
const { default: controllerProducts } = await import('../src/controllers/controllerProducts.js');

// RESPUESTA DEL RES
const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('PRUEBA UNITARIA: controllerProducts (JAJ Motos)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: readProducts (try)
    test('readProducts debe responder result "fine" con la lista de productos', async () => {
        // ARRANGE
        const productosFalsos = [
            { _id: '1', modelo: 'Casco integral', precio: 350000, color: 'negro', categoria: 'accesorios' },
            { _id: '2', modelo: 'Llanta trasera', precio: 180000, color: 'negro', categoria: 'repuestos' },
        ];
        modelProducto.find.mockResolvedValue(productosFalsos);
        const req = {};
        const res = crearRes();
        // ACT
        await controllerProducts.readProducts(req, res);
        // ASSERT
        expect(modelProducto.find).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Productos consultados',
            data: productosFalsos,
        });
    });

    // Prueba 2: readProducts (catch)
    test('readProducts debe responder 500 y "mistake" si falla la BD', async () => {
        // ARRANGE
        modelProducto.find.mockRejectedValue(new Error('Fallo de conexion a Mongo'));
        const res = crearRes();
        // ACT
        await controllerProducts.readProducts({}, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Error al consultar productos',
            data: 'Fallo de conexion a Mongo',
        });
    });

    // Prueba 3: createProduct (try)
    test('createProduct debe crear el producto y responder "fine"', async () => {
        // ARRANGE
        const datosNuevos = {
            modelo: 'Guantes de cuero',
            descripcion: 'Guantes con protección en nudillos',
            precio: 90000,
            color: 'rojo',
            categoria: 'accesorios',
        };
        const productoGuardado = { _id: 'p1', ...datosNuevos, imagen: 'guantes.jpg' };
        modelProducto.create.mockResolvedValue(productoGuardado);
        const req = { body: datosNuevos, file: { filename: 'guantes.jpg' } };
        const res = crearRes();
        // ACT
        await controllerProducts.createProduct(req, res);
        // ASSERT
        expect(modelProducto.create).toHaveBeenCalledWith({ ...datosNuevos, imagen: 'guantes.jpg' });
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Producto creado',
            data: productoGuardado,
        });
    });

    // Prueba 4: createProduct sin imagen
    test('createProduct debe responder 400 si no llega la imagen', async () => {
        // ARRANGE
        const req = { body: { modelo: 'Sin foto' } };
        const res = crearRes();
        // ACT
        await controllerProducts.createProduct(req, res);
        // ASSERT
        expect(modelProducto.create).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'La imagen es obligatoria',
            data: null,
        });
    });

    // Prueba 5: createProduct (catch)
    test('createProduct debe responder 400 y "mistake" si falla al guardar', async () => {
        // ARRANGE
        modelProducto.create.mockRejectedValue(new Error('precio es obligatorio'));
        const req = { body: {}, file: { filename: 'x.jpg' } };
        const res = crearRes();
        // ACT
        await controllerProducts.createProduct(req, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Error al crear producto',
            data: 'precio es obligatorio',
        });
    });

    // Prueba 6: updateProduct sin imagen nueva
    test('updateProduct debe actualizar y conservar la imagen anterior', async () => {
        // ARRANGE
        const productoViejo = { _id: 'abc', modelo: 'Casco', precio: 300000, imagen: 'casco.jpg' };
        const cambios = { modelo: 'Casco', descripcion: 'Casco abatible', precio: 320000, color: 'gris', categoria: 'accesorios' };
        const productoActualizado = { _id: 'abc', ...cambios, imagen: 'casco.jpg' };
        modelProducto.findById.mockResolvedValue(productoViejo);
        modelProducto.findByIdAndUpdate.mockResolvedValue(productoActualizado);
        const req = { params: { id: 'abc' }, body: cambios };
        const res = crearRes();
        // ACT
        await controllerProducts.updateProduct(req, res);
        // ASSERT
        expect(modelProducto.findByIdAndUpdate).toHaveBeenCalledWith(
            'abc',
            { ...cambios, imagen: 'casco.jpg' },
            { new: true, runValidators: true }
        );
        expect(mockUnlinkSync).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Producto actualizado',
            data: productoActualizado,
        });
    });

    // Prueba 7: updateProduct con imagen nueva (borra la anterior)
    test('updateProduct con imagen nueva debe borrar la imagen anterior', async () => {
        // ARRANGE
        const productoViejo = { _id: 'abc', imagen: 'vieja.jpg' };
        const productoActualizado = { _id: 'abc', imagen: 'nueva.jpg' };
        modelProducto.findById.mockResolvedValue(productoViejo);
        modelProducto.findByIdAndUpdate.mockResolvedValue(productoActualizado);
        mockExistsSync.mockReturnValue(true);
        const req = { params: { id: 'abc' }, body: {}, file: { filename: 'nueva.jpg' } };
        const res = crearRes();
        // ACT
        await controllerProducts.updateProduct(req, res);
        // ASSERT
        expect(modelProducto.findByIdAndUpdate.mock.calls[0][1].imagen).toBe('nueva.jpg');
        expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Producto actualizado',
            data: productoActualizado,
        });
    });

    // Prueba 8: updateProduct producto no encontrado
    test('updateProduct debe responder 404 si el producto no existe', async () => {
        // ARRANGE
        modelProducto.findById.mockResolvedValue(null);
        const req = { params: { id: 'noexiste' }, body: {} };
        const res = crearRes();
        // ACT
        await controllerProducts.updateProduct(req, res);
        // ASSERT
        expect(modelProducto.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Producto no encontrado',
            data: null,
        });
    });

    // Prueba 9: updateProduct (catch)
    test('updateProduct debe responder 400 y "mistake" si falla la BD', async () => {
        // ARRANGE
        modelProducto.findById.mockRejectedValue(new Error('Fallo actualizando'));
        const req = { params: { id: 'abc' }, body: {} };
        const res = crearRes();
        // ACT
        await controllerProducts.updateProduct(req, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Error al actualizar producto',
            data: 'Fallo actualizando',
        });
    });

    // Prueba 10: deleteProduct (try)
    test('deleteProduct debe eliminar el producto y su imagen', async () => {
        // ARRANGE
        modelProducto.findByIdAndDelete.mockResolvedValue({ _id: 'd1', imagen: 'borrar.jpg' });
        mockExistsSync.mockReturnValue(true);
        const req = { params: { id: 'd1' } };
        const res = crearRes();
        // ACT
        await controllerProducts.deleteProduct(req, res);
        // ASSERT
        expect(modelProducto.findByIdAndDelete).toHaveBeenCalledWith('d1');
        expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            result: 'fine',
            message: 'Producto eliminado',
            data: null,
        });
    });

    // Prueba 11: deleteProduct producto no encontrado
    test('deleteProduct debe responder 404 si el producto no existe', async () => {
        // ARRANGE
        modelProducto.findByIdAndDelete.mockResolvedValue(null);
        const res = crearRes();
        // ACT
        await controllerProducts.deleteProduct({ params: { id: 'nada' } }, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Producto no encontrado',
            data: null,
        });
    });

    // Prueba 12: deleteProduct (catch)
    test('deleteProduct debe responder 500 y "mistake" si falla la BD', async () => {
        // ARRANGE
        modelProducto.findByIdAndDelete.mockRejectedValue(new Error('Fallo eliminando'));
        const res = crearRes();
        // ACT
        await controllerProducts.deleteProduct({ params: { id: 'd1' } }, res);
        // ASSERT
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            result: 'mistake',
            message: 'Error al eliminar producto',
            data: 'Fallo eliminando',
        });
    });
});