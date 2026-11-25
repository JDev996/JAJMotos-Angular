import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

// 1. Simulamos el modelo de Mongoose (modelProducto)
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

// 2. Simulamos Multer: en vez de guardar archivos, ponemos un req.file falso
const mockUpload = jest.fn((req, res, next) => {
    req.body = req.body || {};
    req.file = { filename: 'imagen_prueba.jpg' };
    next();
});

jest.unstable_mockModule('../src/middleware/upload.js', () => ({
    uploadSingleImage: mockUpload,
    uploadImage: mockUpload,
    uploadProductImage: mockUpload,
}));

// 3. Importamos dinámicamente el modelo simulado y el servidor Express (sin listen ni Mongo)
const { default: modelProducto } = await import('../src/models/modelProducto.js');
const { default: servidor } = await import('../src/server.js');

describe('PRUEBA DE INTEGRACION: Rutas /products (estilo Postman)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: GET /products
    test('GET /products debe responder 200 con la lista', async () => {
        // ARRANGE
        const productosMock = [
            { _id: '6ae3fdb0fd19ce48e4bc9ab3', modelo: 'Casco integral', precio: 350000, color: 'negro', categoria: 'accesorios', imagen: 'casco.jpg' },
        ];
        modelProducto.find.mockResolvedValue(productosMock);
        // ACT
        const respuesta = await request(servidor).get('/products');
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.headers['content-type']).toMatch(/json/);
        expect(respuesta.body).toEqual({
            result: 'fine',
            message: 'Productos consultados',
            data: productosMock,
        });
    });

    // Prueba 2: POST /products
    test('POST /products debe crear un producto', async () => {
        // ARRANGE
        const nuevo = { modelo: 'Guantes', descripcion: 'Guantes de cuero', precio: 90000, color: 'rojo', categoria: 'accesorios' };
        modelProducto.create.mockResolvedValue({ _id: 'p1', ...nuevo, imagen: 'imagen_prueba.jpg' });
        // ACT
        const respuesta = await request(servidor).post('/products').send(nuevo);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(mockUpload).toHaveBeenCalledTimes(1);
        expect(respuesta.body.result).toBe('fine');
        expect(respuesta.body.data.imagen).toBe('imagen_prueba.jpg');
    });

    // Prueba 3: PUT /products/:id
    test('PUT /products/:id debe actualizar un producto', async () => {
        // ARRANGE
        const existente = { _id: '789', modelo: 'Casco', precio: 300000, imagen: 'casco.jpg' };
        const actualizado = { ...existente, modelo: 'Casco abatible', precio: 320000, imagen: 'imagen_prueba.jpg' };
        modelProducto.findById.mockResolvedValue(existente);
        modelProducto.findByIdAndUpdate.mockResolvedValue(actualizado);
        // ACT
        const respuesta = await request(servidor)
            .put('/products/789')
            .send({ modelo: 'Casco abatible', precio: 320000 });
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            result: 'fine',
            message: 'Producto actualizado',
            data: actualizado,
        });
    });

    // Prueba 4: PUT /products/:id que no existe
    test('PUT /products/:id debe responder 404 si no existe', async () => {
        // ARRANGE
        modelProducto.findById.mockResolvedValue(null);
        // ACT
        const respuesta = await request(servidor).put('/products/noexiste').send({ modelo: 'X' });
        // ASSERT
        expect(respuesta.statusCode).toBe(404);
        expect(respuesta.body.message).toBe('Producto no encontrado');
    });

    // Prueba 5: DELETE /products/:id
    test('DELETE /products/:id debe responder 200', async () => {
        // ARRANGE (sin imagen para no tocar el disco)
        modelProducto.findByIdAndDelete.mockResolvedValue({ _id: '789', modelo: 'Casco' });
        // ACT
        const respuesta = await request(servidor).delete('/products/789');
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            result: 'fine',
            message: 'Producto eliminado',
            data: null,
        });
    });

    // Prueba 6: GET /products con error de BD
    test('GET /products debe responder 500 si falla la BD', async () => {
        // ARRANGE
        modelProducto.find.mockRejectedValue(new Error('Mongo caido'));
        // ACT
        const respuesta = await request(servidor).get('/products');
        // ASSERT
        expect(respuesta.statusCode).toBe(500);
        expect(respuesta.body.result).toBe('mistake');
    });

    // Prueba 7: ruta inexistente
    test('una ruta inexistente debe responder 404', async () => {
        // ACT
        const respuesta = await request(servidor).get('/rutaFalsa');
        // ASSERT
        expect(respuesta.statusCode).toBe(404);
    });
});