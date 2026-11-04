export interface Productos {
  _id?: string;
  modelo: string;
  descripcion: string;
  precio: number;
  color: string;
  imagen: string;
}

export interface ApiProductos {
  result: string;
  message: string;
  data: Productos[];
}
