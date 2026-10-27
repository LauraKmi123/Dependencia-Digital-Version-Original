# Publicar Espejos Digitales en GitHub Pages

## Publicar la página
1. Descomprime el ZIP.
2. En GitHub, crea o abre el repositorio y sube **todo el contenido** de la carpeta `DEPENDENCIA COMPLETA Y TERMINADA` (incluye `index.html`, `IMAGENES/`, `AUDIOS/`, `vendor/`, CSS y JS). No subas solamente el HTML.
3. En el repositorio, entra en **Settings → Pages** y elige la rama y carpeta donde quedó `index.html`.
4. Espera a que GitHub Pages termine el despliegue y abre la URL que te proporciona.

Las rutas a imágenes, audios, estilos, iconos y scripts son relativas y los recursos originales están incluidos. Mantén exactamente los nombres de archivos y carpetas, incluidas mayúsculas, espacios y extensiones.

## Analítica y reacciones
La gráfica circular, su leyenda interactiva y el autodiagnóstico funcionan en la página estática. Si no existe una API, el panel utiliza un respaldo de `localStorage`: las visitas a apartados y reacciones quedan guardadas **solo en el navegador/dispositivo actual**. GitHub Pages no ejecuta `server.js` ni ofrece una API Node persistente, así que por sí solo no puede recopilar métricas compartidas de todos los visitantes.

Para métricas globales compartidas entre visitantes, hay que desplegar `server.js` en un servicio que ejecute Node.js y tenga almacenamiento persistente, y después configurar `analytics.js` para llamar a esa API. No publiques contraseñas SMTP ni archivos `.env` en GitHub.

## Probar localmente con analítica de servidor
Requiere Node.js instalado. Abre una terminal en esta carpeta y ejecuta:

```bash
npm install
npm run start:analytics
```

Luego abre `http://localhost:3000`. Mantén la terminal abierta mientras pruebas la página. Para GitHub Pages, no es necesario ni posible ejecutar el servidor dentro de Pages; la página funcionará con el respaldo local descrito arriba.
