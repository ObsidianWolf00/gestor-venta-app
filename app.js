const CLAVE = "productos";

function cargarProductos() {
    const texto = localStorage.getItem(CLAVE);
    if (texto === null) {
        return [];
    }
    return JSON.parse(texto);
}

function guardarProductos() {
    localStorage.setItem(CLAVE, JSON.stringify(productos));
}

let productos = cargarProductos();
let idEditando = null;

function salirModoEdicion() {
    idEditando = null;
    formulario.reset();
    vistaPrevia.replaceChildren();
    fotosNuevas = [];
    
    document.getElementById("botonGuardar").textContent = "Guardar producto";
    document.getElementById("botonCancelar").hidden = true;
}

document.getElementById("botonCancelar").addEventListener("click", salirModoEdicion);

function crearTarjeta(producto) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "producto";

    if (producto.fotos) {
        const galeria = document.createElement("div");
        producto.fotos.forEach(async function (id) {
            const img = document.createElement("img");
            img.className = "miniatura";
            galeria.appendChild(img);
            const blob = await obtenerFoto(id);
            img.src = URL.createObjectURL(blob);
        });
        tarjeta.appendChild(galeria);
    }
    
    const titulo = document.createElement("h2");
    titulo.textContent = producto.nombre;

    const precio = document.createElement("p");
    precio.textContent = "Precio: " + producto.precio.monto + " " + producto.precio.moneda;

    tarjeta.appendChild(titulo);
    tarjeta.appendChild(precio);

    if (producto.marca) {
        const marca = document.createElement("p");
        marca.textContent = "Marca: " + producto.marca;

        tarjeta.appendChild(marca);
    }

    if (producto.disponibilidad) {
        const disponibilidad = document.createElement("p");
        disponibilidad.textContent = "Disponible en " + producto.disponibilidad;

        tarjeta.appendChild(disponibilidad);
    }

    if (producto.caracteristicas) {
        const lista = document.createElement("ul");
        producto.caracteristicas.forEach(function (c) {
            const elemento = document.createElement("li");
            elemento.textContent = c;
            lista.appendChild(elemento);
        });
        tarjeta.appendChild(lista);
    }

    const botonEliminar = document.createElement("button");
    botonEliminar.textContent = "Eliminar";
    botonEliminar.addEventListener("click", function () {
        eliminarProducto(producto.id);
    });

    const botonEditar = document.createElement("button");
    botonEditar.textContent = "Editar";
    botonEditar.addEventListener("click", function() {
        editarProducto(producto.id);
    });

    const botonAnuncio = document.createElement("button");
    botonAnuncio.textContent = "Anuncio";
    botonAnuncio.addEventListener("click", function() {
        mostrarAnuncio(producto);
    });

    tarjeta.appendChild(botonEliminar);
    tarjeta.appendChild(botonEditar);
    tarjeta.appendChild(botonAnuncio);
    return tarjeta;
}

const contenedor = document.getElementById("catalogo");

function mostrarCatalogo() {
    contenedor.replaceChildren();
    productos.forEach(function (producto) {
        contenedor.appendChild(crearTarjeta(producto));
    });
}

async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) {
        return;
    }
    
    const producto = productos.find(function (p) {
        return p.id === id;
    });

    if (producto && producto.fotos) {
        for (const idFoto of producto.fotos) {
            await borrarFoto(idFoto);
        }
    }

    productos = productos.filter(function (p) {
        return p.id !== id;
    });

    if (idEditando === id) {
        salirModoEdicion();
    }

    guardarProductos();
    mostrarCatalogo();
}

function editarProducto(id) {
    const producto = productos.find(function (p) {
        return p.id === id;
    });
    idEditando = id;

    document.getElementById("nombre").value = producto.nombre;
    document.getElementById("precio").value = producto.precio.monto;
    document.getElementById("monedaPrecio").value = producto.precio.moneda;
    document.getElementById("comision").value = producto.comision.monto;
    document.getElementById("monedaComision").value = producto.comision.moneda;
    document.getElementById("marca").value = producto.marca || "";
    document.getElementById("caracteristicas").value = (producto.caracteristicas || []).join("\n");
    document.getElementById("disponibilidad").value = producto.disponibilidad || "";

    document.getElementById("botonGuardar").textContent = "Guardar cambios";
    document.getElementById("botonCancelar").hidden = false;
    window.scrollTo(0, 0);
}

async function mostrarAnuncio(producto) {
    productoDelAnuncio = producto;
    actualizarAnuncio();
    document.getElementById("panelAnuncio").hidden = false;

    archivosAnuncio = [];
    const archivos = await cargarArchivosFotos(producto);

    if (productoDelAnuncio === producto) {
        archivosAnuncio = archivos;
    }

    console.log("Fotos preparadas:", archivosAnuncio.length, archivosAnuncio);
}

document.getElementById("cerrarAnuncio").addEventListener("click", function () {
    document.getElementById("panelAnuncio").hidden = true;
});

const formulario = document.getElementById("formulario");

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const producto = {
        id: idEditando !== null ? idEditando : Date.now(),
        nombre: document.getElementById("nombre").value.trim(),
        precio: {
            monto: Number(document.getElementById("precio").value),
            moneda: document.getElementById("monedaPrecio").value
        },
        comision: {
            monto: Number(document.getElementById("comision").value),
            moneda: document.getElementById("monedaComision").value
        }
    };

    //TU PARTE: los tres campos opcionales (ver abajo)
    const marca = document.getElementById("marca").value.trim();
    if (marca !== "") {
        producto.marca = marca;
    }

    const disponibilidad = document.getElementById("disponibilidad").value.trim();
    if (disponibilidad !== "") {
        producto.disponibilidad = disponibilidad;
    }
    
    const texto = document.getElementById("caracteristicas").value.trim();
    const lineas = texto.split("\n").filter(function(x) { return x.trim() !== ""; });
    if (lineas.length > 0) {
        producto.caracteristicas = lineas;
    }

    const original = idEditando !== null ? productos.find(function (p) {
        return p.id === idEditando;
    }) : null;

    if (fotosNuevas.length > 0) {
        if (original && original.fotos) {
            for (const idFoto of original.fotos) {
                await borrarFoto(idFoto);
            }
        }
        const ids = [];
        for (const blob of fotosNuevas) {
            const idFoto = await guardarFoto(blob);
            ids.push(idFoto);
        }
        producto.fotos = ids;
    } else if (original && original.fotos) {
        producto.fotos = original.fotos;
    }

    if (idEditando === null) {
        productos.push(producto);
    } else {
        productos = productos.map(function (p) {
            return p.id === idEditando ? producto : p;
        });
    }

    mostrarCatalogo();
    guardarProductos();
    console.log(productos);
    salirModoEdicion();
});

const campoFotos = document.getElementById("fotos");
const vistaPrevia = document.getElementById("vistaPrevia");
let fotosNuevas = [];

campoFotos.addEventListener("change", async function () {
    fotosNuevas = [];
    vistaPrevia.replaceChildren();
    for (const archivo of Array.from(campoFotos.files)) {
        const reducida = await reducirImagen(archivo);
        console.log(archivo.name, Math.round(archivo.size / 1024) + " KB →", Math.round(reducida.size / 1024) + " KB");
        fotosNuevas.push(reducida);
        const imagen = document.createElement("img");
        imagen.src = URL.createObjectURL(reducida);
        imagen.className = "miniatura";
        vistaPrevia.appendChild(imagen);
    }
});

const LADO_MAXIMO = 1280;

async function reducirImagen(archivo) {
    const imagen = await createImageBitmap(archivo);

    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const ancho = Math.round(imagen.width * escala);
    const alto = Math.round(imagen.height * escala);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext("2d").drawImage(imagen, 0, 0, ancho, alto);

    return new Promise(function (resolver) {
        lienzo.toBlob(function (blob) {
            resolver(blob);
        }, "image/jpeg", 0.8);
    });
}

const promesaBD = new Promise(function (resolver, rechazar) {
    const peticion = indexedDB.open("gestor-venta", 1);
    peticion.onupgradeneeded = function() {
        peticion.result.createObjectStore("fotos", { autoIncrement: true});
    };
    peticion.onsuccess = function() {
        resolver(peticion.result);
    };
    peticion.onerror = function() {
        rechazar(peticion.error);
    };
});

async function guardarFoto(blob) {
    const bd = await promesaBD;
    return new Promise(function (resolver, rechazar) {
        const peticion = bd.transaction("fotos", "readwrite").objectStore("fotos").add(blob);
        peticion.onsuccess = function () {
            resolver(peticion.result);
        };
        peticion.onerror = function () {
            rechazar(peticion.error);
        };
    });
}

async function obtenerFoto(id) {
    const bd = await promesaBD;
    return new Promise(function (resolver, rechazar) {
        const peticion = bd.transaction("fotos", "readonly").objectStore("fotos").get(id);
        peticion.onsuccess = function () {
            resolver(peticion.result);
        };
        peticion.onerror = function () {
            rechazar(peticion.error);
        };
    });
}

async function borrarFoto(id) {
    const bd = await promesaBD;
    return new Promise(function (resolver, rechazar) {
        const peticion = bd.transaction("fotos", "readwrite").objectStore("fotos").delete(id);
        peticion.onsuccess = function () {
            resolver();
        };
        peticion.onerror = function() {
            rechazar(peticion.error);
        };
    });
}

function datosPublicos(producto) {
    return {
        nombre: producto.nombre,
        marca: producto.marca,
        caracteristicas: producto.caracteristicas,
        precio: producto.precio,
        disponibilidad: producto.disponibilidad
    };
}

function generarAnuncioSimple(d) {
    const lineas = [d.nombre];
    if (d.marca) {
        lineas.push(d.marca);
    }
    // TU PARTE: las características (cada una en su línea), el precio y la disponibilidad
    if (d.caracteristicas) {
        lineas.push(...d.caracteristicas);
    }
    
    lineas.push("Precio: " + d.precio.monto + " " + d.precio.moneda);

    if (d.disponibilidad) {
        lineas.push("Disponible en " + d.disponibilidad);
    }

    return lineas.join("\n");
}

const APERTURAS = [
    "🔥 ¡Oferta!", 
    "✨ Disponible ahora", 
    "🛒 No te lo pierdas",
    "🌟 ¡Mira lo que tenemos para ti!",
    "🎉 ¡Llegó lo que estabas buscando!",
    "👀 ¡Échale un vistazo a esta opción!",
    "💥 ¡No dejes pasar esta oportunidad!"
];
const CIERRES = [
    "📩 Escríbeme al privado para más información",
    "📲 ¡Escríbeme y te doy los detalles!",
    "💌 ¿Te interesa? ¡Hablemos!",
    "🤝 Estoy disponible para resolver tus dudas.",
    "📥 ¡Déjame un mensaje si quieres saber más!"
];

function elegirAlAzar(lista) {
    const posicion = Math.floor(Math.random() * lista.length);
    return lista[posicion];
}

function generarAnuncioLlamativo(d) {
    const lineas = [elegirAlAzar(APERTURAS), "", d.nombre];
    if (d.marca) {
        lineas.push("🏷️ " + d.marca);
    }

    if (d.caracteristicas) {
        d.caracteristicas.forEach(function (caracteristica) {
            lineas.push("✅ " + caracteristica);
        });
    }

    lineas.push("");
    lineas.push("💰 Precio: " + d.precio.monto + " " + d.precio.moneda);

    if (d.disponibilidad) {
        lineas.push("📍 Disponible en " + d.disponibilidad);
    }

    lineas.push("");
    lineas.push(elegirAlAzar(CIERRES));
    
    return lineas.join("\n");
}

let productoDelAnuncio = null;

function actualizarAnuncio() {
    const datos = datosPublicos(productoDelAnuncio);
    const estilo = document.getElementById("estiloAnuncio").value;
    document.getElementById("textoAnuncio").value = 
        estilo === "llamativo" ? generarAnuncioLlamativo(datos) : generarAnuncioSimple(datos);
}

async function copiarAnuncio() {
    const texto = document.getElementById("textoAnuncio").value;
    const boton = document.getElementById("copiarAnuncio");
    try {
        await navigator.clipboard.writeText(texto);
        //TU PARTE 1: avisar que se copio
        boton.textContent = "¡Copiado!";
        setTimeout(function () {
            boton.textContent = "Copiar texto";
        }, 1500);
    } catch (error) {
        //TU PARTE 2: avisar que no se pudo copiar
        boton.textContent = "No se pudo copiar";
        setTimeout(function () {
            boton.textContent = "Copiar texto";
        }, 1500);
        console.error(error);
    }
}

async function exportarCopia() {
    // 1) Reunir los números de foto que usan los productos, sin repetir
    const ids = [];
    productos.forEach(function (p) {
        // TU PARTE 1: si p tiene fotos, añade a ids cada número que todavía no esté
        // (pista: ids.includes(n) dice si ya está)
        if (p.fotos) {
            p.fotos.forEach(function (id) {
                if (!ids.includes(id)) {
                    ids.push(id);
                }
            });
        }
    });

    // 2) Leer cada foto desde IndexedDB
    const fotos = [];       // datos de cada foto
    const bloques = [];     // las fotos en sí
    for (const id of ids) {
        const blob = await obtenerFoto(id);
        if (!blob) {
            continue;
        }
        fotos.push({ id: id, tipo: blob.type, tamano: blob.size });
        bloques.push(blob);
    }

    // 3) Armar el JSON en bytes y una cabecera de 4 bytes con su longitud
    const datos = { version: 2, fecha: new Date().toISOString(), productos: productos, fotos: fotos };
    const json = new TextEncoder().encode(JSON.stringify(datos));
    const longitud = new ArrayBuffer(4);
    new DataView(longitud).setUint32(0, json.length);

    // 4) Unirlo todo en un solo archivo
    const archivo = new Blob([longitud, json].concat(bloques), { type: "application/octet-stream" });
    console.log(fotos.length + " fotos, " + archivo.size + " bytes");

    // 5) TU PARTE 2: descárgalo con el mismo método de antes, con el nombre
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = "gestor-copia-" + datos.fecha.slice(0, 10) + ".copia";
    enlace.click();

    setTimeout(function () {
        URL.revokeObjectURL(enlace.href);
    }, 1000);
}

function copiaValida(datos, longitud, tamanoArchivo) {
    if (
        !datos ||
        datos.version !== 2 ||
        !Array.isArray(datos.productos) ||
        !Array.isArray(datos.fotos)
    ) {
        return false;
    }

    const productosValidos = datos.productos.every(function (p) {
        return (
            p &&
            p.id !== undefined &&
            typeof p.nombre === "string" &&
            p.precio &&
            typeof p.precio.monto === "number" &&
            p.comision &&
            typeof p.comision.monto === "number"
        );
    });

    if (!productosValidos) {
        return false;
    }

    const fotosValidas = datos.fotos.every(function (foto) {
        return (
            foto &&
            typeof foto.id === "number" &&
            typeof foto.tamano === "number" &&
            Number.isFinite(foto.tamano) &&
            foto.tamano >= 0 &&
            typeof foto.tipo === "string" &&
            foto.tipo.startsWith("image/")
        );
    });

    if (!fotosValidas) {
        return false;
    }

    const tamanoEsperado = 4 + longitud + 
        datos.fotos.reduce(function (total, foto) {
            return total + foto.tamano;
        }, 0);
    
    return tamanoEsperado === tamanoArchivo;
}

async function importarCopia(archivo) {
    const nuevosIds = [];
    let reemplazado = false;
    try {
        // 1) Leer la cabecera de 4 bytes y el JSON
        const longitud = new DataView(await archivo.slice(0, 4).arrayBuffer()).getUint32(0);
        const datos = JSON.parse(await archivo.slice(4, 4 + longitud).text());

        // 2) TU PARTE 1: validar la copia (ver abajo)
        if (!copiaValida(datos, longitud, archivo.size)) {
            alert("El archivo no parece una copia válida");
            return;
        }
        // 3) TU PARTE 2: pedir confirmación (ver abajo)
        const confirmar = confirm(
            "Vas a reemplazar tu catálogo actual.\n\n" +
            "Productos en la copia: " + datos.productos.length + "\n" +
            "Fotos en la copia: " + datos.fotos.length + "\n" +
            "Productos actuales: " + productos.length + "\n" +
            "¿Deseas continuar?"
        );

        if (!confirmar) {
            return;
        }

        // 4) Guardar las fotos de la copia y anotar qué número nuevo recibió cada una
        const equivalencias = {};
        let inicio = 4 + longitud;
        for (const foto of datos.fotos) {
            const blob = archivo.slice(inicio, inicio + foto.tamano, foto.tipo);
            inicio += foto.tamano;
            const idNuevo = await guardarFoto(blob);
            nuevosIds.push(idNuevo);
            equivalencias[foto.id] = idNuevo;
        }

        // 5) TU PARTE 3: que cada producto de datos.productos use los números nuevos (ver abajo)
        datos.productos.forEach(function (p) {
            if (p.fotos) {
                p.fotos = p.fotos
                    .map(function (id) {
                        return equivalencias[id];
                    })
                    .filter(function (id) {
                        return id !== undefined;
                    });
                
                if (p.fotos.length === 0) {
                    delete p.fotos;
                }
            }
        });

        // 6) Reemplazar el catálogo
        const anteriores = productos;
        productos = datos.productos;
        guardarProductos();
        mostrarCatalogo();
        reemplazado = true;

        // 7) Solo ahora, borrar las fotos del catálogo anterior
        try {
            for (const p of anteriores) {
                for (const id of (p.fotos || [])) {
                    await borrarFoto(id);
                }
            }
        } catch (error) {
            console.error("No se pudieron limpiar las fotos anteriores", error);
        }
    } catch (error) {
        if (!reemplazado) {
            for (const id of nuevosIds) {
                await borrarFoto(id);
            }
        }
        alert("No se pudo importar la copia");
        console.error(error);
    }
}

let archivosAnuncio = [];

async function cargarArchivosFotos(producto) {
    const archivos = [];
    // TU PARTE 1: para cada número de producto.fotos (si existe), obtén el Blob con obtenerFoto
    // y créale un File: new File([blob], "foto-" + n + ".jpg", { type: blob.type})
    // donde n es 1, 2, 3... según el orden. Ignora las fotos que no existan
    let n = 1;

    for (const id of producto.fotos || []) {
        const blob = await obtenerFoto(id);
        if (!blob) {
            continue;
        }
        const archivo = new File(
            [blob],
            "foto-" + n + ".jpg",
            { type: blob.type}
        );
        archivos.push(archivo);
        n++;
    }

    return archivos;
}

async function compartirAnuncio() {
    const texto = document.getElementById("textoAnuncio").value;
    try {
        await navigator.clipboard.writeText(texto);
    } catch (error) {
        console.error(error);
    }

    const datos = { text: texto };
    if (archivosAnuncio.length > 0 && navigator.canShare && navigator.canShare({ files: archivosAnuncio})) {
        datos.files = archivosAnuncio;
    }

    try {
        await navigator.share(datos);
    } catch (error) {
        if (error.name !== "AbortError") {
            // TU PARTE 2: avisar al usuario de que no se pudo compartir
            alert("No se pudo compartir el anuncio. Puedes utilizar el texto copiado en el portapapeles.");
            console.error(error);
        }
    }
}

if (!navigator.share) {
    document.getElementById("compartirAnuncio").hidden = true;
}

document.getElementById("compartirAnuncio").addEventListener("click", compartirAnuncio);
document.getElementById("estiloAnuncio").addEventListener("change", actualizarAnuncio);
document.getElementById("regenerarAnuncio").addEventListener("click", actualizarAnuncio);
document.getElementById("copiarAnuncio").addEventListener("click", copiarAnuncio);

mostrarCatalogo();

document.getElementById("exportar").addEventListener("click", exportarCopia);

const campoImportar = document.getElementById("importar");

campoImportar.addEventListener("change", function () {
    const archivo = campoImportar.files[0];
    if (archivo) {
        importarCopia(archivo);
    }
    campoImportar.value = "";
});

async function registrarServiceWorker() {
    // TU PARTE: si "serviceWorker" existe en navigator, registra "sw.js" con await,
    // dentro de un try/catch que muestre el error en la consola si falla
    if ("serviceWorker" in navigator) {
        try {
            await navigator.serviceWorker.register("sw.js");
        } catch (error) {
            console.error("Error al registrar el service worker:", error);
        }
    }
}
registrarServiceWorker();