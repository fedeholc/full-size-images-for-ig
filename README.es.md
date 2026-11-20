# Full Size Images for IG v0.4.1

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/fedeholc/full-size-insta-extension/blob/master/README.md)

**Extensión de Google Chrome para ver las imágenes de IG a tamaño completo.**

## Instalación desde la Chrome Web Store

- Descargar e instalar desde [aquí](https://chrome.google.com/webstore/detail/instagram-full-size-photo/eanpijghoobafibemccmoleollpjhcgg).

## Instalación manual

1. Clonar el repositorio o descargar el archivo ZIP con el código ( Code > Download ZIP, desde la página principal del repositorio) y luego descomprimir el archivo ZIP descargado.
2. En Chrome, ir a chrome://extensions/.
3. Activar el "Modo desarrollador" (Developer Mode).
4. Hacer click en "Cargar descomprimida" (Load Unpacked").
5. Seleccionar la carpeta que tiene el código de la extensión.
6. Hacer click en el ícono de extensiones y luego en el ícono con el pin de la extensión para hacerla visible en la barra de herramientas.
7. Listo! La extensión está instalada y lista para usarse.

## Cómo usarla

Una vez instalada, cuando entres en la web de Instagram, cada imagen tendrá un icono en forma de lupa en la esquina superior derecha. Al hacer click en el icono se abrirá la imagen a tamaño completo. Si haces click en la imagen (o presionas `Esc`), volverás a la pantalla anterior.

Si el post es un carrusel, puedes pasar las imágenes con las flechas izquierda y derecha del teclado, o con las flechas que aparecen en el visor a tamaño completo. Un contador en la esquina indica qué foto estás viendo.

### Galería del perfil

Al entrar al perfil de un usuario (por ejemplo `https://www.instagram.com/rafabadia64/`) aparece un botón **View as full size gallery** en la parte inferior de la pantalla. Al hacer click se abre una galería a tamaño completo con todas las fotos del usuario, en orden: recorre todas las imágenes de cada carrusel y después continúa con el siguiente post. Usa las flechas izquierda y derecha del teclado (o las flechas del visor) para moverte por la galería, y `Esc` para cerrarla.

A medida que te acercas al final se van cargando automáticamente más fotos. Para no esperar al llegar a un carrusel, la extensión precarga en segundo plano los próximos carruseles (y deja sus imágenes en la caché del navegador) antes de que llegues. Si Instagram no expone los datos completos de un perfil, la galería usa las fotos disponibles en la grilla del perfil y sigue cargando más scrolleando el perfil por detrás (al cerrar la galería se restaura la posición del scroll). Cuando un carrusel aparece en la grilla solo con su portada, la extensión abre el post por detrás (oculto detrás del visor) para obtener el resto de sus imágenes.

Cuando estás viendo una foto o un carrusel de forma individual (con la lupa) y llegas a su última imagen, aparece un botón **Continue in gallery mode**. Cambia a la galería completa del autor comenzando por la imagen que estabas viendo, en lugar de arrancar desde el principio. Funciona igual si la imagen se abrió desde un perfil o desde el feed.

Si Instagram no expone los datos del perfil, la extensión abre el perfil del autor por detrás del visor y usa su grilla para cargar la galería; al cerrarla vuelve automáticamente a la página donde estabas.

### Home del feed

En la página principal de Instagram (`https://www.instagram.com/`), mientras ves una foto o un carrusel con la lupa aparece el botón **View user images in gallery mode**. Abre la galería del autor del post, empezando por la imagen que estás viendo. En la home el botón está disponible desde cualquier imagen, no solo al final del post. Es la misma galería que se abre desde el perfil del usuario.

Sólo funciona con fotos (tanto del feed principal como del perfil de cada usuario), pero no con vídeos o reels.

## Licencia

- [![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/) Este proyecto está bajo la Licencia GPL v3 - vea el archivo [LICENSE.md](LICENSE.md) para más detalles.

## Autor

👤 **Federico Holc** [@fedeholc](https://github.com/fedeholc)
