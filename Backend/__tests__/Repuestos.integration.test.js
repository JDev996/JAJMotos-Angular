import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

// 1. Simulamos el modelo de Mongoose (soporta "new modelRepuestos()" y métodos estáticos)
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
const { default: modelRepuestos } = await import('../src/models/modelRepuestos.js');
const { default: servidor } = await import('../src/server.js');
const { generarToken } = await import('../src/token/generate.js');

describe('PRUEBA DE INTEGRACION: Rutas /repuestos (estilo Postman)', () => {
    let tokenAdmin;
    let tokenCliente;

    beforeAll(async () => {
        tokenAdmin = await generarToken({ id: 'u1', rol: 'admin' });
        tokenCliente = await generarToken({ id: 'u2', rol: 'user' });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: sin token
    test('GET /repuestos sin token debe responder 401', async () => {
        // ACT
        const respuesta = await request(servidor).get('/repuestos');
        // ASSERT
        expect(respuesta.statusCode).toBe(401);
        expect(modelRepuestos.find).not.toHaveBeenCalled();
    });

    // Prueba 2: GET /repuestos con token
    test('GET /repuestos con token debe responder 200 con la lista', async () => {
        // ARRANGE
        const repuestosMock = [{ _id: '1', marca: 'NGK', referencia: 'CR7HSA', precio: 18000, stock: 40, Foto: 'bujia.jpg' }];
        modelRepuestos.find.mockResolvedValue(repuestosMock);
        // ACT
        const respuesta = await request(servidor)
            .get('/repuestos')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            resultado: 'bien',
            mensaje: 'Repuestos consultados',
            datos: repuestosMock,
        });
    });

    // Prueba 3: la ruta alterna /respuestos también funciona
    test('GET /respuestos (ruta alterna) también debe responder 200', async () => {
        // ARRANGE
        modelRepuestos.find.mockResolvedValue([]);
        // ACT
        const respuesta = await request(servidor)
            .get('/respuestos')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.resultado).toBe('bien');
    });

    // Prueba 4: GET /repuestos/:id
    test('GET /repuestos/:id debe devolver el repuesto', async () => {
        // ARRANGE
        modelRepuestos.findById.mockResolvedValue({ _id: '555', marca: 'Brembo', precio: 65000 });
        // ACT
        const respuesta = await request(servidor)
            .get('/repuestos/555')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.datos.marca).toBe('Brembo');
    });

    // Prueba 5: GET con error de BD
    test('GET /repuestos debe responder 500 si falla la BD', async () => {
        // ARRANGE
        modelRepuestos.find.mockRejectedValue(new Error('Mongo caido'));
        // ACT
        const respuesta = await request(servidor)
            .get('/repuestos')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(500);
        expect(respuesta.body.resultado).toBe('mal');
    });

    // Prueba 6: POST como user (sin permisos)
    test('POST /repuestos como user debe responder 403', async () => {
        // ACT
        const respuesta = await request(servidor)
            .post('/repuestos')
            .set('Authorization', `Bearer ${tokenCliente}`)
            .send({ marca: 'NGK' });
        // ASSERT
        expect(respuesta.statusCode).toBe(403);
        expect(mockSave).not.toHaveBeenCalled();
    });

    // Prueba 7: POST como admin
    test('POST /repuestos como admin debe crear el repuesto', async () => {
        // ARRANGE
        const nuevo = { marca: 'DID', referencia: '428H-120', precio: 95000, stock: 8 };
        mockSave.mockResolvedValue({ _id: 'r1', ...nuevo, Foto: 'imagen_prueba.jpg' });
        // ACT
        const respuesta = await request(servidor)
            .post('/repuestos')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(nuevo);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.resultado).toBe('bien');
        expect(respuesta.body.datos.Foto).toBe('imagen_prueba.jpg');
    });

    // Prueba 8: PUT como admin
    test('PUT /repuestos/:id como admin debe actualizar', async () => {
        // ARRANGE
        const actualizado = { _id: '789', marca: 'NGK', precio: 21000, Foto: 'imagen_prueba.jpg' };
        modelRepuestos.findById.mockResolvedValue({ _id: '789', Foto: 'bujia.jpg' });
        modelRepuestos.findByIdAndUpdate.mockResolvedValue(actualizado);
        // ACT
        const respuesta = await request(servidor)
            .put('/repuestos/789')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ marca: 'NGK', precio: 21000 });
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            resultado: 'bien',
            mensaje: 'Repuesto actualizado correctamente',
            datos: actualizado,
        });
    });

    // Prueba 9: DELETE como admin
    test('DELETE /repuestos/:id como admin debe responder 200', async () => {
        // ARRANGE (sin Foto para no tocar el disco)
        modelRepuestos.findByIdAndDelete.mockResolvedValue({ _id: '789', marca: 'NGK' });
        // ACT
        const respuesta = await request(servidor)
            .delete('/repuestos/789')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.mensaje).toBe('Repuesto eliminado correctamente');
    });
});