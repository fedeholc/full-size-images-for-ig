// Full Size Images for IG
// - Lupa sobre cada foto para verla a tamaño completo (con navegación de
//   carruseles con las flechas del teclado).
// - Botón "View as full size gallery" en los perfiles para recorrer todas las
//   fotos del usuario, incluyendo todas las imágenes de cada carrusel.

const STYLE_ID = "fse-styles";
const GALLERY_BUTTON_ID = "fse-gallery-button";

// id de la app web de Instagram (necesario para los endpoints internos)
const IG_APP_ID = "936619743392459";

// tope de seguridad para no cargar perfiles gigantes sin límite
const MAX_GALLERY_IMAGES = 2000;

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

  const state = {
    container,
    image,
    counter,
    loading,
    prevButton,
    nextButton,
    slides: [],
    root: null,
    index: 0,
    // modo galería de perfil: { images, hasMore, ... } y loader de páginas
    gallery: null,
    loadMore: null,
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

  renderCurrentSlide();
}

// Abre el visor con todas las fotos del perfil.
function openGalleryOverlay(username) {
  const state = createOverlayState();

  state.loading.textContent = "Cargando galería…";
  state.loading.style.display = "block";
  renderCurrentSlide();

  createGallery(username)
    .then((gallery) => {
      if (overlay !== state) return;

      state.gallery = gallery;
      state.slides = gallery.images;
      state.index = 0;
      state.loadMore = () => loadGalleryPage(gallery);

      renderCurrentSlide();
    })
    .catch((error) => {
      console.warn("Full Size Images for IG:", error);
      if (overlay !== state) return;

      state.loading.textContent = "No se pudo cargar la galería";
    });
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
  const { image, counter, loading, prevButton, nextButton } = state;
  const slides = getSlidesNow();

  if (!slides.length) {
    counter.style.display = "none";
    prevButton.style.display = "none";
    nextButton.style.display = "none";
    return;
  }

  if (state.index > slides.length - 1) {
    state.index = slides.length - 1;
  }

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
  if (!state) return;

  let slides = getSlidesNow();
  if (!slides.length) return;

  let nextIndex = state.index + delta;
  let loadingMore = false;

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
    nextIndex = Math.min(slides.length - 1, nextIndex);
  }

  nextIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));

  if (nextIndex === state.index) {
    if (loadingMore) state.loading.style.display = "none";
    return;
  }

  // En modo carrusel, mantener sincronizado el carrusel de Instagram.
  if (!state.gallery) {
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

async function fetchJson(url) {
  const options = {
    credentials: "include",
    headers: { "x-ig-app-id": IG_APP_ID },
  };

  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    options.signal = AbortSignal.timeout(15000);
  }

  const response = await fetch(url, options);
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
      .filter((media) => media && media.media_type === 1)
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
      .filter((child) => child && !child.is_video && child.display_url)
      .map((child) => child.display_url);
  }

  if (node.is_video || node.__typename === "GraphVideo") return [];
  return node.display_url ? [node.display_url] : [];
}

function addGalleryImages(gallery, urls) {
  let added = 0;

  urls.forEach((url) => {
    if (!url || gallery.seenUrls.has(url)) return;
    if (gallery.images.length >= MAX_GALLERY_IMAGES) return;

    gallery.seenUrls.add(url);
    gallery.images.push({ src: url, alt: "" });
    added++;
  });

  return added;
}

function addApiPost(gallery, item) {
  if (!item) return 0;

  const postId = String(item.pk || item.id || "");
  if (postId && gallery.seenPosts.has(postId)) return 0;
  if (postId) gallery.seenPosts.add(postId);

  return addGalleryImages(gallery, imagesFromApiItem(item));
}

function addGraphPosts(gallery, edges) {
  if (!Array.isArray(edges)) return;

  edges.forEach((edge) => {
    const node = edge && edge.node;
    if (!node) return;

    const postId = String(node.id || node.shortcode || "");
    if (postId && gallery.seenPosts.has(postId)) return;
    if (postId) gallery.seenPosts.add(postId);

    addGalleryImages(gallery, imagesFromGraphNode(node));
  });
}

// Último recurso: miniaturas de la grilla que ya están en el DOM (solo la
// portada de cada post).
function collectGridImageUrls() {
  const urls = [];

  document
    .querySelectorAll(
      'a[href*="/p/"] img, a[href*="/reel/"] img, a[href*="/tv/"] img'
    )
    .forEach((img) => {
      const src = getImageSrc(img);
      if (src) urls.push(src);
    });

  return [...new Set(urls)];
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

async function createGallery(username) {
  const gallery = {
    images: [],
    seenPosts: new Set(),
    seenUrls: new Set(),
    userId: null,
    cursor: "",
    hasMore: false,
    loadingPromise: null,
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
    } catch (error) {
      console.warn("Full Size Images for IG:", error);

      addGraphPosts(
        gallery,
        user.edge_owner_to_timeline_media &&
          user.edge_owner_to_timeline_media.edges
      );
      gallery.hasMore = false;
    }
  } else if (user) {
    addGraphPosts(
      gallery,
      user.edge_owner_to_timeline_media &&
        user.edge_owner_to_timeline_media.edges
    );
    gallery.hasMore = false;
  }

  if (!gallery.images.length) {
    addGalleryImages(gallery, collectGridImageUrls());
    gallery.hasMore = false;
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
