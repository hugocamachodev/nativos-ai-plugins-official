// Un pedazo que se carga con import(): el escáner tiene que seguirlo desde app.js.
export const otra = "sk-ant-ESTO-NO-ES-UNA-LLAVE-REAL-000000000000";
// Lo que NO es una llave: un nombre de clase con el mismo prefijo, y el encabezado
// suelto que traen las librerías que leen llaves.
export const clase = "sk-loading-spinner-container-wrapper-abcdef";
export const lector = "-----BEGIN PRIVATE KEY-----";
// Un segundo nivel de import() no se sigue: tiene que contarse en jsSinRevisar.
export const luego = () => import("./otro.js");
