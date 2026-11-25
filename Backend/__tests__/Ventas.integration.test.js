import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

// 1. Simulamos el modelo de Mongoose (soporta "new modelVentas()" y métodos estáticos)
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

// 2. Importamos dinámicamente el modelo, el servidor y el generador de tokens REAL
const { default: modelVentas } = await import('../src/models/modelVentas.js');
const { default: servidor } = await import('../src/server.js');
const { generarToken } = await import('../src/token/generate.js');

describe('PRUEBA DE INTEGRACION: Rutas /ventas (estilo Postman)', () => {
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
    test('GET /ventas sin token debe responder 401', async () => {
        // ACT
        const respuesta = await request(servidor).get('/ventas');
        // ASSERT
        expect(respuesta.statusCode).toBe(401);
        expect(modelVentas.find).not.toHaveBeenCalled();
    });

    // Prueba 2: GET /ventas con token
    test('GET /ventas con token debe responder 200 con la lista', async () => {
        // ARRANGE
        const ventasMock = [{ _id: '1', fecha: '2026-11-01T00:00:00.000Z', total: 12500000, mes: 'noviembre' }];
        modelVentas.find.mockResolvedValue(ventasMock);
        // ACT
        const respuesta = await request(servidor)
            .get('/ventas')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            mensaje: 'Ventas encontradas satisfactoriamente',
            datos: ventasMock,
        });
    });

    // Prueba 3: GET /ventas/:id
    test('GET /ventas/:id debe devolver la venta', async () => {
        // ARRANGE
        modelVentas.findById.mockResolvedValue({ _id: 'v1', total: 8000000, mes: 'octubre' });
        // ACT
        const respuesta = await request(servidor)
            .get('/ventas/v1')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.datos.mes).toBe('octubre');
    });

    // Prueba 4: POST como user (sin permisos)
    test('POST /ventas como user debe responder 403', async () => {
        // ACT
        const respuesta = await request(servidor)
            .post('/ventas')
            .set('Authorization', `Bearer ${tokenCliente}`)
            .send({ total: 100, mes: 'enero' });
        // ASSERT
        expect(respuesta.statusCode).toBe(403);
        expect(mockSave).not.toHaveBeenCalled();
    });

    // Prueba 5: POST como admin
    test('POST /ventas como admin debe crear la venta', async () => {
        // ARRANGE
        const nueva = { fecha: '2026-11-24', total: 12500000, mes: 'noviembre' };
        mockSave.mockResolvedValue({ _id: 'v9', ...nueva });
        // ACT
        const respuesta = await request(servidor)
            .post('/ventas')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(nueva);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(modelVentas).toHaveBeenCalledWith(nueva);
        expect(respuesta.body).toEqual({
            mensaje: 'Venta creada satisfactoriamente',
            datos: { _id: 'v9', ...nueva },
        });
    });

    // Prueba 6: PUT como admin
    test('PUT /ventas/:id como admin debe actualizar', async () => {
        // ARRANGE
        const actualizada = { _id: 'v1', fecha: '2026-11-24', total: 13000000, mes: 'noviembre' };
        modelVentas.findById.mockResolvedValue({ _id: 'v1' });
        modelVentas.findByIdAndUpdate.mockResolvedValue(actualizada);
        // ACT
        const respuesta = await request(servidor)
            .put('/ventas/v1')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ fecha: '2026-11-24', total: 13000000, mes: 'noviembre' });
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.mensaje).toBe('Venta actualizada');
        expect(respuesta.body.datos.total).toBe(13000000);
    });

    // Prueba 7: DELETE como admin
    test('DELETE /ventas/:id como admin debe responder 200', async () => {
        // ARRANGE
        modelVentas.findByIdAndDelete.mockResolvedValue({ _id: 'v1' });
        // ACT
        const respuesta = await request(servidor)
            .delete('/ventas/v1')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body).toEqual({
            mensaje: 'Venta eliminada correctamente',
            datos: null,
        });
    });

    // Prueba 8: DELETE como user
    test('DELETE /ventas/:id como user debe responder 403', async () => {
        // ACT
        const respuesta = await request(servidor)
            .delete('/ventas/v1')
            .set('Authorization', `Bearer ${tokenCliente}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(403);
        expect(modelVentas.findByIdAndDelete).not.toHaveBeenCalled();
    });
});