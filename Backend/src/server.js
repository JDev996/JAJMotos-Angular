import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import routerUsuario from './routes/routerUsuario.js';
import routerAccesorios from './routes/routerAccesorios.js';
import routerRespuestos from './routes/routerRespuestos.js';
import routerMotos from './routes/routerMotos.js';
import routerVentas from './routes/routerVentas.js';
import loginRouter from './routes/routerLogin.js';  
import routerProducts from './routes/routerProducts.js';
import controllerUsuario from './controllers/controllerUsuario.js';

const app = express();
app.use(morgan('dev'));
app.use(cors({
    origin: (origin, callback) => {
        const isLocalDevelopmentOrigin =
            origin === undefined ||
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

        callback(null, isLocalDevelopmentOrigin);
    },
}));
app.use(express.json());
app.post('/register', controllerUsuario.registerPublic);
app.use('/usuarios', routerUsuario);
app.use('/login', loginRouter); 
app.use('/accesorios', routerAccesorios);
app.use('/respuestos', routerRespuestos);
app.use('/repuestos', routerRespuestos);
app.use('/motos', routerMotos);
app.use('/ventas', routerVentas);
app.use('/products', routerProducts);
app.use('/imagenes', express.static('imagenes'));
app.get('/', (req, res) => {

    res.status(404).send("Not Found");

});

export default app;