import  "dotenv/config";
import "./conection.js";

import servidor from "./server.js";
servidor.listen(8080,()=>{
    console.log("el servidor esta conectado a http://localhost:8080");
});