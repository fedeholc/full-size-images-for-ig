function loadExtension() {
  const images = document.querySelectorAll("article div img");

  images.forEach((image) => {
    // Dado que el evento de agregar el boton de zoom se dispara
    // cada vez que se mueve el mouse, marco como modificada la
    // imagen que ya lo tiene para no repetir.

    if (image.classList.contains("modified")) {
    } else {
      image.classList.add("modified");
      console.log(image.alt);

      //solo afecta a las fotos del feed y no videos ni imagenes en otras partes
      if (
        image.alt.includes("Photo by") ||
        image.alt.includes("Photo shared by")
      ) {
        let zoomButton = document.createElement("button");
        zoomButton.textContent = "🔍";
        zoomButton.style.zIndex = "1";
        zoomButton.style.border = "2px solid transparent";
        zoomButton.style.backgroundColor = "transparent";
        zoomButton.style.position = "absolute";
        zoomButton.style.borderRadius = "5px";
        zoomButton.style.right = "5px";
        zoomButton.style.top = "5px";
        zoomButton.style.cursor = "pointer";

        zoomButton.addEventListener(
          "mouseover",
          () => (zoomButton.style.border = "2px solid deeppink")
        );
        zoomButton.addEventListener(
          "mouseout",
          () => (zoomButton.style.border = "2px solid transparent")
        );

        zoomButton.addEventListener("click", (event) => {
          // esto es para que al mirar imagenes de un perfil y hacer click en el zoom
          // se prevenga que se abra el modal de instagram que te muestra la imagen
          event.stopPropagation();
          event.preventDefault();

          // crea un container que ocupa toda la pantalla y se posiciona sobre los demás elementos
          let zoomContainer = document.createElement("div");
          zoomContainer.style.backgroundColor = "black";
          zoomContainer.style.height = "100%";
          zoomContainer.style.width = "100%";
          zoomContainer.style.zIndex = "5000 !important";
          zoomContainer.style.top = "0";
          zoomContainer.style.left = "0";
          zoomContainer.style.position = "fixed";
          zoomContainer.style.display = "flex";
          zoomContainer.style.justifyContent = "center";

          // hace que no se pueda seguir scrolleando cuando se esta viendo la imagen con zoom
          // document.querySelector("body").style.overflowY = "hidden";
          // FIXME: lo quité porque hace que al volver vaya al comienzo del perfil y es molesto
          // si uno quiere ir viendo varias fotos
          // habría que probar si se pueden ocultar y volver a poner las scrollbarse sin que afecte
          // la posicion de la página

          zoomContainer.addEventListener(
            "click",
            (event) => {
              // oculto el zoomContainer y devuelvo la scrollbar
              event.currentTarget.style.display = "none";
              //document.querySelector("body").style.overflowY = "visible";
              //ver FIXME: anterior
            },
            { capture: true }
          );
          document.querySelector("body").appendChild(zoomContainer);

          let bigImage = document.createElement("img");
          bigImage.style.maxHeight = "100%";

          // para obtener la url de la imagen en grande
          // como el boton de zoom está dentro de un div y es hermano de la imagen
          // (pero está despues, es decir, hay un div que tiene primero la img y luego el boton)
          // hay que ir al padre del boton y seleccionar el primer hijo (la img, y su src)
          bigImage.src = event.target.parentNode.firstChild.src;

          // todo: ponerlo como opción en el popup o settings o combinación tecla
          /* //open image in new tab
          window.open(bigImage.src); */

          zoomContainer.appendChild(bigImage);
        });

        image.parentNode.appendChild(zoomButton); // el boton se pone en el div que es padre de la imagen
      }
    }
  });
}

// es una forma un poco desprolija de insertar los botones pero aún no encontré otra mejor
// el problema es cómo hacer que se vayan insertando a medida que se van viendo nuevas
// imagenes al bajar en el feed.
// TODO: probar con el mutation observer si es posible determinar
//? que lo que se modificó fue el agregado de imágenes.
// TODO: probar con algún evento de scrolling.
document.addEventListener("mousemove", loadExtension);
