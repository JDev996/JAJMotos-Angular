import  mongoose from "mongoose";

mongoose
.connect(process.env.MONGODB)
.then((data)=>{
    console.log("conectado a base de datos");
}).catch((error)=>{
    console.log("error al conectar a base de datos",error);

});