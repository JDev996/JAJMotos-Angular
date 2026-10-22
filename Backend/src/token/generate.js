    import jwt from 'jsonwebtoken'; 


    export function generarToken(payload){
        return new Promise((resolve, reject)=>{
            jwt.sign(payload, 'llaveoculta',{expiresIn:'30m'},(error, token)=>{
                if(error){
                    reject(error);
                }else{
                    resolve(token);
                }
            });
        });
    }
export function validarToken(token){
    return new Promise((resolve, reject)=>{
        jwt.verify(token, 'llaveoculta',(error, validacion)=>{
            if(error){
                reject(error);
            }else{
                resolve(validacion);
            }
        });
    });
}
