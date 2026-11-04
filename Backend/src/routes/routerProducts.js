import { Router } from 'express';
import controllerProducts from '../controllers/controllerProducts.js';
import { uploadProductImage } from '../middleware/upload.js';

const routerProducts = Router();
routerProducts.get('/', controllerProducts.readProducts);
routerProducts.post('/', uploadProductImage, controllerProducts.createProduct);
routerProducts.put('/:id', uploadProductImage, controllerProducts.updateProduct);
routerProducts.delete('/:id', controllerProducts.deleteProduct);

export default routerProducts;
