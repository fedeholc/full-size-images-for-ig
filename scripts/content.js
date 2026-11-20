// Full Size Images for IG
// Muestra las imágenes de Instagram a tamaño completo y permite recorrer
// los carruseles con las flechas del teclado.

const STYLE_ID = "fse-styles";

// estado del visor a pantalla completa (null si está cerrado)
let overlay = null;

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .fse-zoom-button {
      position: absolute !important;
      top: 5px !important;
      right: 5px !important;
      z-index: 2 !important;
      padding: 2px !important;
      margin: 0 !important;
      border: 2px solid transparent !important;
      border-radius: 5px !important;
      background: transparent !important;
      font-size: 16px !important;
      line-height: 1 !important;
      cursor: pointer !important;
    }
    .fse-zoom-button:hover,
    .fse-zoom-button:focus-visible {
      border-color: deeppink !important;
      outline: none !important;
    }

    .fse-overlay {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #000 !important;
      cursor: zoom-out;
      overflow: hidden;
    }

    .fse-overlay .fse-image {
      max-width: 100vw !important;
      max-height: 100vh !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      user-select: none;
      -webkit-user-drag: none;
    }

    .fse-overlay .fse-counter,
    .fse-overlay .fse-loading {
      position: absolute !important;
      top: 16px !important;
      left: 16px !important;
      padding: 4px 10px !important;
      border-radius: 999px !important;
      background: rgba(0, 0, 0, 0.55) !important;
      color: #fff !important;
      font: 600 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    .fse-overlay .fse-loading {
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
    }

    .fse-overlay .fse-close,
    .fse-overlay .fse-nav {
      position: absolute !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 44px !important;
      height: 44px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 50% !important;
      background: rgba(0, 0, 0, 0.45) !important;
      color: #fff !important;
      font: 400 30px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      cursor: pointer !important;
    }
    .fse-overlay .fse-close:hover,
    .fse-overlay .fse-nav:hover:not([disabled]) {
      background: rgba(255, 255, 255, 0.2) !important;
    }

    .fse-overlay .fse-nav {
      top: 50% !important;
      transform: translateY(-50%) !important;
    }
    .fse-overlay .fse-nav[disabled] {
      opacity: 0.25 !important;
      cursor: default !important;
    }

    .fse-overlay .fse-prev { left: 16px !important; }
    .fse-overlay .fse-next { right: 16px !important; }

    .fse-overlay .fse-close {
      top: 12px !important;
      right: 12px !important;
      font-size: 20px !important;
    }
  `;

  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

// Devuelve la url de mayor calidad disponible para una imagen.
function getImageSrc(image) {
  if (!image) return "";

  const srcset = image.getAttribute("srcset") || "";
  let bestFromSrcset = "";
  let bestSize = -1;

  srcset.split(",").forEach((entry) => {
    const [url, descriptor] = entry.trim().split(/\s+/);
    if (!url) return;

    const size = descriptor ? parseFloat(descriptor) : 1;
    if (size > bestSize) {
      bestSize = size;
      bestFromSrcset = url;
    }
  });

  const candidates = [image.currentSrc, bestFromSrcset, image.src];

  return (
    candidates.find((src) => src && !/^(data|blob):/.test(src)) || ""
  );
}

// Busca todas las imágenes que forman parte del mismo post, en orden.
// En los carruseles de Instagram cada slide es un <li> con una <img>.
function findSlides(image) {
  // 1. La imagen está dentro de la lista del carrusel.
  const ownList = image.closest("ul");
  if (ownList) {
    const slides = [...ownList.querySelectorAll("li img")];
    if (slides.length > 1 && slides.includes(image)) {
      return { slides, root: ownList };
    }
  }

  const post =
    image.closest("article") || image.closest('[role="dialog"]') || null;

  if (post) {
    // 2. Buscar la lista del carrusel dentro del post (por ejemplo cuando se
    //    abre el modal de un post desde el perfil).
    for (const list of post.querySelectorAll("ul")) {
      const slides = [...list.querySelectorAll("li img")];
      if (slides.length > 1 && slides.includes(image)) {
        return { slides, root: list };
      }
    }

    // 3. Último recurso: el resto de imágenes grandes del post (descarta
    //    avatares e iconos, que son pequeños).
    const bigImages = [...post.querySelectorAll("img")].filter(
      (img) => img === image || (img.width > 149 && getImageSrc(img))
    );
    if (bigImages.length > 1) {
      return { slides: bigImages, root: post };
    }
  }

  return { slides: [image], root: null };
}

// Busca los botones de anterior/siguiente del carrusel de Instagram.
// Se usan para mantener sincronizado el carrusel original mientras se navega
// a pantalla completa (así IG precarga las imágenes y al cerrar el visor
// queda seleccionada la misma foto).
function findIgNavButton(root, direction) {
  if (!root) return null;

  const scope =
    root.closest("article") ||
    root.closest('[role="dialog"]') ||
    root.parentElement ||
    document;

  const label =
    direction === "next"
      ? /next|siguiente|siguente/i
      : /prev|previous|anterior|atr[aá]s|back/i;

  const buttons = [...scope.querySelectorAll('button, [role="button"]')];

  return (
    buttons.find((button) =>
      label.test(button.getAttribute("aria-label") || "")
    ) || null
  );
}

// Espera a que Instagram cargue el src de una imagen del carrusel.
function waitForImageSrc(image, timeout = 5000) {
  return new Promise((resolve) => {
    if (getImageSrc(image)) {
      resolve(true);
      return;
    }

    let finished = false;

    const finish = (loaded) => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(loaded);
    };

    const observer = new MutationObserver(() => {
      if (getImageSrc(image)) finish(true);
    });

    observer.observe(image, {
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });

    const timer = setTimeout(() => finish(false), timeout);
  });
}

/* ------------------------------------------------------------------ */
/* Visor a pantalla completa                                           */
/* ------------------------------------------------------------------ */

function createNavButton(direction, symbol, title, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `fse-nav fse-${direction}`;
  button.textContent = symbol;
  button.title = title;
  button.setAttribute("aria-label", ariaLabel);
  return button;
}

function openOverlay(anchorImage) {
  injectStyles();
  closeOverlay();

  const { slides, root } = findSlides(anchorImage);
  const startIndex = Math.max(0, slides.indexOf(anchorImage));

  const container = document.createElement("div");
  container.className = "fse-overlay";

  const image = document.createElement("img");
  image.className = "fse-image";
  image.draggable = false;
  image.alt = anchorImage.alt || "";

  const counter = document.createElement("div");
  counter.className = "fse-counter";

  const loading = document.createElement("div");
  loading.className = "fse-loading";
  loading.textContent = "Cargando…";

  const prevButton = createNavButton(
    "prev",
    "‹",
    "Imagen anterior (←)",
    "Previous image"
  );
  prevButton.addEventListener("click", (event) => {
    event.stopPropagation();
    navigate(-1);
  });

  const nextButton = createNavButton(
    "next",
    "›",
    "Imagen siguiente (→)",
    "Next image"
  );
  nextButton.addEventListener("click", (event) => {
    event.stopPropagation();
    navigate(1);
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "fse-close";
  closeButton.textContent = "✕";
  closeButton.title = "Cerrar (Esc)";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeOverlay();
  });

  container.append(
    image,
    counter,
    loading,
    prevButton,
    nextButton,
    closeButton
  );

  // al hacer click en cualquier lado (menos en los botones) se cierra
  container.addEventListener("click", closeOverlay);

  // evita que se scrollee la página que está detrás del visor
  container.addEventListener("wheel", (event) => event.preventDefault(), {
    passive: false,
  });

  document.body.appendChild(container);

  overlay = {
    container,
    image,
    counter,
    loading,
    prevButton,
    nextButton,
    slides,
    root,
    index: startIndex,
  };

  renderCurrentSlide();
}

function closeOverlay() {
  if (!overlay) return;
  overlay.container.remove();
  overlay = null;
}

// Vuelve a leer las slides del carrusel, por si Instagram agregó nuevas
// imágenes mientras se navega.
function getSlidesNow() {
  if (!overlay) return [];

  if (overlay.root && overlay.root.tagName === "UL") {
    const fresh = [...overlay.root.querySelectorAll("li img")];
    if (fresh.length) return fresh;
  }

  return overlay.slides;
}

function renderCurrentSlide() {
  if (!overlay) return;

  const { image, counter, loading, prevButton, nextButton } = overlay;
  const slides = getSlidesNow();

  if (!slides.length) {
    closeOverlay();
    return;
  }

  if (overlay.index > slides.length - 1) {
    overlay.index = slides.length - 1;
  }

  const slide = slides[overlay.index];
  const multiple = slides.length > 1;

  counter.textContent = multiple
    ? `${overlay.index + 1} / ${slides.length}`
    : "";
  counter.style.display = multiple ? "block" : "none";

  prevButton.style.display = multiple ? "flex" : "none";
  nextButton.style.display = multiple ? "flex" : "none";
  prevButton.disabled = overlay.index <= 0;
  nextButton.disabled = overlay.index >= slides.length - 1;

  const src = getImageSrc(slide);

  if (src) {
    loading.style.display = "none";
    image.style.visibility = "visible";
    if (image.src !== src) image.src = src;
    return;
  }

  // Instagram todavía no cargó esta slide (las imágenes del carrusel se van
  // cargando a medida que se navega). Esperamos a que aparezca el src.
  image.style.visibility = "hidden";
  loading.textContent = "Cargando…";
  loading.style.display = "block";

  const expectedIndex = overlay.index;

  waitForImageSrc(slide).then((loaded) => {
    if (!overlay || overlay.index !== expectedIndex) return;

    if (!loaded) {
      loading.textContent = "No se pudo cargar la imagen";
      return;
    }

    loading.style.display = "none";

    const loadedSrc = getImageSrc(slide);
    if (loadedSrc && image.src !== loadedSrc) image.src = loadedSrc;
    image.style.visibility = "visible";
  });
}

function navigate(delta) {
  if (!overlay) return;

  const slides = getSlidesNow();
  const nextIndex = Math.min(
    slides.length - 1,
    Math.max(0, overlay.index + delta)
  );

  if (nextIndex === overlay.index) return;

  // Mantiene sincronizado el carrusel de Instagram.
  const igButton = findIgNavButton(
    overlay.root,
    delta > 0 ? "next" : "prev"
  );

  if (igButton && !igButton.disabled) {
    try {
      igButton.click();
    } catch (error) {
      console.warn("Full Size Images for IG:", error);
    }
  }

  overlay.index = nextIndex;
  renderCurrentSlide();
}

/* ------------------------------------------------------------------ */
/* Botones de zoom                                                     */
/* ------------------------------------------------------------------ */

function loadExtension() {
  // Antes:
  //   const images = document.querySelectorAll("article div img");
  // ahora (toma también las que están en secuencia y en perfiles)
  const images = document.querySelectorAll("._aagu img");

  images.forEach((image) => {
    // Dado que el evento de agregar el botón de zoom se dispara
    // cada vez que se mueve el mouse, marco como modificada la
    // imagen que ya lo tiene para no repetir.
    if (image.classList.contains("modified")) return;

    image.classList.add("modified");
    injectStyles();

    const alt = image.alt || "";

    // solo afecta a las fotos del feed y no videos ni imágenes en otras partes
    if (
      !alt.includes("Photo by") &&
      !alt.includes("Photo shared by") &&
      !(image.height > 299)
    ) {
      return;
    }

    const zoomButton = document.createElement("button");
    zoomButton.type = "button";
    zoomButton.className = "fse-zoom-button";
    zoomButton.textContent = "🔍";
    zoomButton.title = "Ver a tamaño completo";
    zoomButton.setAttribute("aria-label", "View image at full size");

    zoomButton.addEventListener("click", (event) => {
      // esto es para que al mirar imágenes de un perfil y hacer click en el zoom
      // se prevenga que se abra el modal de instagram que te muestra la imagen
      event.stopPropagation();
      event.preventDefault();

      openOverlay(image);
    });

    // el botón se pone en el div que es padre de la imagen
    image.parentNode.appendChild(zoomButton);
  });
}

// Flechas del teclado: pasan las imágenes del carrusel y Esc cierra el visor.
// Se escucha en window/captura para que Instagram no procese las teclas
// (por ejemplo, para que no cambie de post al mismo tiempo).
window.addEventListener(
  "keydown",
  (event) => {
    if (!overlay) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(-1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeOverlay();
    }
  },
  true
);

// es una forma un poco desprolija de insertar los botones pero aún no encontré otra mejor
// el problema es cómo hacer que se vayan insertando a medida que se van viendo nuevas
// imagenes al bajar en el feed.
// TODO: probar con el mutation observer si es posible determinar
//? que lo que se modificó fue el agregado de imágenes.
// TODO: probar con algún evento de scrolling.
let lastScan = 0;

function scheduleLoadExtension() {
  const now = Date.now();
  if (now - lastScan < 250) return;
  lastScan = now;
  loadExtension();
}

document.addEventListener("mousemove", scheduleLoadExtension);
document.addEventListener("scroll", scheduleLoadExtension, { capture: true });
