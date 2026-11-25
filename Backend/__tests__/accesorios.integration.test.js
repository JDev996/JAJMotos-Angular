import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

// 1. Simulamos el modelo de Mongoose (soporta "new modelAccesorios()" y métodos estáticos)
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

// 2. Simulamos Multer: sirve como middleware de ruta (PUT) y como función con callback (POST)
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

// 3. Importamos dinámicamente el modelo, el servidor y el generador de tokens REAL
const { default: modelAccesorios } = await import('../src/models/modelAccesorios.js');
const { default: servidor } = await import('../src/server.js');
const { generarToken } = await import('../src/token/generate.js');

describe('PRUEBA DE INTEGRACION: Rutas /accesorios (estilo Postman)', () => {
    let tokenAdmin;
    let tokenCliente;

    // Creamos tokens reales antes de todas las pruebas (las rutas piden autenticación)
    beforeAll(async () => {
        tokenAdmin = await generarToken({ id: 'u1', rol: 'admin' });
        tokenCliente = await generarToken({ id: 'u2', rol: 'cliente' });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: sin token
    test('GET /accesorios sin token debe responder 401', async () => {
        // ACT
        const respuesta = await request(servidor).get('/accesorios');
        // ASSERT
        expect(respuesta.statusCode).toBe(401);
        expect(respuesta.body.mensaje).toBe('Token no proporcionado');
        expect(modelAccesorios.find).not.toHaveBeenCalled();
    });

    // Prueba 2: token inválido
    test('GET /accesorios con token inválido debe responder 401', async () => {
        // ACT
        const respuesta = await request(servidor)
            .get('/accesorios')
            .set('Authorization', 'Bearer token_falso');
        // ASSERT
        expect(respuesta.statusCode).toBe(401);
        expect(respuesta.body.mensaje).toBe('Token inválido o expirado');
    });

    // Prueba 3: GET /accesorios con token
    test('GET /accesorios con token debe responder 200 con la lista', async () => {
        // ARRANGE
        const accesoriosMock = [
            { _id: '6ae3fdb0fd19ce48e4bc9ab3', nombre: 'Casco', marca: 'Shaft', referencia: 'SH-526', precio: 350000, stock: 5, Foto: 'casco.jpg' },
        ];
        modelAccesorios.find.mockResolvedValue(accesoriosMock);
        // ACT
        const respuesta = await request(servidor)
            .get('/accesorios')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.headers['content-type']).toMatch(/json/);
        expect(respuesta.body).toEqual({
            result: 'fine',
            message: 'Accesorios consultados',
            data: accesoriosMock,
        });
    });

    // Prueba 4: GET /accesorios/:id
    test('GET /accesorios/:id debe devolver el accesorio', async () => {
        // ARRANGE
        modelAccesorios.findById.mockResolvedValue({ _id: '555', nombre: 'Guantes', precio: 120000 });
        // ACT
        const respuesta = await request(servidor)
            .get('/accesorios/555')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.result).toBe('fine');
        expect(respuesta.body.data.nombre).toBe('Guantes');
    });

    // Prueba 5: POST como cliente (sin permisos)
    test('POST /accesorios como cliente debe responder 403', async () => {
        // ACT
        const respuesta = await request(servidor)
            .post('/accesorios')
            .set('Authorization', `Bearer ${tokenCliente}`)
            .send({ nombre: 'Casco' });
        // ASSERT
        expect(respuesta.statusCode).toBe(403);
        expect(respuesta.body.mensaje).toBe('No tienes permisos para esta acción');
        expect(mockSave).not.toHaveBeenCalled();
    });

    // Prueba 6: POST como admin
    test('POST /accesorios como admin debe crear el accesorio', async () => {
        // ARRANGE
        const nuevo = { nombre: 'Chaqueta', marca: 'Dainese', referencia: 'DN-200', precio: 800000, stock: 3 };
        mockSave.mockResolvedValue({ _id: 'a1', ...nuevo, Foto: 'imagen_prueba.jpg' });
        // ACT
        const respuesta = await request(servidor)
            .post('/accesorios')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(nuevo);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(mockUpload).toHaveBeenCalledTimes(1);
        expect(respuesta.body.result).toBe('fine');
        expect(respuesta.body.data.Foto).toBe('imagen_prueba.jpg');
    });

    // Prueba 7: PUT como admin
    test('PUT /accesorios/:id como admin debe actualizar', async () => {
        // ARRANGE
        const existente = { _id: '789', nombre: 'Casco', descripcion: '', Foto: 'casco.jpg' };
        const actualizado = { ...existente, precio: 320000, Foto: 'imagen_prueba.jpg' };
        modelAccesorios.findById.mockResolvedValue(existente);
        modelAccesorios.findByIdAndUpdate.mockResolvedValue(actualizado);
        // ACT
        const respuesta = await request(servidor)
            .put('/accesorios/789')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ precio: 320000 });
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            result: 'fine',
            message: 'Accesorio actualizado correctamente',
            data: actualizado,
        });
    });

    // Prueba 8: DELETE como admin
    test('DELETE /accesorios/:id como admin debe responder 200', async () => {
        // ARRANGE (sin Foto para no tocar el disco)
        modelAccesorios.findByIdAndDelete.mockResolvedValue({ _id: '789', nombre: 'Casco' });
        // ACT
        const respuesta = await request(servidor)
            .delete('/accesorios/789')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            result: 'fine',
            message: 'Accesorio eliminado correctamente',
            data: null,
        });
    });

    // Prueba 9: DELETE como cliente
    test('DELETE /accesorios/:id como cliente debe responder 403', async () => {
        // ACT
        const respuesta = await request(servidor)
            .delete('/accesorios/789')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(403);
        expect(modelAccesorios.findByIdAndDelete).not.toHaveBeenCalled();
    });
});