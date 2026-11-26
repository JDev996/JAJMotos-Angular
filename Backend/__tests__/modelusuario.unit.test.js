import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 1. Mock de bcryptjs antes de importar el modelo
jest.unstable_mockModule('bcryptjs', () => ({
    default: {
        hash: jest.fn().mockResolvedValue('$2b$10$abcdefghijklmnopqrstuvwxABCDEFGHIJKLMNOPQRSTUVWX12345'),
    },
}));

// 2. Importaciones dinámicas
const { default: Usuario } = await import('../src/models/modelUsuario.js');
const { default: bcrypt } = await import('bcryptjs');

describe('PRUEBA UNITARIA: models/modelUsuario.js', () => {
    const hashValido = '$2b$10$abcdefghijklmnopqrstuvwxABCDEFGHIJKLMNOPQRSTUVWX12345';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==================== VALIDACIONES DEL ESQUEMA ====================
    test('debe validar correctamente un usuario con contraseña en texto plano y rol por defecto', async () => {
        const user = new Usuario({
            nombre: '  Eduardo  ',
            apellido: 'Sanchez',
            correo: 'EDUARDO@TEST.COM',
            edad: 45,
            password: 'Password1$',
            Foto: 'foto.png',
        });

        const error = user.validateSync();

        expect(error).toBeUndefined();
        expect(user.nombre).toBe('Eduardo'); // trim
        expect(user.correo).toBe('eduardo@test.com'); // lowercase
        expect(user.rol).toBe('user'); // default
    });

    test('debe aceptar directamente una contraseña que ya venga encriptada con bcrypt', () => {
        const user = new Usuario({
            nombre: 'Ana',
            apellido: 'Gomez',
            correo: 'ana@test.com',
            edad: 30,
            rol: 'admin',
            password: hashValido,
            Foto: 'ana.png',
        });

        const error = user.validateSync();

        expect(error).toBeUndefined();
        expect(user.rol).toBe('admin');
    });

    test('debe fallar la validación si la contraseña no cumple requisitos o faltan campos', () => {
        const userInvalido = new Usuario({
            nombre: 'Test',
            edad: 20,
            rol: 'superadmin', // fuera del enum
            password: '123', // inválida
        });

        const error = userInvalido.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.apellido).toBeDefined();
        expect(error.errors.correo).toBeDefined();
        expect(error.errors.Foto).toBeDefined();
        expect(error.errors.rol).toBeDefined();
        expect(error.errors.password.message).toBe(
            'La contraseña debe tener 8-15 caracteres, una mayúscula, una minúscula, un número y un carácter especial'
        );
    });

    // ==================== HOOK PRE('SAVE') ====================
    test('pre("save") - debe encriptar la contraseña cuando es nueva o modificada', async () => {
        const user = new Usuario({
            nombre: 'Carlos',
            apellido: 'Ruiz',
            correo: 'carlos@test.com',
            edad: 28,
            password: 'Password1$',
            Foto: 'carlos.png',
        });

        // Simulamos la escritura final en BD para ejecutar el hook real sin MongoDB
        await Usuario.schema.s.hooks.execPre ('save',user);   

        expect(bcrypt.hash).toHaveBeenCalledWith('Password1$', 10);
        expect(user.password).toBe(hashValido);
    });

    test('pre("save") - no debe volver a encriptar si password no fue modificado', async () => {
        const user = new Usuario({
            nombre: 'Laura',
            apellido: 'Diaz',
            correo: 'laura@test.com',
            edad: 32,
            password: 'Password1$',
            Foto: 'laura.png',
        });

        // Simulamos que el documento ya existía y password no cambió
        jest.spyOn(user, 'isModified').mockReturnValue(false);
await Usuario.schema.s.hooks.execPre ('save', user);

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test('pre("save") - no debe volver a encriptar si password ya tiene formato de hash bcrypt', async () => {
        const user = new Usuario({
            nombre: 'Pedro',
            apellido: 'Mora',
            correo: 'pedro@test.com',
            edad: 40,
            password: hashValido,
            Foto: 'pedro.png',
        });

await Usuario.schema.s.hooks.execPre ('save', user);

        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(user.password).toBe(hashValido);
    });
});