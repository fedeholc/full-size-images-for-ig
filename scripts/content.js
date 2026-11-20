// Full Size Images for IG
// - Lupa sobre cada foto para verla a tamaño completo (con navegación de
//   carruseles con las flechas del teclado).
// - Botón "View as full size gallery" en los perfiles para recorrer todas las
//   fotos del usuario, incluyendo todas las imágenes de cada carrusel.
// - En el visor individual, botón "Continue in gallery mode" para pasar a la
//   galería del autor desde la imagen que se está viendo.

const STYLE_ID = "fse-styles";
const GALLERY_BUTTON_ID = "fse-gallery-button";

// id de la app web de Instagram (necesario para los endpoints internos)
const IG_APP_ID = "936619743392459";

// tope de seguridad para no cargar perfiles gigantes sin límite
const MAX_GALLERY_IMAGES = 2000;

// cuántos carruseles siguientes se van precargando mientras se navega
const GALLERY_PREFETCH_AHEAD = 5;

// máximo de imágenes que se mantienen "calentadas" en la caché del navegador
const MAX_WARMED_IMAGES = 400;

// páginas extra que se buscan para ubicar el post al continuar en la galería
const GALLERY_TARGET_SEARCH_PAGES = 5;

// rutas de Instagram que no son perfiles de usuario
const RESERVED_PATHS = new Set([
  "about",
  "accounts",
  "api",
  "challenge",
  "creator",
  "developer",
  "direct",
  "directory",
  "emails",
  "embed",
  "explore",
  "graphql",
  "invites",
  "legal",
  "lite",
  "nominate",
  "oauth",
  "p",
  "popular",
  "press",
  "privacy",
  "reel",
  "reels",
  "session",
  "share",
  "stories",
  "terms",
  "topics",
  "tv",
  "web",
  "your_activity",
]);

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

    #fse-gallery-button {
      position: fixed !important;
      left: 50% !important;
      bottom: 20px !important;
      transform: translateX(-50%) !important;
      z-index: 2147483000 !important;
      padding: 10px 16px !important;
      margin: 0 !important;
      border: 2px solid transparent !important;
      border-radius: 999px !important;
      background: #0095f6 !important;
      color: #fff !important;
      font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      letter-spacing: 0.01em !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35) !important;
      cursor: pointer !important;
    }
    #fse-gallery-button:hover,
    #fse-gallery-button:focus-visible {
      background: #1877f2 !important;
      border-color: #fff !important;
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

    .fse-overlay .fse-continue {
      position: absolute !important;
      left: 50% !important;
      bottom: 22px !important;
      transform: translateX(-50%) !important;
      z-index: 2 !important;
      padding: 10px 16px !important;
      margin: 0 !important;
      border: 2px solid transparent !important;
      border-radius: 999px !important;
      background: #0095f6 !important;
      color: #fff !important;
      font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      letter-spacing: 0.01em !important;
      white-space: nowrap !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35) !important;
      cursor: pointer !important;
    }
    .fse-overlay .fse-continue:hover,
    .fse-overlay .fse-continue:focus-visible {
      background: #1877f2 !important;
      border-color: #fff !important;
      outline: none !important;
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

// Variante de getImageSrc que prioriza la resolución más grande del srcset
// (útil para reconocer la misma imagen dentro de la galería).
function getBestImageSrc(image) {
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

  return bestFromSrcset || getImageSrc(image);
}

// Mantiene una caché de imágenes ya pedidas al servidor para que al navegar
// aparezcan sin esperar. Se guarda una lista acotada para no crecer sin límite.
const warmedImages = new Set();
const warmedImageOrder = [];
const warmedImageRefs = [];

function warmImage(url) {
  if (!url || warmedImages.has(url)) return;

  warmedImages.add(url);
  warmedImageOrder.push(url);

  if (warmedImageOrder.length > MAX_WARMED_IMAGES) {
    const oldest = warmedImageOrder.shift();
    warmedImages.delete(oldest);
  }

  const image = new Image();
  image.decoding = "async";
  image.src = url;

  // Se mantienen algunas referencias para que el navegador no cancele la
  // descarga, sin retener demasiadas imágenes decodificadas en memoria.
  warmedImageRefs.push(image);
  if (warmedImageRefs.length > 60) warmedImageRefs.shift();
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
    const bigImages = [...post.querySelectorAll("img")].filter((img) => {
      if (img === image) return true;

      const width = Math.max(
        img.width || 0,
        img.naturalWidth || 0,
        parseInt(img.getAttribute("width") || "0", 10) || 0
      );

      return width > 149 && getImageSrc(img);
    });
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

// Crea el visor vacío (sin imágenes) y lo deja como visor activo.
function createOverlayState() {
  injectStyles();
  closeOverlay();

  const container = document.createElement("div");
  container.className = "fse-overlay";

  const image = document.createElement("img");
  image.className = "fse-image";
  image.draggable = false;

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

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.className = "fse-continue";
  continueButton.textContent = "Continue in gallery mode";
  continueButton.title = "Continuar en modo galería desde esta imagen";
  continueButton.setAttribute("aria-label", "Continue in gallery mode");
  continueButton.style.display = "none";
  continueButton.addEventListener("click", (event) => {
    event.stopPropagation();
    continueInGallery();
  });

  container.append(
    image,
    counter,
    loading,
    prevButton,
    nextButton,
    closeButton,
    continueButton
  );

  // al hacer click en cualquier lado (menos en los botones) se cierra
  container.addEventListener("click", closeOverlay);

  // evita que se scrollee la página que está detrás del visor
  container.addEventListener("wheel", (event) => event.preventDefault(), {
    passive: false,
  });

  document.body.appendChild(container);

  const state = {
    container,
    image,
    counter,
    loading,
    prevButton,
    nextButton,
    continueButton,
    slides: [],
    root: null,
    index: 0,
    // modo galería de perfil: { images, hasMore, ... } y loader de páginas
    gallery: null,
    loadMore: null,
    restoreScroll: null,
    // datos del post para el botón "Continue in gallery mode"
    continueTarget: null,
    // lista completa del carrusel obtenida de la API (si el DOM viene parcial)
    useApiSlides: false,
    mayBeCarousel: false,
    // evita navegar mientras se está preparando la galería
    loadingGallery: false,
  };

  overlay = state;
  return state;
}

// Abre el visor sobre una imagen del feed/perfil (con su carrusel).
function openOverlay(anchorImage) {
  const { slides, root } = findSlides(anchorImage);

  const state = createOverlayState();
  state.slides = slides;
  state.root = root;
  state.index = Math.max(0, slides.indexOf(anchorImage));
  state.image.alt = anchorImage.alt || "";
  state.continueTarget = galleryTargetFromImage(anchorImage);

  // Puede ser un carrusel aunque el DOM solo muestre una parte (o solo la
  // portada, en el caso de una tarjeta de la grilla).
  const postAnchor = anchorImage.closest(
    'a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]'
  );
  const ownList = anchorImage.closest("ul");
  const listItems = ownList ? ownList.querySelectorAll("li").length : 0;

  state.mayBeCarousel =
    slides.length > 1 ||
    listItems > 1 ||
    !!(postAnchor && isCarouselTile(postAnchor));

  renderCurrentSlide();

  // El DOM de Instagram a veces solo tiene cargadas algunas imágenes del
  // carrusel; completamos la lista con los datos del post.
  completeOverlayCarousel(state).catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Contexto del post para continuar en la galería                      */
/* ------------------------------------------------------------------ */

function profileUsernameFromHref(href) {
  if (!href) return "";

  try {
    const path = new URL(href, location.origin).pathname;
    const match = path.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
    if (!match) return "";

    const username = match[1];
    return RESERVED_PATHS.has(username.toLowerCase()) ? "" : username;
  } catch (error) {
    return "";
  }
}

// Busca el autor del post en el encabezado (o, si no, en el texto alternativo
// de la imagen). En la grilla del perfil usa directamente el perfil actual.
function postUsernameFromElement(container, image) {
  if (container) {
    const scope = container.querySelector("header") || container;

    for (const link of scope.querySelectorAll("a[href]")) {
      const username = profileUsernameFromHref(link.getAttribute("href"));
      if (username) return username;
    }
  }

  const profile = getProfileUsername();
  if (profile) return profile;

  const alt = (image && image.alt) || "";
  const match = alt.match(
    /(?:Photo(?:\s+shared)?\s+by|Foto(?:\s+compartida)?\s+(?:de|por))\s+@?([A-Za-z0-9._]+)/i
  );

  return match ? match[1] : "";
}

function postCodeFromElement(container, image) {
  const fromUrl = location.pathname.match(POST_HREF_PATTERN);
  if (fromUrl) return fromUrl[1];

  const anchor =
    (image &&
      image.closest('a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]')) ||
    (container &&
      container.querySelector(
        'a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]'
      ));

  const href = anchor && anchor.getAttribute("href");
  const match = href && href.match(POST_HREF_PATTERN);
  return match ? match[1] : "";
}

// Datos necesarios para abrir la galería del autor en la imagen que se está
// viendo (y para completar el carrusel desde la API).
function galleryTargetFromImage(image) {
  if (!image) return null;

  const container =
    image.closest("article") || image.closest('[role="dialog"]') || null;

  const username = postUsernameFromElement(container, image);
  const code = postCodeFromElement(container, image);

  if (!username && !code) return null;

  return { username, code };
}

// Ubica la imagen actual del DOM dentro de la lista completa de la API.
// Instagram puede montar solo una ventana de slides, así que probamos con qué
// desplazamiento se alinean mejor las URLs conocidas.
function apiIndexForOverlaySlides(domSlides, urls, currentIndex) {
  const apiKeys = urls.map((url) => imageUrlKey(url));
  let bestOffset = -1;
  let bestScore = 0;

  for (
    let offset = 0;
    offset + domSlides.length <= apiKeys.length;
    offset += 1
  ) {
    let score = 0;

    for (let i = 0; i < domSlides.length; i += 1) {
      const key = imageUrlKey(slideSrc(domSlides[i]));
      if (key && key === apiKeys[offset + i]) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  if (bestOffset >= 0 && bestScore > 0) {
    return Math.min(bestOffset + currentIndex, urls.length - 1);
  }

  return Math.min(currentIndex, urls.length - 1);
}

// Completa las slides de un carrusel cuando Instagram todavía no cargó todas
// las imágenes en el DOM (por ejemplo, muestra 4 de 8).
async function completeOverlayCarousel(state) {
  const target = state.continueTarget;
  if (!target || !target.code) return;
  if (state.gallery || !state.mayBeCarousel) return;

  const urls = await carouselUrlsFromApi({ code: target.code });
  if (!urls || urls.length <= 1) return;
  if (overlay !== state) return;

  const liveSlides = getSlidesNow();
  if (!liveSlides.length || urls.length <= liveSlides.length) return;

  const index = apiIndexForOverlaySlides(liveSlides, urls, state.index);

  state.slides = urls.map((url) => ({
    src: url,
    alt: "",
    code: target.code,
  }));
  state.useApiSlides = true;
  state.index = index;

  urls.forEach(warmImage);
  renderCurrentSlide();
}

// Abre el visor con todas las fotos del perfil. Si recibe un `target`
// ({ code, offset, src }), arranca en esa imagen en lugar del principio.
function openGalleryOverlay(username, target = null) {
  const state = createOverlayState();
  state.restoreScroll = savePageScroll();
  state.loadingGallery = true;

  state.loading.textContent = target
    ? "Cargando galería desde esta imagen…"
    : "Cargando galería…";
  state.loading.style.display = "block";
  renderCurrentSlide();

  createGallery(username)
    .then(async (gallery) => {
      if (overlay !== state) return;

      state.gallery = gallery;
      state.slides = gallery.images;
      state.loadMore = () => loadNextGalleryPage(gallery);
      state.index = await resolveGalleryStart(gallery, target, state);

      if (overlay !== state) return;

      state.loadingGallery = false;
      state.loading.style.display = "none";
      renderCurrentSlide();
      warmUpcomingSlides(state);

      // Empezamos a precargar los próximos carruseles apenas se abre la
      // galería. Se espera un instante para no competir con la primera imagen.
      setTimeout(() => {
        if (overlay === state) scheduleGalleryPrefetch(state);
      }, 600);
    })
    .catch((error) => {
      console.warn("Full Size Images for IG:", error);
      if (overlay !== state) return;

      state.loadingGallery = false;
      state.loading.textContent = "No se pudo cargar la galería";
    });
}

// Pasa del visor individual al modo galería, empezando por la imagen actual.
function continueInGallery() {
  const state = overlay;
  if (!state || state.gallery || !state.continueTarget) return;

  const username = state.continueTarget.username;
  if (!username) return;

  const slides = getSlidesNow();
  const current = slides[state.index];

  openGalleryOverlay(username, {
    code: state.continueTarget.code,
    offset: state.index,
    src:
      current instanceof HTMLImageElement
        ? getBestImageSrc(current)
        : slideSrc(current),
  });
}

function imageUrlKey(url) {
  const clean = String(url || "").split("?")[0].split("#")[0];
  const parts = clean.split("/");

  // El nombre de archivo identifica la imagen aunque cambie la resolución
  // (Instagram usa el mismo nombre para las distintas versiones).
  return parts[parts.length - 1] || clean;
}

function sameImageUrl(a, b) {
  const keyA = imageUrlKey(a);
  const keyB = imageUrlKey(b);
  return !!keyA && keyA === keyB;
}

// Índices de la galería que pertenecen al mismo post (portada + carrusel).
function galleryTargetGroup(gallery, code) {
  const group = [];
  if (!code) return group;

  gallery.images.forEach((slide, index) => {
    if (slide.code === code) group.push(index);
  });

  return group;
}

function galleryIndexForTarget(gallery, target) {
  if (!target) return -1;

  if (target.code) {
    const group = galleryTargetGroup(gallery, target.code);

    if (group.length) {
      // Primero intentamos la misma URL; si no, usamos la posición dentro del
      // carrusel (el botón aparece en la última imagen del post).
      const bySrc = group.find((index) =>
        sameImageUrl(gallery.images[index].src, target.src)
      );

      if (bySrc !== undefined) return bySrc;

      const offset = Math.max(0, target.offset || 0);
      return group[Math.min(offset, group.length - 1)];
    }
  }

  if (target.src) {
    const index = gallery.images.findIndex((slide) =>
      sameImageUrl(slide.src, target.src)
    );

    if (index >= 0) return index;
  }

  return -1;
}

// Si de la galería solo teníamos la portada del carrusel, lo completamos para
// poder ubicar la imagen exacta en la que estaba el usuario.
async function completeTargetCarousel(gallery, target, state) {
  if (!target || !target.code) return;

  const group = galleryTargetGroup(gallery, target.code);
  const cover = group
    .map((index) => gallery.images[index])
    .find((slide) => slide && slide.isCarousel);

  if (!cover) return;

  state.loading.textContent = "Cargando carrusel…";
  state.loading.style.display = "block";

  try {
    await expandCarousel(gallery, cover);
  } catch (error) {
    // si falla, seguimos con la portada
  }
}

// Si el post no aparece en las páginas cargadas (por ejemplo, una foto vieja
// abierta desde el feed), la agregamos al principio para poder empezar en ella.
function prependTargetImage(gallery, target) {
  if (!target || !target.code || !target.src) return -1;
  if (gallery.images.length >= MAX_GALLERY_IMAGES) return -1;

  gallery.seenUrls.add(target.src);
  gallery.images.unshift({
    src: target.src,
    alt: "",
    code: target.code,
    isCarousel: false,
  });

  return 0;
}

async function resolveGalleryStart(gallery, target, state) {
  if (!target) return 0;

  let index = galleryIndexForTarget(gallery, target);
  let attempts = 0;

  // El post puede estar en una página siguiente de la API: buscamos un poco.
  while (
    index < 0 &&
    gallery.hasMore &&
    gallery.source === "api" &&
    attempts < GALLERY_TARGET_SEARCH_PAGES
  ) {
    attempts += 1;
    state.loading.textContent = "Buscando la imagen…";
    state.loading.style.display = "block";

    try {
      await loadNextGalleryPage(gallery);
    } catch (error) {
      break;
    }

    if (overlay !== state) return 0;
    index = galleryIndexForTarget(gallery, target);
  }

  if (index < 0) index = prependTargetImage(gallery, target);

  if (index >= 0) {
    await completeTargetCarousel(gallery, target, state);
    if (overlay !== state) return 0;

    index = galleryIndexForTarget(gallery, target);
  }

  return index >= 0 ? index : 0;
}

function closeOverlay() {
  if (!overlay) return;

  const { container, gallery, restoreScroll } = overlay;

  // corta cualquier carga de la grilla que esté en curso
  if (gallery) gallery.cancelled = true;

  container.remove();
  overlay = null;

  restorePageScroll(restoreScroll);
}

// Vuelve a leer las slides del carrusel, por si Instagram agregó nuevas
// imágenes mientras se navega.
function getSlidesNow() {
  if (!overlay) return [];

  if (overlay.useApiSlides) return overlay.slides;

  if (overlay.root && overlay.root.tagName === "UL") {
    const fresh = [...overlay.root.querySelectorAll("li img")];
    if (fresh.length) return fresh;
  }

  return overlay.slides;
}

// Las slides del carrusel son <img> del DOM; las de la galería de perfil son
// objetos { src, alt }.
function slideSrc(slide) {
  if (!slide) return "";
  if (slide instanceof HTMLImageElement) return getImageSrc(slide);
  return slide.src || "";
}

function galleryHasMore(state) {
  return !!(state.gallery && state.gallery.hasMore);
}

function renderCurrentSlide() {
  if (!overlay) return;

  const state = overlay;
  const { image, counter, loading, prevButton, nextButton, continueButton } =
    state;
  const slides = getSlidesNow();

  if (!slides.length) {
    counter.style.display = "none";
    prevButton.style.display = "none";
    nextButton.style.display = "none";
    continueButton.style.display = "none";
    return;
  }

  if (state.index > slides.length - 1) {
    state.index = slides.length - 1;
  }

  // El botón para seguir en la galería aparece en el visor individual cuando
  // ya no quedan más imágenes de este post/carrusel.
  const atEnd = state.index >= slides.length - 1;
  const canContinue =
    !state.gallery &&
    !state.loadingGallery &&
    !!state.continueTarget &&
    !!state.continueTarget.username &&
    atEnd;

  continueButton.style.display = canContinue ? "block" : "none";

  const hasMore = galleryHasMore(state);
  const multiple = slides.length > 1 || hasMore;

  if (state.gallery) {
    counter.textContent = `${state.index + 1} / ${slides.length}${
      hasMore ? "+" : ""
    }`;
    counter.style.display = "block";
  } else {
    counter.textContent = multiple
      ? `${state.index + 1} / ${slides.length}`
      : "";
    counter.style.display = multiple ? "block" : "none";
  }

  prevButton.style.display = multiple ? "flex" : "none";
  nextButton.style.display = multiple ? "flex" : "none";
  prevButton.disabled = state.index <= 0;
  nextButton.disabled = state.index >= slides.length - 1 && !hasMore;

  const slide = slides[state.index];
  const src = slideSrc(slide);

  if (src) {
    loading.style.display = "none";
    image.style.visibility = "visible";
    if (image.src !== src) image.src = src;
    image.alt = typeof slide.alt === "string" ? slide.alt : "";
    return;
  }

  // Instagram todavía no cargó esta slide (las imágenes del carrusel se van
  // cargando a medida que se navega). Esperamos a que aparezca el src.
  image.style.visibility = "hidden";
  loading.textContent = "Cargando…";
  loading.style.display = "block";

  const expectedIndex = state.index;

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

async function navigate(delta) {
  const state = overlay;
  if (!state || state.loadingGallery) return;

  let slides = getSlidesNow();
  if (!slides.length) return;

  let nextIndex = state.index + delta;
  let loadingMore = false;

  // En la galería: si estamos por entrar a un carrusel cuyas imágenes todavía
  // no tenemos, las pedimos abriendo el post de Instagram (oculto detrás del
  // visor) y leyendo los datos que IG carga para ese post.
  if (delta > 0 && state.gallery) {
    const current = slides[state.index];

    if (current && current.isCarousel) {
      state.loading.textContent = "Cargando carrusel…";
      state.loading.style.display = "block";

      try {
        await ensureCarouselExpanded(state.gallery, current);
      } catch (error) {
        console.warn("Full Size Images for IG:", error);
      }

      if (overlay !== state) return;

      state.loading.style.display = "none";
      slides = getSlidesNow();
      nextIndex = state.index + delta;
    }
  }

  // En la galería del perfil: si llegamos al final de lo cargado, traemos la
  // siguiente página de fotos del usuario.
  if (delta > 0 && nextIndex >= slides.length && galleryHasMore(state)) {
    loadingMore = true;
    state.loading.textContent = "Cargando más fotos…";
    state.loading.style.display = "block";

    try {
      await state.loadMore();
    } catch (error) {
      console.warn("Full Size Images for IG:", error);
    }

    if (overlay !== state) return;

    slides = getSlidesNow();
    nextIndex = state.index + delta;
  }

  nextIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));

  if (nextIndex === state.index) {
    if (loadingMore) {
      state.loading.style.display = "none";
      renderCurrentSlide();
    }
    if (state.gallery) scheduleGalleryPrefetch(state);
    return;
  }

  // En modo carrusel, mantener sincronizado el carrusel de Instagram.
  // Si estamos usando la lista completa de la API (el DOM estaba incompleto),
  // no tocamos la navegación de Instagram para no desincronizarla.
  if (!state.gallery && !state.useApiSlides) {
    const igButton = findIgNavButton(
      state.root,
      delta > 0 ? "next" : "prev"
    );

    if (igButton && !igButton.disabled) {
      try {
        igButton.click();
      } catch (error) {
        console.warn("Full Size Images for IG:", error);
      }
    }
  }

  state.index = nextIndex;
  renderCurrentSlide();

  // En la galería, adelantar la carga de los próximos carruseles y dejar las
  // imágenes siguientes en la caché del navegador.
  if (state.gallery) {
    warmUpcomingSlides(state);
    scheduleGalleryPrefetch(state);
  }

  // Precargar la siguiente página cuando faltan pocas imágenes para el final.
  if (state.gallery && galleryHasMore(state) && nextIndex >= slides.length - 3) {
    state
      .loadMore()
      .then(() => {
        if (overlay === state) renderCurrentSlide();
      })
      .catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* Galería de un perfil                                                */
/* ------------------------------------------------------------------ */

async function fetchJson(url, options = {}) {
  const { timeout = 15000, ...rest } = options;

  const requestOptions = {
    credentials: "include",
    headers: { "x-ig-app-id": IG_APP_ID },
    ...rest,
  };

  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    const timeoutSignal = AbortSignal.timeout(timeout);

    if (!rest.signal) {
      requestOptions.signal = timeoutSignal;
    } else {
      // Combina la señal del llamador con el timeout.
      const combined = new AbortController();
      const abort = () => combined.abort();

      rest.signal.addEventListener("abort", abort);
      timeoutSignal.addEventListener("abort", abort);

      requestOptions.signal = combined.signal;
    }
  }

  const response = await fetch(url, requestOptions);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function bestImageUrl(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return "";

  const best = candidates.reduce((currentBest, candidate) => {
    const area = (item) => (item.width || 0) * (item.height || 0);
    return area(candidate) > area(currentBest) ? candidate : currentBest;
  }, candidates[0]);

  return best.url || "";
}

// Extrae las fotos (no videos) de un item de la API mobile.
function imagesFromApiItem(item) {
  if (!item) return [];

  if (Array.isArray(item.carousel_media) && item.carousel_media.length) {
    return item.carousel_media
      .filter(
        (media) =>
          media &&
          media.media_type !== 2 &&
          !/video/i.test(media.__typename || "")
      )
      .map((media) =>
        bestImageUrl(
          media.image_versions2 && media.image_versions2.candidates
        )
      )
      .filter(Boolean);
  }

  if (item.media_type !== 1) return [];

  const url = bestImageUrl(
    item.image_versions2 && item.image_versions2.candidates
  );
  return url ? [url] : [];
}

// Extrae las fotos (no videos) de un nodo GraphQL (web_profile_info).
function imagesFromGraphNode(node) {
  if (!node) return [];

  const children =
    node.edge_sidecar_to_children && node.edge_sidecar_to_children.edges;

  if (Array.isArray(children) && children.length) {
    return children
      .map((edge) => edge && edge.node)
      .filter((child) => child && !child.is_video && child.__typename !== "XIGPolarisVideoMedia")
      .map((child) => child.display_url || child.display_uri)
      .filter(Boolean);
  }

  if (node.is_video || /video/i.test(node.__typename || "")) return [];

  const url = node.display_url || node.display_uri;
  return url ? [url] : [];
}

function addGalleryImages(gallery, urls, code = "", meta = null) {
  let added = 0;

  urls.forEach((url) => {
    if (!url || gallery.seenUrls.has(url)) return;
    if (gallery.images.length >= MAX_GALLERY_IMAGES) return;

    gallery.seenUrls.add(url);

    const slide = { src: url, alt: "", code };
    if (meta && meta.mediaId) slide.mediaId = meta.mediaId;

    gallery.images.push(slide);
    added++;
  });

  return added;
}

function numericMediaId(value) {
  const id = String(value || "");
  return /^\d+$/.test(id) ? id : "";
}

// Alfabeto que usa Instagram para los shortcodes de los posts.
const SHORTCODE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Convierte el shortcode de un post ("BjNLpA1AhXM") en el id numérico del
// media, que es lo que necesita la API interna.
function mediaIdFromCode(code) {
  if (!code) return "";

  let id = 0n;

  for (const char of code) {
    const value = SHORTCODE_ALPHABET.indexOf(char);
    if (value < 0) return "";
    id = id * 64n + BigInt(value);
  }

  return id.toString();
}

// Los ids de GraphQL vienen en base64 con el formato "<mediaId>_<userId>".
function mediaIdFromGraphId(value) {
  const id = String(value || "");
  if (/^\d+$/.test(id)) return id;

  try {
    const decoded = atob(id);
    const match = decoded.match(/^(\d+)/);
    return match ? match[1] : "";
  } catch (error) {
    return "";
  }
}

function addApiPost(gallery, item) {
  if (!item) return 0;

  const postId = String(item.pk || item.id || "");
  if (postId && gallery.seenPosts.has(postId)) return 0;
  if (postId) gallery.seenPosts.add(postId);

  const code = item.code || item.shortcode || "";
  if (code && gallery.seenCodes.has(code)) return 0;

  const urls = imagesFromApiItem(item);
  if (!urls.length) return 0;

  const before = gallery.images.length;
  const mediaId = numericMediaId(item.pk || item.id);
  const added = addGalleryImages(gallery, urls, code, { mediaId });

  // Si es un carrusel y la API solo devolvió la portada, se marca para
  // completarlo después abriendo el post.
  const isCarousel =
    item.media_type === 8 || !!item.carousel_media_count;
  if (isCarousel && added <= 1 && added > 0) {
    gallery.images[before].isCarousel = true;
  }

  if (code) gallery.seenCodes.add(code);
  return added;
}

function addGraphPosts(gallery, edges) {
  if (!Array.isArray(edges)) return;

  edges.forEach((edge) => {
    const node = edge && edge.node;
    if (!node) return;

    const postId = String(node.id || node.pk || node.shortcode || "");
    if (postId && gallery.seenPosts.has(postId)) return;
    if (postId) gallery.seenPosts.add(postId);

    const code = node.code || node.shortcode || "";
    if (code && gallery.seenCodes.has(code)) return;

    const urls = imagesFromGraphNode(node);
    if (!urls.length) return;

    const before = gallery.images.length;
    const mediaId = mediaIdFromGraphId(node.id || node.pk);
    const added = addGalleryImages(gallery, urls, code, { mediaId });

    if ((node.carousel_media_count || 0) > 1 && added <= 1 && added > 0) {
      gallery.images[before].isCarousel = true;
    }

    if (code) gallery.seenCodes.add(code);
  });
}

function timelineEdgesFromUser(user) {
  if (!user) return [];

  const connection =
    user.edge_owner_to_timeline_media ||
    user.polaris_ordered_timeline_connection;

  return (connection && connection.edges) || [];
}

/* Posts del perfil que están en la grilla del DOM. */

const POST_HREF_PATTERN = /\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;

function gridPostAnchors() {
  return [
    ...document.querySelectorAll(
      'a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]'
    ),
  ];
}

// Agrega a la galería las portadas de los posts que ya están en la grilla.
function collectGridPosts(gallery) {
  let added = 0;

  gridPostAnchors().forEach((anchor) => {
    const match = (anchor.getAttribute("href") || "").match(POST_HREF_PATTERN);
    if (!match) return;

    const code = match[1];
    if (!code || gallery.seenCodes.has(code)) return;

    const image = anchor.querySelector("img");
    const src = image && getImageSrc(image);
    if (!src) return;

    const before = gallery.images.length;
    gallery.seenCodes.add(code);
    const count = addGalleryImages(gallery, [src], code);

    if (count > 0) {
      added += count;
      gallery.images[before].isCarousel = isCarouselTile(anchor);
    }
  });

  return added;
}

// En la grilla, Instagram marca los posts con carrusel con un icono.
function isCarouselTile(anchor) {
  return !!anchor.querySelector(
    'svg[aria-label*="carousel" i], svg[aria-label*="carrusel" i]'
  );
}

/* ------------------------------------------------------------------ */
/* Carruseles que solo tienen la portada (modo grilla)                  */
/* ------------------------------------------------------------------ */

function findCarouselInJson(value, code, depth = 0) {
  if (!value || depth > 25) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCarouselInJson(item, code, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== "object") return null;

  if (
    Array.isArray(value.carousel_media) &&
    value.carousel_media.length &&
    (!code || value.code === code || value.shortcode === code)
  ) {
    return value;
  }

  for (const key of Object.keys(value)) {
    if (key === "carousel_media") continue;

    const found = findCarouselInJson(value[key], code, depth + 1);
    if (found) return found;
  }

  return null;
}

// Cuando se abre un post, Instagram inyecta en el DOM un <script> JSON con
// todos los datos del post, incluidos los hijos de un carrusel.
function findCarouselPostData(code) {
  const scripts = document.querySelectorAll('script[type="application/json"]');

  for (const script of scripts) {
    const text = script.textContent || "";

    if (!/carousel_media"\s*:/.test(text)) continue;

    if (
      code &&
      !text.includes(`"code":"${code}"`) &&
      !text.includes(`"code": "${code}"`)
    ) {
      continue;
    }

    try {
      const node = findCarouselInJson(JSON.parse(text), code);
      if (node) return node;
    } catch (error) {
      // algunos scripts no son JSON válido; seguimos con el siguiente
    }
  }

  return null;
}

function imagesFromCarouselPost(node) {
  if (!node || !Array.isArray(node.carousel_media)) return [];

  return node.carousel_media
    .filter(
      (media) =>
        media &&
        media.media_type !== 2 &&
        !/video/i.test(media.__typename || "")
    )
    .map(
      (media) =>
        bestImageUrl(
          media.image_versions2 && media.image_versions2.candidates
        ) ||
        media.display_uri ||
        media.display_url
    )
    .filter(Boolean);
}

function waitForValue(getValue, timeout, interval, shouldStop) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const check = () => {
      if (shouldStop && shouldStop()) {
        resolve(null);
        return;
      }

      let value = null;
      try {
        value = getValue();
      } catch (error) {
        value = null;
      }

      if (value) {
        resolve(value);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        resolve(null);
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

function findGridAnchorByCode(code) {
  return (
    gridPostAnchors().find((anchor) => {
      const match = (anchor.getAttribute("href") || "").match(
        POST_HREF_PATTERN
      );
      return !!match && match[1] === code;
    }) || null
  );
}

function getVisibleDialog() {
  return (
    [...document.querySelectorAll('div[role="dialog"]')].find(
      (dialog) => dialog.getClientRects().length
    ) || null
  );
}

function activeDialogImage(dialog) {
  if (!dialog) return null;

  const images = [...dialog.querySelectorAll("img")].filter((image) => {
    if (!getImageSrc(image)) return false;

    const rect = image.getBoundingClientRect();
    return rect.width > 200 && rect.height > 200;
  });

  if (!images.length) return null;

  return images.sort((a, b) => {
    const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
    const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
    return areaB - areaA;
  })[0];
}

// Respaldo: si Instagram no dejó los datos del carrusel en un <script>,
// recorremos el carrusel del modal con su botón "siguiente" leyendo la imagen
// activa en cada paso.
async function harvestCarouselFromDialog(dialog, options = {}) {
  if (!dialog) return [];

  const shouldStop = options.shouldStop || (() => false);
  const maxSteps = options.maxSteps || 30;
  const urls = [];
  const seen = new Set();
  let previousSrc = "";

  for (let step = 0; step < maxSteps; step += 1) {
    if (shouldStop()) break;

    const image = activeDialogImage(dialog);

    if (image) {
      const src = getImageSrc(image);
      if (src && !seen.has(src)) {
        seen.add(src);
        urls.push(src);
      }
      previousSrc = src;
    }

    const nextButton = findIgNavButton(dialog, "next");
    if (!nextButton || nextButton.disabled) break;

    nextButton.click();

    const changed = await waitForValue(
      () => {
        const nextImage = activeDialogImage(dialog);
        const src = nextImage && getImageSrc(nextImage);
        return src && src !== previousSrc ? src : null;
      },
      2500,
      150,
      shouldStop
    );

    if (!changed) break;
  }

  return urls;
}

async function closeVisibleDialog(targetDialog = null) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Preferimos cerrar exactamente el modal que abrimos, por si había otro
    // diálogo de Instagram abierto detrás.
    const dialog =
      targetDialog && targetDialog.getClientRects().length
        ? targetDialog
        : getVisibleDialog();
    if (!dialog) return;

    const closeIcon = dialog.querySelector(
      'svg[aria-label*="close" i], svg[aria-label*="cerrar" i]'
    );
    if (!closeIcon) return;

    let target = closeIcon;
    while (
      target &&
      target !== dialog &&
      target.tagName !== "BUTTON" &&
      target.getAttribute("role") !== "button"
    ) {
      target = target.parentElement;
    }

    if (!target || target === dialog) target = closeIcon;

    target.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// Pide los datos del post a la API interna usando el id del media. Es mucho
// más rápido que abrir el modal y no interfiere con la navegación.
// Devuelve null si la API no puede resolver el carrusel (entonces se usa el
// modal como respaldo).
async function carouselUrlsFromApi(slide, signal) {
  if (!slide) return null;

  // Casi siempre se puede resolver el id a partir del shortcode, incluso para
  // las portadas que salieron de la grilla del perfil.
  const mediaId = slide.mediaId || mediaIdFromCode(slide.code);
  if (!mediaId) return null;

  slide.mediaId = mediaId;

  try {
    const data = await fetchJson(`/api/v1/media/${mediaId}/info/`, {
      signal,
      timeout: 8000,
    });
    const item = data && Array.isArray(data.items) ? data.items[0] : null;
    if (!item) return null;

    const children = Array.isArray(item.carousel_media)
      ? item.carousel_media
      : null;

    if (!children || !children.length) {
      // Si la API confirma que el post no es un carrusel, no hay nada que
      // completar. Si dice que sí pero no mandó los hijos, usamos el respaldo.
      if (typeof item.media_type === "number" && item.media_type !== 8) {
        return [];
      }
      return null;
    }

    return imagesFromApiItem(item);
  } catch (error) {
    return null;
  }
}

// Inserta las imágenes del carrusel justo después de su portada y deja las
// URLs en la caché del navegador.
function applyCarouselUrls(gallery, slide, urls) {
  const index = gallery.images.indexOf(slide);
  if (index < 0) return 0;

  const list = Array.isArray(urls) ? urls : [];

  // La primera imagen reemplaza la portada de la grilla (mejor calidad).
  if (list[0] && list[0] !== slide.src) {
    gallery.seenUrls.add(list[0]);
    slide.src = list[0];
  }

  const extras = [];

  list.slice(1).forEach((url) => {
    if (!url || gallery.seenUrls.has(url)) return;
    if (gallery.images.length >= MAX_GALLERY_IMAGES) return;

    gallery.seenUrls.add(url);
    extras.push({
      src: url,
      alt: "",
      code: slide.code,
      mediaId: slide.mediaId || "",
      isCarousel: false,
    });
  });

  if (extras.length) {
    gallery.images.splice(index + 1, 0, ...extras);

    // Si el visor estaba mostrando una imagen posterior al punto de inserción,
    // su índice se corre para seguir mostrando la misma imagen. Se hace acá
    // mismo, de forma atómica, para que no haya carreras con la precarga.
    if (overlay && overlay.gallery === gallery && overlay.index > index) {
      overlay.index += extras.length;
      if (!overlay.loadingGallery) renderCurrentSlide();
    }
  }

  slide.isCarousel = false;
  slide.expanded = true;

  list.forEach(warmImage);

  return extras.length;
}

// Abre el post de Instagram detrás del visor, espera a que cargue la data del
// carrusel y cierra el modal. Devuelve cuántas imágenes se agregaron.
async function harvestCarousel(gallery, slide, options = {}) {
  const shouldStop = () =>
    gallery.cancelled ||
    (!options.foreground && gallery.foregroundHarvestPending > 0);

  // Si hay una navegación en primer plano (o se cerró la galería), se aborta
  // cualquier pedido en curso para no hacerla esperar.
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;

  const stopPolling = setInterval(() => {
    if (controller && shouldStop()) controller.abort();
  }, 120);

  let anchorClicked = false;
  let openedDialog = null;
  let dialogsBefore = new Set();
  let originalPath = "";
  let originalHistoryLength = 0;

  try {
    // Camino rápido: pedirle los datos del carrusel directamente a la API.
    const apiUrls = await carouselUrlsFromApi(
      slide,
      controller && controller.signal
    );

    if (gallery.cancelled) return 0;
    if (apiUrls) return applyCarouselUrls(gallery, slide, apiUrls);

    if (shouldStop()) return 0;

    const anchor = findGridAnchorByCode(slide.code);
    if (!anchor) return 0;

    originalPath = location.pathname;
    originalHistoryLength = history.length;
    dialogsBefore = new Set(
      document.querySelectorAll('div[role="dialog"]')
    );
    anchorClicked = true;

    anchor.click();

    let dialog = await waitForValue(
      () => {
        // Solo nos interesa un modal nuevo (el del post que acabamos de abrir).
        const visible = [
          ...document.querySelectorAll('div[role="dialog"]'),
        ].filter(
          (candidate) =>
            candidate.getClientRects().length &&
            !dialogsBefore.has(candidate)
        );

        return visible[0] || null;
      },
      3000,
      100,
      shouldStop
    );

    // Respaldo por si Instagram reutiliza el mismo nodo del modal: en ese caso
    // verificamos que la URL ya corresponda al post que abrimos.
    if (!dialog && !shouldStop()) {
      const match = location.pathname.match(POST_HREF_PATTERN);
      if (match && match[1] === slide.code) dialog = getVisibleDialog();
    }

    if (!dialog || shouldStop()) return 0;

    openedDialog = dialog;

    let urls = [];

    const node = await waitForValue(
      () => findCarouselPostData(slide.code),
      1500,
      150,
      shouldStop
    );

    if (node) urls = imagesFromCarouselPost(node);

    if (!urls.length) {
      urls = await harvestCarouselFromDialog(dialog, {
        shouldStop,
        // En segundo plano no recorremos carruseles enormes.
        maxSteps: options.foreground ? 30 : 12,
      });
    }

    if (!urls.length || shouldStop()) return 0;

    return applyCarouselUrls(gallery, slide, urls);
  } finally {
    clearInterval(stopPolling);

    // Si no detectamos el modal pero tampoco había otro abierto, cerramos
    // cualquier diálogo visible para no dejarlo colgado.
    if (openedDialog || (anchorClicked && !dialogsBefore.size)) {
      await closeVisibleDialog(openedDialog);
    }

    // si el modal agregó una entrada al historial, volvemos al perfil
    if (
      anchorClicked &&
      originalPath !== location.pathname &&
      /\/(?:p|reel|tv)\//.test(location.pathname) &&
      history.length > originalHistoryLength
    ) {
      history.back();
    }
  }
}

// Instagram solo permite un modal de post a la vez, así que las expansiones se
// encadenan: la precarga en segundo plano y la carga pedida por el usuario
// nunca se pisan.
function expandCarousel(gallery, slide, options = {}) {
  if (!slide || !slide.isCarousel) return Promise.resolve(0);
  if (slide.expansionPromise) return slide.expansionPromise;
  if (slide.expanded) return Promise.resolve(0);

  const run = () => harvestCarousel(gallery, slide, options);
  const queued = (gallery.harvestChain || Promise.resolve()).then(run, run);

  gallery.harvestChain = queued.catch(() => {});

  slide.expansionPromise = queued.finally(() => {
    slide.expansionPromise = null;
  });

  return slide.expansionPromise;
}

// Carga el carrusel que el usuario está por abrir, dándole prioridad sobre
// cualquier precarga que esté en curso.
async function ensureCarouselExpanded(gallery, slide) {
  if (!slide || !slide.isCarousel) return 0;

  gallery.foregroundHarvestPending += 1;

  try {
    if (slide.expansionPromise) {
      // La precarga en curso se cancela al detectar esta carga prioritaria.
      await slide.expansionPromise.catch(() => {});
    }

    if (!slide.isCarousel) return 0;

    return await expandCarousel(gallery, slide, { foreground: true });
  } finally {
    gallery.foregroundHarvestPending -= 1;
  }
}

/* ------------------------------------------------------------------ */
/* Precarga de los próximos carruseles                                 */
/* ------------------------------------------------------------------ */

function carouselSlidesAhead(gallery, index, count) {
  const slides = [];

  // Incluye la imagen actual por si es la portada de un carrusel que todavía
  // no se abrió: así, cuando el usuario avance, las fotos ya están listas.
  for (let i = index; i < gallery.images.length; i += 1) {
    const slide = gallery.images[i];
    if (!slide || !slide.isCarousel || slide.expanded) continue;
    if (slide.expansionPromise) continue;
    if ((slide.prefetchAttempts || 0) >= 1) continue;

    slides.push(slide);
    if (slides.length >= count) break;
  }

  return slides;
}

// Deja cacheadas las próximas imágenes para que al navegar aparezcan rápido.
function warmUpcomingSlides(state, count = GALLERY_PREFETCH_AHEAD) {
  if (!state || !state.gallery) return;

  const { images } = state.gallery;

  for (let i = state.index + 1; i < images.length; i += 1) {
    if (i > state.index + count) break;
    warmImage(images[i] && images[i].src);
  }
}

function scheduleGalleryPrefetch(state) {
  const gallery = state && state.gallery;
  if (!gallery || overlay !== state || gallery.cancelled) return;

  if (gallery.prefetchPromise) {
    gallery.prefetchPending = true;
    return;
  }

  gallery.prefetchPromise = runGalleryPrefetch(state)
    .catch(() => {})
    .finally(() => {
      gallery.prefetchPromise = null;

      if (gallery.prefetchPending) {
        gallery.prefetchPending = false;
        scheduleGalleryPrefetch(state);
      }
    });
}

async function runGalleryPrefetch(state) {
  const gallery = state.gallery;

  for (let step = 0; step < GALLERY_PREFETCH_AHEAD; step += 1) {
    if (overlay !== state || gallery.cancelled) return;

    // Si el usuario pidió una imagen, la precarga espera.
    if (gallery.foregroundHarvestPending > 0) return;

    // No abrimos modales mientras se está cargando otra página del perfil.
    if (gallery.loadingPromise || gallery.gridLoadingPromise) return;

    const targets = carouselSlidesAhead(
      gallery,
      state.index,
      GALLERY_PREFETCH_AHEAD
    );
    if (!targets.length) return;

    const target = targets[0];

    target.prefetchAttempts = (target.prefetchAttempts || 0) + 1;

    try {
      await expandCarousel(gallery, target);
    } catch (error) {
      // la precarga nunca debe interrumpir la navegación
    }

    if (overlay !== state) return;

    warmUpcomingSlides(state);
  }
}

function findScrollContainer(element) {
  let node = element ? element.parentElement : null;

  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }

  return null;
}

function savePageScroll() {
  const firstAnchor = gridPostAnchors()[0] || null;
  const container = findScrollContainer(firstAnchor);

  return {
    windowY: window.scrollY,
    container,
    containerTop: container ? container.scrollTop : 0,
  };
}

function restorePageScroll(saved) {
  if (!saved) return;

  try {
    if (saved.container && saved.container.isConnected) {
      saved.container.scrollTop = saved.containerTop;
    }
    window.scrollTo(0, saved.windowY);
  } catch (error) {
    console.warn("Full Size Images for IG:", error);
  }
}

// Empuja la página del perfil hacia abajo para que Instagram cargue más posts,
// igual que cuando el usuario scrollea el feed.
async function triggerGridLoad(gallery) {
  const startedAt = Date.now();
  const before = gridPostAnchors().length;
  let lastHeight = document.documentElement.scrollHeight;
  let stableSince = Date.now();

  while (Date.now() - startedAt < 4000) {
    if (gallery.cancelled) return false;

    const anchors = gridPostAnchors();
    const last = anchors[anchors.length - 1];

    if (last) {
      const container = findScrollContainer(last);
      if (container) container.scrollTop = container.scrollHeight;
      last.scrollIntoView({ block: "end", inline: "nearest" });
    }

    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event("scroll"));

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (gridPostAnchors().length > before) return true;

    // Si la página dejó de crecer, probablemente no hay más posts.
    const height = document.documentElement.scrollHeight;
    if (height !== lastHeight) {
      lastHeight = height;
      stableSince = Date.now();
    } else if (Date.now() - stableSince > 2000) {
      return false;
    }
  }

  return false;
}

function loadMoreGridPage(gallery) {
  if (!gallery.allowGridFallback) {
    gallery.hasMore = false;
    return Promise.resolve(0);
  }

  if (!gallery.hasMore || gallery.cancelled) return Promise.resolve(0);
  if (gallery.gridLoadingPromise) return gallery.gridLoadingPromise;

  gallery.gridLoadingPromise = (async () => {
    try {
      let added = collectGridPosts(gallery);

      if (!added) {
        await triggerGridLoad(gallery);
        if (gallery.cancelled) return 0;
        added = collectGridPosts(gallery);
      }

      if (added > 0) {
        gallery.emptyGridLoads = 0;
      } else {
        gallery.emptyGridLoads += 1;

        // Se intenta un par de veces antes de dar por terminado el perfil.
        if (gallery.emptyGridLoads >= 2) gallery.hasMore = false;
      }

      return added;
    } finally {
      gallery.gridLoadingPromise = null;
    }
  })();

  return gallery.gridLoadingPromise;
}

// Pide una página más del feed del usuario. Devuelve cuántas imágenes nuevas
// se agregaron.
function loadGalleryPage(gallery) {
  if (!gallery.userId || !gallery.hasMore) return Promise.resolve(0);
  if (gallery.loadingPromise) return gallery.loadingPromise;

  gallery.loadingPromise = (async () => {
    try {
      const cursor = gallery.cursor
        ? `&max_id=${encodeURIComponent(gallery.cursor)}`
        : "";
      const data = await fetchJson(
        `/api/v1/feed/user/${gallery.userId}/?count=33${cursor}`
      );
      const items = data && Array.isArray(data.items) ? data.items : [];

      let added = 0;
      items.forEach((item) => {
        added += addApiPost(gallery, item);
      });

      gallery.cursor = data && data.next_max_id ? String(data.next_max_id) : "";
      gallery.hasMore =
        !!(data && data.more_available) &&
        !!gallery.cursor &&
        gallery.images.length < MAX_GALLERY_IMAGES;

      return added;
    } finally {
      gallery.loadingPromise = null;
    }
  })();

  return gallery.loadingPromise;
}

// Carga la página siguiente: por la API de IG si funciona o, si no, scrolleando
// la grilla del perfil (como hace el feed).
async function loadNextGalleryPage(gallery) {
  if (gallery.source === "grid") {
    return loadMoreGridPage(gallery);
  }

  try {
    const added = await loadGalleryPage(gallery);

    if (gallery.cancelled) return 0;
    if (gallery.hasMore) return added;

    // La API se quedó sin páginas: seguimos con la grilla del perfil. Solo es
    // seguro si estamos en la página de ese perfil (si la galería se abrió
    // desde un post del feed, la grilla no pertenece a este usuario).
    if (!gallery.allowGridFallback) {
      gallery.hasMore = false;
      return added;
    }

    gallery.source = "grid";
    gallery.hasMore = true;

    const gridAdded = collectGridPosts(gallery);
    if (gridAdded > 0) return added + gridAdded;

    if (added > 0) return added;

    return loadMoreGridPage(gallery);
  } catch (error) {
    console.warn("Full Size Images for IG:", error);

    if (gallery.cancelled) return 0;

    if (!gallery.allowGridFallback) {
      gallery.hasMore = false;
      return 0;
    }

    // Si la API dejó de responder, seguimos con la grilla del perfil.
    gallery.source = "grid";
    gallery.hasMore = true;
    collectGridPosts(gallery);

    return loadMoreGridPage(gallery);
  }
}

async function createGallery(username) {
  const profile = getProfileUsername();
  const allowGridFallback =
    !!profile && profile.toLowerCase() === String(username).toLowerCase();

  const gallery = {
    images: [],
    seenPosts: new Set(),
    seenCodes: new Set(),
    seenUrls: new Set(),
    userId: null,
    cursor: "",
    hasMore: false,
    loadingPromise: null,
    gridLoadingPromise: null,
    emptyGridLoads: 0,
    cancelled: false,
    source: "grid",
    allowGridFallback,
    // coordinación de la precarga de carruseles
    harvestChain: Promise.resolve(),
    prefetchPromise: null,
    prefetchPending: false,
    foregroundHarvestPending: 0,
  };

  let user = null;

  try {
    const data = await fetchJson(
      `/api/v1/users/web_profile_info/?username=${encodeURIComponent(
        username
      )}`
    );
    user = data && data.data ? data.data.user : null;
  } catch (error) {
    console.warn("Full Size Images for IG:", error);
  }

  if (user && user.id) {
    gallery.userId = user.id;
    gallery.hasMore = true;

    try {
      const added = await loadGalleryPage(gallery);
      if (!added) throw new Error("La API no devolvió imágenes");
      gallery.source = "api";

      // Si la API ya no tiene más páginas, completamos con la grilla del
      // perfil y seguimos cargando por scroll.
      if (!gallery.hasMore && gallery.allowGridFallback) {
        gallery.source = "grid";
        gallery.hasMore = true;
        collectGridPosts(gallery);
      }
    } catch (error) {
      console.warn("Full Size Images for IG:", error);

      addGraphPosts(gallery, timelineEdgesFromUser(user));

      if (gallery.allowGridFallback) {
        gallery.source = "grid";
        gallery.hasMore = true;
      } else {
        gallery.source = "api";
        gallery.hasMore = false;
      }
    }
  } else if (user) {
    addGraphPosts(gallery, timelineEdgesFromUser(user));

    if (gallery.allowGridFallback) {
      gallery.source = "grid";
      gallery.hasMore = true;
    } else {
      gallery.source = "api";
      gallery.hasMore = false;
    }
  }

  // Si la API no sirvió, usamos las portadas de la grilla del perfil y
  // seguimos cargando más por scroll.
  if (gallery.source === "grid" && gallery.allowGridFallback) {
    collectGridPosts(gallery);
    gallery.hasMore = true;
  }

  if (!gallery.images.length) {
    throw new Error("No se encontraron imágenes en este perfil");
  }

  return gallery;
}

/* ------------------------------------------------------------------ */
/* Botón de galería en los perfiles                                    */
/* ------------------------------------------------------------------ */

function getProfileUsername() {
  const match = location.pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
  if (!match) return "";

  const username = match[1];
  return RESERVED_PATHS.has(username.toLowerCase()) ? "" : username;
}

function updateGalleryButton() {
  const username = getProfileUsername();
  let button = document.getElementById(GALLERY_BUTTON_ID);

  if (!username) {
    if (button) button.remove();
    return;
  }

  if (!button) {
    injectStyles();

    button = document.createElement("button");
    button.id = GALLERY_BUTTON_ID;
    button.type = "button";
    button.textContent = "View as full size gallery";
    button.title = "Ver todas las fotos del perfil a tamaño completo";
    button.addEventListener("click", () => {
      const currentUsername = getProfileUsername();
      if (currentUsername) openGalleryOverlay(currentUsername);
    });

    document.body.appendChild(button);
  }

  // Instagram es una SPA: al cambiar de perfil se actualiza el usuario.
  button.dataset.username = username;

  // no mostrar el botón encima de los modales de Instagram ni del visor
  const dialog = document.querySelector('div[role="dialog"]');
  const dialogOpen = !!(dialog && dialog.getClientRects().length);
  button.style.display = dialogOpen || overlay ? "none" : "block";
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

// Flechas del teclado: pasan las imágenes del carrusel/galería y Esc cierra
// el visor. Se escucha en window/captura para que Instagram no procese las
// teclas (por ejemplo, para que no cambie de post al mismo tiempo).
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

// El botón de galería se revisa periódicamente porque Instagram es una SPA
// (la URL cambia sin recargar la página).
setInterval(updateGalleryButton, 1000);
updateGalleryButton();
