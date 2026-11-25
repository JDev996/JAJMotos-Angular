import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

// 1. Documento falso de Mongoose: tiene save() y toObject() como un usuario real
const crearDoc = (datos) => {
    const doc = { ...datos };
    doc.save = jest.fn(async () => doc);
    doc.toObject = () => {
        const { save, toObject, ...plano } = doc;
        return { ...plano };
    };
    return doc;
};

// 2. Simulamos el modelo de usuarios
const mockModelUsuario = jest.fn().mockImplementation((datos) => crearDoc(datos));
mockModelUsuario.find = jest.fn();
mockModelUsuario.findOne = jest.fn();
mockModelUsuario.findById = jest.fn();
mockModelUsuario.findByIdAndDelete = jest.fn();

jest.unstable_mockModule('../src/models/modelUsuario.js', () => ({
    default: mockModelUsuario,
}));

// 3. Simulamos nodemailer para no enviar correos de verdad
const mockSendMail = jest.fn();
jest.unstable_mockModule('nodemailer', () => ({
    default: { createTransport: jest.fn(() => ({ sendMail: mockSendMail })) },
}));

// 4. Simulamos Multer (middleware de ruta y función con callback)
const mockUpload = jest.fn((req, res, next) => {
    req.body = req.body || {};
    req.file = { filename: 'foto_prueba.jpg', path: 'imagenes/foto_prueba.jpg' };
    next();
});
jest.unstable_mockModule('../src/middleware/upload.js', () => ({
    uploadSingleImage: mockUpload,
    uploadImage: mockUpload,
    uploadProductImage: mockUpload,
}));

// 5. Importamos dinámicamente el modelo, el servidor y el generador de tokens REAL
const { default: modelUsuario } = await import('../src/models/modelUsuario.js');
const { default: servidor } = await import('../src/server.js');
const { generarToken } = await import('../src/token/generate.js');

jest.spyOn(console, 'error').mockImplementation(() => {});

describe('PRUEBA DE INTEGRACION: Rutas de usuarios (estilo Postman)', () => {
    let tokenAdmin;
    let tokenUser;

    beforeAll(async () => {
        tokenAdmin = await generarToken({ id: 'admin1', rol: 'admin' });
        tokenUser = await generarToken({ id: 'user1', rol: 'user' });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prueba 1: registro público
    test('POST /register debe registrar un usuario nuevo (201)', async () => {
        // ARRANGE
        modelUsuario.findOne.mockResolvedValue(null);
        const nuevo = { nombre: 'Juan', apellido: 'Navarrete', correo: 'juan@mail.com', password: 'Clave123*' };
        // ACT
        const respuesta = await request(servidor).post('/register').send(nuevo);
        // ASSERT
        expect(respuesta.statusCode).toBe(201);
        expect(respuesta.body.resultado).toBe('bien');
        expect(respuesta.body.datos.rol).toBe('user');
        expect(respuesta.body.datos.password).toBeUndefined();
    });

    // Prueba 2: registro con correo repetido
    test('POST /register con correo repetido debe responder 409', async () => {
        // ARRANGE
        modelUsuario.findOne.mockResolvedValue({ _id: 'existe' });
        // ACT
        const respuesta = await request(servidor)
            .post('/register')
            .send({ nombre: 'Juan', apellido: 'N', correo: 'juan@mail.com', password: 'Clave123*' });
        // ASSERT
        expect(respuesta.statusCode).toBe(409);
    });

    // Prueba 3: recuperar contraseña con correo no registrado
    test('POST /usuarios/forgotPassword con correo no registrado debe responder 400', async () => {
        // ARRANGE
        modelUsuario.findOne.mockResolvedValue(null);
        // ACT
        const respuesta = await request(servidor)
            .post('/usuarios/forgotPassword')
            .send({ correo: 'nadie@mail.com' });
        // ASSERT
        expect(respuesta.statusCode).toBe(400);
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    // Prueba 4: recuperar contraseña OK (sin token, es pública)
    test('POST /usuarios/forgotPassword debe enviar el correo', async () => {
        // ARRANGE
        modelUsuario.findOne.mockResolvedValue(crearDoc({ correo: 'juan@mail.com', password: 'hash' }));
        mockSendMail.mockResolvedValue({});
        // ACT
        const respuesta = await request(servidor)
            .post('/usuarios/forgotPassword')
            .send({ correo: 'juan@mail.com' });
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.result).toBe('fine');
        expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    // Prueba 5: perfil usa el id que viene dentro del token
    test('GET /usuarios/perfil debe buscar el usuario del token', async () => {
        // ARRANGE
        modelUsuario.findById.mockResolvedValue(crearDoc({ _id: 'user1', nombre: 'Juan', password: 'hash' }));
        // ACT
        const respuesta = await request(servidor)
            .get('/usuarios/perfil')
            .set('Authorization', `Bearer ${tokenUser}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(modelUsuario.findById).toHaveBeenCalledWith('user1');
        expect(respuesta.body.datos).toEqual({ _id: 'user1', nombre: 'Juan' });
    });

    // Prueba 6: actualizar perfil con foto (la foto por defecto no se borra)
    test('PUT /usuarios/perfil debe actualizar nombre, apellido y foto', async () => {
        // ARRANGE
        modelUsuario.findById.mockResolvedValue(crearDoc({ _id: 'user1', Foto: 'default-user.png' }));
        // ACT
        const respuesta = await request(servidor)
            .put('/usuarios/perfil')
            .set('Authorization', `Bearer ${tokenUser}`)
            .send({ nombre: 'Juan David', apellido: 'Navarrete' });
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.datos).toEqual({
            _id: 'user1',
            nombre: 'Juan David',
            apellido: 'Navarrete',
            Foto: 'foto_prueba.jpg',
        });
    });

    // Prueba 7: listar usuarios sin token
    test('GET /usuarios sin token debe responder 401', async () => {
        // ACT
        const respuesta = await request(servidor).get('/usuarios');
        // ASSERT
        expect(respuesta.statusCode).toBe(401);
    });

    // Prueba 8: listar usuarios como user
    test('GET /usuarios como user debe responder 403', async () => {
        // ACT
        const respuesta = await request(servidor)
            .get('/usuarios')
            .set('Authorization', `Bearer ${tokenUser}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(403);
        expect(modelUsuario.find).not.toHaveBeenCalled();
    });

    // Prueba 9: listar usuarios como admin
    test('GET /usuarios como admin debe responder 200 sin contraseñas', async () => {
        // ARRANGE
        modelUsuario.find.mockResolvedValue([crearDoc({ _id: 'u1', nombre: 'Juan', password: 'hash' })]);
        // ACT
        const respuesta = await request(servidor)
            .get('/usuarios')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.datos).toEqual([{ _id: 'u1', nombre: 'Juan' }]);
    });

    // Prueba 10: eliminar usuario como admin
    test('DELETE /usuarios/:id como admin debe responder 200', async () => {
        // ARRANGE (sin Foto para no tocar el disco)
        modelUsuario.findByIdAndDelete.mockResolvedValue({ _id: 'u1' });
        // ACT
        const respuesta = await request(servidor)
            .delete('/usuarios/u1')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.mensaje).toBe('Usuario eliminado correctamente.');
    });

    // Prueba 11: eliminar usuario que no existe
    test('DELETE /usuarios/:id que no existe debe responder 404', async () => {
        // ARRANGE
        modelUsuario.findByIdAndDelete.mockResolvedValue(null);
        // ACT
        const respuesta = await request(servidor)
            .delete('/usuarios/noexiste')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        // ASSERT
        expect(respuesta.statusCode).toBe(404);
    });
});