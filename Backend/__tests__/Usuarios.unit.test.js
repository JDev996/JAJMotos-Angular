import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 1. Simulamos Multer: uploadImage ejecuta el callback sin exigir un archivo real
jest.unstable_mockModule('../src/middleware/upload.js', () => ({
    uploadSingleImage: jest.fn(),
    uploadImage: jest.fn((req, res, callback) => callback(null)),
    uploadProductImage: jest.fn(),
}));

// 2. Documento falso de Mongoose: tiene save() y toObject() como un usuario real
const crearDoc = (datos) => {
    const doc = { ...datos };
    doc.save = jest.fn(async () => doc);
    doc.toObject = () => {
        const { save, toObject, ...plano } = doc;
        return { ...plano };
    };
    return doc;
};

// 3. Simulamos el modelo (soporta "new modelUsuario()" y los métodos estáticos)
const mockModelUsuario = jest.fn().mockImplementation((datos) => crearDoc(datos));
mockModelUsuario.find = jest.fn();
mockModelUsuario.findOne = jest.fn();
mockModelUsuario.findById = jest.fn();
mockModelUsuario.findByIdAndDelete = jest.fn();

jest.unstable_mockModule('../src/models/modelUsuario.js', () => ({
    default: mockModelUsuario,
}));

// 4. Simulamos nodemailer para no enviar correos de verdad
const mockSendMail = jest.fn();
jest.unstable_mockModule('nodemailer', () => ({
    default: { createTransport: jest.fn(() => ({ sendMail: mockSendMail })) },
}));

// 5. Simulamos fs (versión normal y fs.promises) para no borrar archivos reales
const mockExistsSync = jest.fn();
const mockUnlinkSync = jest.fn();
const mockPromisesUnlink = jest.fn();
const fsFalso = {
    existsSync: mockExistsSync,
    unlinkSync: mockUnlinkSync,
    promises: { unlink: mockPromisesUnlink },
};
jest.unstable_mockModule('fs', () => ({ default: fsFalso, ...fsFalso }));

// 6. Importamos dinámicamente todo (después de los mocks)
const { uploadImage } = await import('../src/middleware/upload.js');
const { default: modelUsuario } = await import('../src/models/modelUsuario.js');
const { default: controllerUsuario, forgotPassword } = await import('../src/controllers/controllerUsuario.js');

// Respuesta falsa con status encadenable: res.status(400).json(...)
const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// El controlador hace console.error en los catch: lo silenciamos para que la consola quede limpia
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('PRUEBA UNITARIA: controllerUsuario (JAJ Motos)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPromisesUnlink.mockResolvedValue(undefined);
    });

    // ---------------- forgotPassword ----------------
    describe('forgotPassword', () => {
        test('debe responder 400 si el correo no está registrado', async () => {
            // ARRANGE
            modelUsuario.findOne.mockResolvedValue(null);
            const res = crearRes();
            // ACT
            await forgotPassword({ body: { correo: '  NoExiste@Mail.com ' } }, res);
            // ASSERT
            expect(modelUsuario.findOne).toHaveBeenCalledWith({ correo: 'noexiste@mail.com' });
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                result: 'mistake',
                message: 'El correo no se encuentra registrado',
            });
        });

        test('debe cambiar la contraseña (encriptada) y enviar el correo', async () => {
            // ARRANGE
            const usuario = crearDoc({ correo: 'juan@mail.com', password: 'vieja' });
            modelUsuario.findOne.mockResolvedValue(usuario);
            mockSendMail.mockResolvedValue({});
            const res = crearRes();
            // ACT
            await forgotPassword({ body: { correo: 'juan@mail.com' } }, res);
            // ASSERT
            expect(usuario.password).not.toBe('vieja');
            expect(usuario.password).toMatch(/^\$2[aby]\$10\$/); // hash de bcrypt
            expect(usuario.save).toHaveBeenCalledTimes(1);
            expect(mockSendMail.mock.calls[0][0].to).toBe('juan@mail.com');
            expect(res.json).toHaveBeenCalledWith({
                result: 'fine',
                message: 'Se ha enviado una nueva contraseña al correo registrado.',
            });
        });

        test('debe responder 500 si falla el envío del correo', async () => {
            // ARRANGE
            modelUsuario.findOne.mockResolvedValue(crearDoc({ correo: 'juan@mail.com' }));
            mockSendMail.mockRejectedValue(new Error('SMTP caido'));
            const res = crearRes();
            // ACT
            await forgotPassword({ body: { correo: 'juan@mail.com' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                result: 'mistake',
                message: 'Error interno en el servidor',
                error: 'SMTP caido',
            });
        });
    });

    // ---------------- registerPublic ----------------
    describe('registerPublic', () => {
        test('debe responder 400 si faltan campos', async () => {
            // ARRANGE
            const res = crearRes();
            // ACT
            await controllerUsuario.registerPublic({ body: { nombre: 'Juan' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                resultado: 'mal',
                mensaje: 'Todos los campos obligatorios son requeridos',
                datos: null,
            });
        });

        test('debe responder 409 si el correo ya existe', async () => {
            // ARRANGE
            modelUsuario.findOne.mockResolvedValue({ _id: 'u1' });
            const body = { nombre: 'Juan', apellido: 'Navarrete', correo: 'juan@mail.com', password: 'Clave123*' };
            const res = crearRes();
            // ACT
            await controllerUsuario.registerPublic({ body }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json.mock.calls[0][0].mensaje).toBe('El correo ya está registrado');
        });

        test('debe registrar con rol "user" y sin devolver la contraseña', async () => {
            // ARRANGE
            modelUsuario.findOne.mockResolvedValue(null);
            const body = { nombre: ' Juan ', apellido: 'Navarrete', correo: ' JUAN@Mail.com ', password: 'Clave123*' };
            const res = crearRes();
            // ACT
            await controllerUsuario.registerPublic({ body }, res);
            // ASSERT
            expect(modelUsuario).toHaveBeenCalledWith({
                nombre: 'Juan',
                apellido: 'Navarrete',
                correo: 'juan@mail.com',
                edad: 0,
                rol: 'user',
                password: 'Clave123*',
                Foto: 'default-user.png',
            });
            expect(res.status).toHaveBeenCalledWith(201);
            const respuesta = res.json.mock.calls[0][0];
            expect(respuesta.resultado).toBe('bien');
            expect(respuesta.datos.password).toBeUndefined();
            expect(respuesta.datos.correo).toBe('juan@mail.com');
        });

        test('debe responder 500 si falla la BD', async () => {
            // ARRANGE
            modelUsuario.findOne.mockRejectedValue(new Error('Mongo caido'));
            const body = { nombre: 'Juan', apellido: 'N', correo: 'j@mail.com', password: 'Clave123*' };
            const res = crearRes();
            // ACT
            await controllerUsuario.registerPublic({ body }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json.mock.calls[0][0].mensaje).toBe('Ocurrio un error registrando el usuario');
        });
    });

    // ---------------- readPerfil ----------------
    describe('readPerfil', () => {
        test('debe devolver el perfil del usuario del token sin contraseña', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(crearDoc({ _id: 'u1', nombre: 'Juan', password: 'hash' }));
            const res = crearRes();
            // ACT
            await controllerUsuario.readPerfil({ usuario: { id: 'u1' } }, res);
            // ASSERT
            expect(modelUsuario.findById).toHaveBeenCalledWith('u1');
            expect(res.json).toHaveBeenCalledWith({
                resultado: 'bien',
                mensaje: 'Perfil obtenido',
                datos: { _id: 'u1', nombre: 'Juan' },
            });
        });

        test('debe responder 404 si el usuario no existe', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(null);
            const res = crearRes();
            // ACT
            await controllerUsuario.readPerfil({ usuario: { id: 'x' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('debe responder 500 si falla la BD', async () => {
            // ARRANGE
            modelUsuario.findById.mockRejectedValue(new Error('Fallo'));
            const res = crearRes();
            // ACT
            await controllerUsuario.readPerfil({ usuario: { id: 'u1' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json.mock.calls[0][0].mensaje).toBe('Ocurrio un error al obtener el perfil');
        });
    });

    // ---------------- updatePerfil ----------------
    describe('updatePerfil', () => {
        test('debe responder 404 y borrar la foto subida si el usuario no existe', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(null);
            const req = { usuario: { id: 'x' }, body: {}, file: { path: 'imagenes/tmp.jpg' } };
            const res = crearRes();
            // ACT
            await controllerUsuario.updatePerfil(req, res);
            // ASSERT
            expect(mockPromisesUnlink).toHaveBeenCalledWith('imagenes/tmp.jpg');
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('debe responder 400 si falta nombre o apellido', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(crearDoc({ _id: 'u1' }));
            const req = { usuario: { id: 'u1' }, body: { nombre: '   ', apellido: 'N' } };
            const res = crearRes();
            // ACT
            await controllerUsuario.updatePerfil(req, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json.mock.calls[0][0].mensaje).toBe('El nombre y el apellido son obligatorios');
        });

        test('debe actualizar nombre, apellido y foto, y borrar la foto anterior', async () => {
            // ARRANGE
            const usuario = crearDoc({ _id: 'u1', nombre: 'Viejo', apellido: 'X', Foto: 'vieja.jpg', password: 'hash' });
            modelUsuario.findById.mockResolvedValue(usuario);
            const req = {
                usuario: { id: 'u1' },
                body: { nombre: 'Juan', apellido: 'Navarrete' },
                file: { filename: 'nueva.jpg', path: 'imagenes/nueva.jpg' },
            };
            const res = crearRes();
            // ACT
            await controllerUsuario.updatePerfil(req, res);
            // ASSERT
            expect(usuario.save).toHaveBeenCalledTimes(1);
            expect(mockPromisesUnlink).toHaveBeenCalledWith(expect.stringContaining('vieja.jpg'));
            expect(res.json).toHaveBeenCalledWith({
                resultado: 'bien',
                mensaje: 'Perfil actualizado satisfactoriamente',
                datos: { _id: 'u1', nombre: 'Juan', apellido: 'Navarrete', Foto: 'nueva.jpg' },
            });
        });

        test('no debe borrar la foto por defecto', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(crearDoc({ _id: 'u1', Foto: 'default-user.png' }));
            const req = {
                usuario: { id: 'u1' },
                body: { nombre: 'Juan', apellido: 'N' },
                file: { filename: 'nueva.jpg', path: 'imagenes/nueva.jpg' },
            };
            const res = crearRes();
            // ACT
            await controllerUsuario.updatePerfil(req, res);
            // ASSERT
            expect(mockPromisesUnlink).not.toHaveBeenCalled();
            expect(res.json.mock.calls[0][0].resultado).toBe('bien');
        });

        test('debe responder 500 y borrar la foto subida si falla al guardar', async () => {
            // ARRANGE
            const usuario = crearDoc({ _id: 'u1', Foto: 'vieja.jpg' });
            usuario.save = jest.fn().mockRejectedValue(new Error('Fallo guardando'));
            modelUsuario.findById.mockResolvedValue(usuario);
            const req = {
                usuario: { id: 'u1' },
                body: { nombre: 'Juan', apellido: 'N' },
                file: { filename: 'nueva.jpg', path: 'imagenes/nueva.jpg' },
            };
            const res = crearRes();
            // ACT
            await controllerUsuario.updatePerfil(req, res);
            // ASSERT
            expect(mockPromisesUnlink).toHaveBeenCalledWith('imagenes/nueva.jpg');
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ---------------- createUsuario (admin) ----------------
    describe('createUsuario', () => {
        test('debe crear el usuario y no devolver la contraseña', async () => {
            // ARRANGE
            const body = { nombre: 'Ana', apellido: 'Ruiz', correo: 'ana@mail.com', edad: 25, rol: 'admin', password: 'Clave123*' };
            const res = crearRes();
            // ACT
            await controllerUsuario.createUsuario({ body, file: { filename: 'ana.jpg' } }, res);
            // ASSERT
            expect(uploadImage).toHaveBeenCalledTimes(1);
            expect(modelUsuario).toHaveBeenCalledWith({ ...body, Foto: 'ana.jpg' });
            const respuesta = res.json.mock.calls[0][0];
            expect(respuesta.mensaje).toBe('usuario admin creado satisfactoriamente');
            expect(respuesta.datos.password).toBeUndefined();
        });

        test('debe responder 400 si falla la subida de la imagen', async () => {
            // ARRANGE
            uploadImage.mockImplementationOnce((req, res, callback) => callback('Archivo muy pesado'));
            const res = crearRes();
            // ACT
            await controllerUsuario.createUsuario({ body: {} }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json.mock.calls[0][0].mensaje).toBe('Ocurrio un error cargando la imagen');
        });

        test('debe responder 400 si no llega la imagen', async () => {
            // ARRANGE
            const res = crearRes();
            // ACT
            await controllerUsuario.createUsuario({ body: {} }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json.mock.calls[0][0].mensaje).toBe('La imagen es obligatoria');
        });

        test('debe responder 500 si falla al guardar', async () => {
            // ARRANGE
            modelUsuario.mockImplementationOnce((datos) => ({
                ...crearDoc(datos),
                save: jest.fn().mockRejectedValue(new Error('correo duplicado')),
            }));
            const res = crearRes();
            // ACT
            await controllerUsuario.createUsuario({ body: {}, file: { filename: 'x.jpg' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json.mock.calls[0][0].mensaje).toBe('Ocurrio un error creando el Usuario');
        });
    });

    // ---------------- readUsuario / readUsuarios ----------------
    describe('readUsuario y readUsuarios', () => {
        test('readUsuario debe devolver el usuario sin contraseña', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(crearDoc({ _id: 'u1', nombre: 'Juan', password: 'hash' }));
            const res = crearRes();
            // ACT
            await controllerUsuario.readUsuario({ params: { id: 'u1' } }, res);
            // ASSERT
            expect(res.json).toHaveBeenCalledWith({
                resultado: 'bien',
                mensaje: 'Usuario encontrado satisfactoriamente',
                datos: { _id: 'u1', nombre: 'Juan' },
            });
        });

        test('readUsuario debe avisar si no existe', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(null);
            const res = crearRes();
            // ACT
            await controllerUsuario.readUsuario({ params: { id: 'x' } }, res);
            // ASSERT
            expect(res.json.mock.calls[0][0].mensaje).toBe('Usuario no encontrado');
        });

        test('readUsuario debe responder 500 si falla la BD', async () => {
            // ARRANGE
            modelUsuario.findById.mockRejectedValue(new Error('Fallo'));
            const res = crearRes();
            // ACT
            await controllerUsuario.readUsuario({ params: { id: 'u1' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('readUsuarios debe devolver la lista sin contraseñas', async () => {
            // ARRANGE
            modelUsuario.find.mockResolvedValue([
                crearDoc({ _id: 'u1', nombre: 'Juan', password: 'hash1' }),
                crearDoc({ _id: 'u2', nombre: 'Ana', password: 'hash2' }),
            ]);
            const res = crearRes();
            // ACT
            await controllerUsuario.readUsuarios({}, res);
            // ASSERT
            expect(res.json).toHaveBeenCalledWith({
                resultado: 'bien',
                mensaje: 'Usuarios encontrados satisfactoriamente',
                datos: [{ _id: 'u1', nombre: 'Juan' }, { _id: 'u2', nombre: 'Ana' }],
            });
        });

        test('readUsuarios debe responder 500 si falla la BD', async () => {
            // ARRANGE
            modelUsuario.find.mockRejectedValue(new Error('Fallo'));
            const res = crearRes();
            // ACT
            await controllerUsuario.readUsuarios({}, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json.mock.calls[0][0].mensaje).toBe('Ocurrio un error encontrando los Usuarios');
        });
    });

    // ---------------- updateUsuario (admin) ----------------
    describe('updateUsuario', () => {
        test('debe responder 404 y borrar la foto subida si no existe', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(null);
            const req = { params: { id: 'x' }, body: {}, file: { path: 'imagenes/tmp.jpg' } };
            const res = crearRes();
            // ACT
            await controllerUsuario.updateUsuario(req, res);
            // ASSERT
            expect(mockUnlinkSync).toHaveBeenCalledWith('imagenes/tmp.jpg');
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('debe actualizar solo los campos enviados y la contraseña', async () => {
            // ARRANGE
            const usuario = crearDoc({ _id: 'u1', nombre: 'Juan', edad: 20, rol: 'user', password: 'hash', Foto: 'juan.jpg' });
            modelUsuario.findById.mockResolvedValue(usuario);
            const req = { params: { id: 'u1' }, body: { edad: 30, rol: 'admin', password: 'Nueva123*' } };
            const res = crearRes();
            // ACT
            await controllerUsuario.updateUsuario(req, res);
            // ASSERT
            expect(usuario.nombre).toBe('Juan');
            expect(usuario.edad).toBe(30);
            expect(usuario.rol).toBe('admin');
            expect(usuario.password).toBe('Nueva123*'); // el modelo la encripta en el pre('save')
            expect(mockUnlinkSync).not.toHaveBeenCalled();
            const respuesta = res.json.mock.calls[0][0];
            expect(respuesta.mensaje).toBe('Usuario actualizado');
            expect(respuesta.datos.password).toBeUndefined();
        });

        test('con foto nueva debe borrar la foto anterior', async () => {
            // ARRANGE
            modelUsuario.findById.mockResolvedValue(crearDoc({ _id: 'u1', Foto: 'vieja.jpg' }));
            mockExistsSync.mockReturnValue(true);
            const req = { params: { id: 'u1' }, body: {}, file: { filename: 'nueva.jpg' } };
            const res = crearRes();
            // ACT
            await controllerUsuario.updateUsuario(req, res);
            // ASSERT
            expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
            expect(res.json.mock.calls[0][0].datos.Foto).toBe('nueva.jpg');
        });

        test('debe responder 500 si falla la BD', async () => {
            // ARRANGE
            modelUsuario.findById.mockRejectedValue(new Error('Fallo'));
            const res = crearRes();
            // ACT
            await controllerUsuario.updateUsuario({ params: { id: 'u1' }, body: {} }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json.mock.calls[0][0].mensaje).toBe('Error al actualizar el usuario');
        });
    });

    // ---------------- deleteUsuario (admin) ----------------
    describe('deleteUsuario', () => {
        test('debe eliminar el usuario y su foto', async () => {
            // ARRANGE
            modelUsuario.findByIdAndDelete.mockResolvedValue({ _id: 'u1', Foto: 'juan.jpg' });
            mockExistsSync.mockReturnValue(true);
            const res = crearRes();
            // ACT
            await controllerUsuario.deleteUsuario({ params: { id: 'u1' } }, res);
            // ASSERT
            expect(modelUsuario.findByIdAndDelete).toHaveBeenCalledWith('u1');
            expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith({
                resultado: 'bien',
                mensaje: 'Usuario eliminado correctamente.',
                datos: null,
            });
        });

        test('debe responder 404 si no existe', async () => {
            // ARRANGE
            modelUsuario.findByIdAndDelete.mockResolvedValue(null);
            const res = crearRes();
            // ACT
            await controllerUsuario.deleteUsuario({ params: { id: 'x' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('debe responder 500 si falla la BD', async () => {
            // ARRANGE
            modelUsuario.findByIdAndDelete.mockRejectedValue(new Error('Fallo'));
            const res = crearRes();
            // ACT
            await controllerUsuario.deleteUsuario({ params: { id: 'u1' } }, res);
            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json.mock.calls[0][0].mensaje).toBe('Error al eliminar el usuario.');
        });
    });
});