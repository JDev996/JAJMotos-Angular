export interface MensajeChat {
  rol: 'usuario' | 'asesor';
  texto: string;
}

export interface ApiAsesor {
  result: string;
  message: string;
  data: string | null;
}
