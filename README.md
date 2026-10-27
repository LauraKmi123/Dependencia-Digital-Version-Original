# Espejos Digitales — «Lo que ves ≠ Lo que es»

Página web estática funcional y lista para abrir.

## Cómo usarla

1. Descomprime este ZIP.
2. Abre directamente `index.html` en el navegador, o abre la carpeta en Visual Studio/Visual Studio Code.
3. Para una prueba completa con audio y descargas, ejecuta `python3 -m http.server 8000` desde esta carpeta y visita `http://localhost:8000`.

## Archivos principales

- `index.html`: estructura, contenido y controles de audio/video.
- `pagina.css`: estilos personalizados y animaciones.
- `tailwind.local.css`: estilos Tailwind incluidos localmente para que la página conserve su diseño sin depender de Internet.
- `pagina.js`: menú, paneles, podcast, parallax y resultados del test.
- `IMAGENES/` y `AUDIOS/`: recursos locales con rutas corregidas.
- `vendor/`: Chart.js y Font Awesome incluidos localmente.

Los videos de los relatos usan YouTube, por lo que esos videos sí requieren conexión a Internet. Las imágenes, estilos, JavaScript, íconos, gráfico del test y audios están incluidos en el proyecto.


## Extensión de analítica añadida
La nueva sección del final reúne una gráfica circular interactiva con porcentajes y conteos de visualizaciones por apartado, las visitas de hoy, reacciones Me gusta/No me gusta y un backend opcional para almacenar datos anónimos agregados y enviar reportes semanales. Para activar estas funciones: instala Node.js 18+, ejecuta `npm install`, copia `.env.example` a `.env`, configura destinatario y SMTP, y ejecuta `npm run start:analytics`; abre `http://localhost:3000`. El reporte está programado para los lunes a las 12:00 UTC. La página original sigue abriéndose como antes, pero los datos compartidos y el correo requieren el servidor en ejecución. Para recopilar datos de visitantes en Internet, en el futuro habrá que alojar el servidor con almacenamiento persistente y configurar el host accesible desde la plataforma. No se guardan nombres, direcciones IP, correos de visitantes ni respuestas del autodiagnóstico.
