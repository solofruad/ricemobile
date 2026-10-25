# RiceBack API — Flujo completo para el Frontend

Guía técnica de referencia para quien desarrolla la app móvil: documenta **todos los endpoints**, **cómo debe
enviar la información el frontend**, **qué devuelve el backend** y los **flujos recomendados** (sección 10).
Los ejemplos de respuesta provienen de ejecutar el código actual del backend.

- Base de la API: `/api/` (producción: `https://riceback-backend.onrender.com`).
- Autenticación: **token de dispositivo** en la cabecera `Authorization: Bearer <token>`.
- Formato de respuestas: JSON (`Content-Type: application/json`).
- Errores: `{"error": "<mensaje>"}`, salvo `404` (HTML de Django), `405` (vacío), `500` (HTML, sólo ante un fallo inesperado del servidor) y `DELETE` exitoso (`204` sin cuerpo).

**Contenido:** [Novedades](#novedades-de-esta-versión) · [1. Autenticación](#1-mecánica-de-autenticación-importante) ·
[2. Convenciones, estados y límites](#2-convenciones-códigos-de-estado-y-límites) · [3. Auth](#3-autenticación--apiauth) ·
[4. Fincas y trazados](#4-fincas--apifincas) · [5. Enfermedades](#5-enfermedades--apienfermedades) ·
[6. Monitoreos](#6-monitoreos--apimonitoreos) · [7. Muestras](#7-muestras--apimonitoreosidmuestras-y-apimonitoreosmuestrasid) ·
[8. Detecciones](#8-detecciones--apimonitoreosmuestrasiddetecciones-y-apimonitoreosdeteccionesid) ·
[9. Dashboard](#9-dashboard--kpis) ·
[10. Recetas](#10-recetas-flujos-paso-a-paso) · [11. Reglas clave](#11-reglas-clave-a-recordar) ·
[12. Integración con React Native](#12-integración-con-react-native-backend-ya-desplegado) ·
[Anexo A. Exportaciones (solo web)](#anexo-a-exportaciones--apiexportar-solo-panel-web-no-aplica-a-la-app)

---

## Novedades de esta versión

Resumen, desde el punto de vista de la app, de lo que cambió respecto a la versión anterior de la API
(rama `develop`). **Cambios que rompen compatibilidad:** los puntos 1, 3, 6 y 7.

| # | Cambio | ¿Rompe? | Qué debe hacer la app |
|---|--------|---------|-----------------------|
| 1 | **Detecciones en formato ricemobile.** Se elimina el campo `label` (`PLAGA`/`ENFERMEDAD`/`MALEZA`/`OTRO`). Una detección se crea con `{frame, labels[]}` (lo que devuelve `ObjectDetection.detectObjects`), y el backend deduce la enfermedad por `codigo`/`alias` del catálogo (§5, §7, §8). El payload ahora trae `etiqueta`, `clase`, `severidad`, `posicion`, `atributos`, `etiquetas_alternas`, `frame` y `catalogada`. | **Sí** | Enviar el arreglo del detector sin transformarlo (campo `detecciones`, string JSON). Dejar de enviar `label`/`enfermedad_id`/`origin_x`… al crear. Leer `clase`/`catalogada` en vez de `label`. |
| 2 | **`catalogada` en la detección:** `true` si la clase se resolvió a una enfermedad del catálogo; `false` (con `enfermedad_id: null`) si no. Las clases fuera del catálogo **sí se guardan**. | No | Mostrar las no catalogadas como "clase desconocida" usando `clase`. |
| 3 | **Filtros de detecciones:** `?label=` desaparece (se ignora en silencio). Nuevos: `?clase=`, `?severidad=`, `?sin_enfermedad=true`. En `PATCH` de una detección, `label`, `etiqueta` y `clase` ya no se pueden cambiar (se ignoran); sí `enfermedad_id`, `severidad`, `posicion`, `notas`, `confidence` y la caja. | **Sí** | Sustituir el filtro `label` por `clase`/`sin_enfermedad`. |
| 4 | **Muestras con ubicación en el recorrido y tamaño de imagen.** Nuevos campos `punto_indice`, `foto_indice` (opcionales, van juntos, la pareja es única por monitoreo, `foto_indice` ≤ 4 por defecto), `ancho_px` y `alto_px` (los calcula el backend). Una caja que se salga de la imagen se rechaza con `400`. También se aceptan fotos MPO (modo Retrato de iPhone). | No | Enviar `punto_indice` y `foto_indice` (índices desde 0) con cada foto; las cajas van en píxeles de la foto **sin rotar** (EXIF). |
| 5 | **Trazados de la finca (endpoints nuevos)** `/api/fincas/<id>/trazados/` y `/api/fincas/trazados/<id>/`: el dibujo del terreno (`polygon`/`samplingPath` de ricemobile) se guarda una vez por finca y se reutiliza. Aceptan los nombres de ricemobile como alias. Mientras un monitoreo lo use, la geometría es inmutable (`409`). | No | Guardar el trazado una vez, conservar su `id` y reutilizarlo (§4, receta 4). |
| 6 | **`trazado_id` en monitoreos.** `POST /api/monitoreos/` y `PATCH` aceptan `trazado_id` (debe ser de la misma finca; `400` si no). El payload del monitoreo trae `trazado_id` siempre y el objeto `trazado` completo en detalle, creación y `PATCH`. Si el trazado tiene recorrido, `punto_indice` de las muestras debe ser menor que su número de puntos. | No (campos nuevos); **sí** si se asumía que cualquier `punto_indice` valía | Enviar `trazado_id` al crear el monitoreo. |
| 7 | **Finca: `municipio` y `departamento` obligatorios** (máx. 150 caracteres) y presentes en el payload; el monitoreo expone `finca_municipio` y `finca_departamento`. | **Sí** (un `POST /api/fincas/` sin ellos devuelve `400`) | Pedirlos en el formulario de finca. |
| 8 | **Dashboard.** Por defecto los KPIs cuentan **sólo monitoreos `FINALIZADO`**; el filtro `?estado=` (`TODOS`, un estado o lista) cambia esto. El filtro `?label=` se sustituye por `?enfermedad_id=`/`?severidad=`. Nuevos campos en `global` (`monitoreos_sin_finalizar`, `muestras_con_deteccion`, `incidencia`, `incidencia_total`, `confianza_promedio`), nuevo endpoint `GET /api/dashboard/enfermedades/` y `GET /api/dashboard/monitoreo/<id>/` ahora devuelve el payload estándar del monitoreo (con `trazado`) más `resumen`. | **Sí** (cifras distintas por defecto y forma nueva del detalle) | Finalizar los monitoreos para que cuenten, o enviar `estado=TODOS`. Leer el detalle con la estructura de §6 + `resumen`. |
| 9 | **Exportaciones** `/api/exportar/…` (CSV, XLSX, ZIP, manifiesto, `?validar=1`). Son **sólo para el panel web**: un dispositivo móvil recibe `403`. | No | Nada. No intentar llamarlas desde la app (ver Anexo A). |
| 10 | **Nuevo código `409`** (trazado en uso) y mensajes de validación más específicos (índices, cajas, trazado). | No | Tratar `409` como conflicto (§2). |
| 11 | **Errores limpios en lugar de `500`.** Borrar una muestra o detección de un monitoreo `FINALIZADO`/`CANCELADO` devuelve `409`; `?desde=`/`?hasta=` mal formados, un body JSON que no es objeto, una finca sin `nombre`/`extension` o `muestras` dentro del JSON de `POST /api/monitoreos/` devuelven `400` con mensaje claro. | No | Mostrar el `error` del servidor; subir las muestras siempre por `POST /api/monitoreos/<id>/muestras/` (multipart). |

Sin cambios en el alta del dispositivo (`/api/auth/…`), en el catálogo de enfermedades (salvo el campo `alias`
en el payload) ni en la FSM del monitoreo.

---

## 1. Mecánica de autenticación (IMPORTANTE)

La app **no tiene pantalla de login**. Se registra una sola vez y guarda un token que
usa en todas las peticiones. No hay cookies, no hay CSRF y no hay JWT.

### Flujo de arranque del frontend

1. **Sólo en el primer arranque:** `POST /api/auth/devices/register/` enviando el código
   de alta. Devuelve un `token`.
2. Guardar el token en almacenamiento seguro (`expo-secure-store` o equivalente).
   **No se puede volver a consultar**: si se pierde, hay que registrar el dispositivo de nuevo.
3. En **todas** las peticiones siguientes, incluidas las de lectura:
   `Authorization: Bearer <token>`.
4. Opcional, al arrancar: `GET /api/auth/me/` para comprobar que el token sigue vigente.
   Si responde `401`, el dispositivo fue revocado y hay que registrarlo otra vez.

```js
fetch(`${API}/api/fincas/`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

> Sin la cabecera (o con un token inválido, revocado o de un usuario desactivado), cualquier
> endpoint responde `401 {"error": "No autenticado"}`. El código de alta es una constante
> de compilación de la app, no algo que teclee el usuario.

### Alcance de los datos

Cada dispositivo **sólo ve lo que él mismo registró**. Las fincas, trazados, monitoreos, muestras y
detecciones de otro dispositivo no aparecen en los listados, y pedirlas por id devuelve
`404` (no `403`, para no revelar que existen). Intentar colgar un monitoreo de una finca
ajena, o una muestra de un monitoreo ajeno, también devuelve `404`.

Dos consecuencias para la app:

- Al **reinstalarse**, el dispositivo se registra de nuevo y empieza de cero: lo que subió
  la instalación anterior deja de ser accesible para él.
- Dos móviles distintos **no comparten inventario**, aunque trabajen la misma finca.

El catálogo de enfermedades es la excepción: es global y de sólo lectura para la app.
El panel web interno sí ve el conjunto completo.

---

## 2. Convenciones, códigos de estado y límites

### Convenciones de los ejemplos

Todos los ejemplos usan este ayudante `call` (los de §12 son equivalentes). `API` es la URL base.

```js
const API = "https://riceback-backend.onrender.com";

// Devuelve { status, ok, data }. `data` es null en 204 y cuando la respuesta no es JSON (404/500 HTML).
async function call(method, path, { body, form, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;                       // multipart: NO fijar Content-Type
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* HTML */ }
  return { status: res.status, ok: res.ok, data };
}
```

En el HTTP crudo se omite `Host: riceback-backend.onrender.com`. `<token>` es el token del dispositivo.

### Formatos de los datos

- **Fechas y horas:** `created_at`/`updated_at` en ISO 8601 con zona UTC, p. ej. `"2026-09-10T08:05:00.123456+00:00"`.
  `fecha` del monitoreo es `AAAA-MM-DD`.
- **Decimales como string:** `extension`, `latitud`, `longitud`. Trátelos como números al leerlos: la cantidad de
  decimales varía (`"25.5"` en la respuesta de un `POST`/`PATCH`, `"25.5000"` al listar o consultar).
- **Listados sin paginación:** `GET` de colecciones devuelve **todo** el conjunto visible del dispositivo, sin
  `page`/`limit`. Los listados de fincas, monitoreos y trazados van del más nuevo al más antiguo; las muestras y
  detecciones también (`created_at` descendente).
- **Mensajes de validación:** el texto de `error` viene del servidor en español, pero no siempre es una frase: en
  validaciones del modelo puede ser un diccionario como texto, p. ej.
  `"{'municipio': ['Este campo no puede estar vacío.']}"`. Muéstrelo tal cual o use el código de estado para decidir.
- **Cuerpos:** JSON (`Content-Type: application/json`, máx. 1 MB: si lo excede, `400 "Payload demasiado grande (máximo 1024 KB)."`)
  salvo la creación de muestras, que es `multipart/form-data`.

### Códigos de estado

| Código | Significado |
|--------|-------------|
| `200`  | OK (GET / PUT / PATCH) |
| `201`  | Recurso creado (POST) |
| `204`  | Eliminado (DELETE, sin cuerpo) |
| `400`  | JSON inválido, validación o regla de negocio (`{"error": "..."}`) |
| `401`  | Token ausente, inválido o revocado (`{"error": "No autenticado"}`) |
| `403`  | Código de alta inválido (`/auth/devices/register/`); escritura del catálogo de enfermedades sin ser superusuario (`{"error": "Se requiere un superusuario"}`); exportaciones desde un dispositivo |
| `404`  | Recurso inexistente **o de otro dispositivo** (HTML de Django, no JSON) |
| `405`  | Método no permitido en esa ruta (cuerpo vacío) |
| `409`  | Conflicto de estado: el recurso está en uso (borrar o editar la geometría de un trazado que ya usa un monitoreo) o el monitoreo está cerrado (borrar una muestra o detección de un monitoreo `FINALIZADO`/`CANCELADO`); `{"error": "..."}` |
| `413`  | No lo emiten los endpoints de la app. Sólo las exportaciones web (Anexo A). Si un proxy lo devolviera por un cuerpo demasiado grande, trátelo como "archivo demasiado grande" |
| `429`  | Rate limit del alta de dispositivos (5 intentos / 5 min por IP) |
| `500`  | Error inesperado del servidor (HTML). Ninguna entrada inválida conocida lo provoca |

### Límites y topes

| Qué | Límite (por defecto) | Si se excede |
|-----|----------------------|--------------|
| Alta de dispositivos | 5 peticiones / 5 min por IP (cuenta también las correctas) | `429` |
| Cuerpo JSON | 1 MB | `400` |
| Foto de muestra | 10 MB (`AGRI_MAX_IMAGE_SIZE`), lado máximo 8192 px (`AGRI_MAX_IMAGE_DIMENSION`), JPEG/PNG/MPO | `400` |
| Fotos por punto de muestreo | `foto_indice` de `0` a `4` (`AGRI_MAX_FOTOS_POR_PUNTO` = 5) | `400` |
| Pareja `punto_indice` + `foto_indice` | única dentro del monitoreo | `400 "Ya existe una muestra para ese punto y foto en el monitoreo."` |
| `punto_indice` con trazado | menor que el número de puntos del `recorrido` (si no está vacío) | `400` |
| Vértices del polígono | de 3 a 1000 (`AGRI_MAX_PUNTOS_POLIGONO`) | `400` |
| Puntos del recorrido | de 0 a 500 (`AGRI_MAX_PUNTOS_RECORRIDO`) | `400` |
| `municipio`, `departamento`, `vereda` | 150 caracteres | `400` |
| `nombre` de finca | 200 caracteres | `400` |
| `nombre` de trazado | 200 caracteres | `400` |
| `codigo` de muestra | 50 caracteres | `400` |
| `confidence` | entre 0 y 1 | `400` |
| Latitud / longitud | −90…90 / −180…180 | `400` |
| Exportaciones (XLSX, ZIP) | ver Anexo A | `413` (sólo web) |

Los topes de tamaño y de puntos son configurables en el servidor (variables `AGRI_*`); los valores de la tabla son los del
despliegue por defecto.

### Comportamientos conocidos (tal como están hoy)

- `GET /api/monitoreos/<id>/muestras/` de un monitoreo inexistente **o ajeno** devuelve `200 {"muestras": []}` (no `404`).
- La **foto de una muestra no se puede reemplazar** por `PUT`/`PATCH` (esos endpoints sólo aceptan JSON): para cambiar la
  foto hay que borrar la muestra y subirla de nuevo.
- `GET /api/monitoreos/?estado=` con un estado desconocido no falla: devuelve lista vacía.
- `DELETE` de una **muestra o detección** cuyo monitoreo está `FINALIZADO`/`CANCELADO` responde `409`: no lo ofrezca
  en la interfaz para monitoreos cerrados. `DELETE` del monitoreo, en cambio, funciona en cualquier estado.
- `PATCH`/`PUT` de monitoreo, muestra o detección con un campo desconocido lo ignora sin error.

### Estructura de un usuario (payload `_user_payload`)

```json
{
  "id": 1,
  "username": "device_c8151bd4e46e",
  "email": "device_c8151bd4e46e@devices.invalid",
  "role": "INVESTIGADOR",
  "first_name": "",
  "last_name": "",
  "is_staff": false,
  "is_superuser": false,
  "tipo": "investigador"
}
```

> `tipo` es `"superusuario"` si `is_superuser` es `true`, si no `"investigador"`. Un dispositivo siempre es `investigador`.

---

## 3. Autenticación — `/api/auth/`

### `POST /api/auth/devices/register/`
Da de alta la instalación y entrega su token. Es el **único** endpoint que no exige token.
- **Envío:** JSON
```json
{ "join_code": "<código de alta>", "platform": "android", "app_version": "1.0.0" }
```
  `platform` y `app_version` son opcionales y sólo sirven para diagnóstico (se truncan a 32 caracteres).
- **Devuelve:** `201`
```json
{
  "token": "cn3hE6Pdv-JoWT9iq_ODlOwCWpC6ByFV3Qp3HD4J9dE",
  "device_id": 1,
  "user": {
    "id": 1, "username": "device_c8151bd4e46e", "email": "device_c8151bd4e46e@devices.invalid",
    "role": "INVESTIGADOR", "first_name": "", "last_name": "",
    "is_staff": false, "is_superuser": false, "tipo": "investigador"
  }
}
```
- Errores:

| Código | Cuándo | Cuerpo |
|--------|--------|--------|
| `400` | JSON inválido o no es un objeto | `{"error": "JSON inválido: ..."}` / `{"error": "Se esperaba un objeto JSON."}` |
| `403` | Código de alta incorrecto | `{"error": "Código de alta inválido"}` |
| `429` | 5 peticiones en 5 min desde la misma IP | `{"error": "Demasiados intentos. Intente más tarde."}` |
| `503` | El servidor no tiene configurado el código de alta | `{"error": "El alta de dispositivos no está configurada."}` |

- El backend crea un usuario propio para el dispositivo (`device_<hex>`), que es el que queda como `owner` de lo que registre.
- Cada petición cuenta para el límite por IP (también las correctas): no registre en bucle.

HTTP:
```
POST /api/auth/devices/register/ HTTP/1.1
Content-Type: application/json

{"join_code": "<código de alta>", "platform": "android", "app_version": "1.0.0"}
```
fetch:
```js
const { status, data } = await call("POST", "/api/auth/devices/register/", {
  body: { join_code: JOIN_CODE, platform: "android", app_version: "1.0.0" },
});
if (status === 201) await SecureStore.setItemAsync("device_token", data.token);
```

### `GET /api/auth/me/`
Datos del usuario del dispositivo. Sirve para verificar que el token sigue siendo válido.
- **Devuelve:** payload de usuario — `200`; `401 {"error": "No autenticado"}` si falta el token o fue revocado.
- Requiere token.

HTTP:
```
GET /api/auth/me/ HTTP/1.1
Authorization: Bearer <token>
```
fetch:
```js
const { status, data } = await call("GET", "/api/auth/me/", { token });
// 200 -> data = payload de usuario;  401 -> {"error": "No autenticado"}
```

---

## 4. Fincas — `/api/fincas/`

Estructura de una finca (`_finca_payload`):

```json
{
  "id": 1,
  "nombre": "Finca La Aurora",
  "vereda": "El Roble",
  "municipio": "Ibagué",
  "departamento": "Tolima",
  "extension": "25.5000",
  "owner_id": 1,
  "owner_username": "device_c8151bd4e46e",
  "created_at": "2026-09-10T08:00:00.368089+00:00",
  "updated_at": "2026-09-10T08:00:00.368089+00:00"
}
```

> `extension` (hectáreas) se devuelve como **string** (Decimal). `municipio` y `departamento` son **obligatorios**
> (texto, máx. 150 caracteres). `vereda` es opcional (`""` si no se envía).

### `GET /api/fincas/`
- **Devuelve:** `{"fincas": [payload-finca, ...]}` — `200` (sólo las fincas del dispositivo)
- Requiere token.

```
GET /api/fincas/ HTTP/1.1
Authorization: Bearer <token>
```
```js
const { data } = await call("GET", "/api/fincas/", { token });   // data.fincas
```

### `POST /api/fincas/`
- **Envío:** JSON
```json
{
  "nombre": "Finca La Aurora",
  "extension": 25.5,
  "municipio": "Ibagué",
  "departamento": "Tolima",
  "vereda": "El Roble"
}
```
  `nombre`, `extension`, `municipio` y `departamento` son obligatorios; `vereda` es opcional.
  `owner_id` es opcional y sólo un **superusuario** puede enviarlo: un dispositivo siempre crea la finca a su nombre.
- **Devuelve:** payload-finca — `201`.
- **Errores `400`** (`{"error": "..."}`), con el texto exacto del servidor:

| Causa | Mensaje |
|-------|---------|
| Falta `nombre` o `extension` (ausente o vacío) | `"El campo 'nombre' es obligatorio."` / `"El campo 'extension' es obligatorio."` |
| El cuerpo no es un objeto JSON (p. ej. una lista) | `"Se esperaba un objeto JSON."` |
| `municipio`/`departamento` ausentes o vacíos | `"{'municipio': ['Este campo no puede estar vacío.'], 'departamento': ['Este campo no puede estar vacío.']}"` |
| `extension` negativa | `"{'extension': ['Asegúrese de que este valor es mayor o igual a 0.']}"` |
| `extension` no numérica | `"[<class 'decimal.ConversionSyntax'>]"` |
| JSON mal formado | `"JSON inválido: ..."` |

```
POST /api/fincas/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"nombre": "Finca La Aurora", "extension": 25.5, "municipio": "Ibagué", "departamento": "Tolima", "vereda": "El Roble"}
```
```js
const res = await call("POST", "/api/fincas/", {
  token,
  body: { nombre: "Finca La Aurora", extension: 25.5, municipio: "Ibagué", departamento: "Tolima", vereda: "El Roble" },
});
if (res.status === 201) fincaId = res.data.id;
```
Respuesta `201`:
```json
{
  "id": 1, "nombre": "Finca La Aurora", "vereda": "El Roble", "municipio": "Ibagué", "departamento": "Tolima",
  "extension": "25.5", "owner_id": 1, "owner_username": "device_c8151bd4e46e",
  "created_at": "2026-10-22T04:43:31.368089+00:00", "updated_at": "2026-10-22T04:43:31.368089+00:00"
}
```

### `GET /api/fincas/<id>/`
- **Devuelve:** payload-finca — `200`; `404` si no existe o es de otro dispositivo (HTML).
- Requiere token.

### `PUT/PATCH /api/fincas/<id>/`
- **Envío:** JSON parcial o completo con los campos a cambiar (`PUT` y `PATCH` se comportan igual):
```json
{ "nombre": "Nuevo nombre", "extension": 30, "municipio": "Espinal", "departamento": "Tolima" }
```
  Campos editables: `nombre`, `extension`, `vereda`, `municipio`, `departamento`. `municipio` y `departamento` no se pueden dejar vacíos.
  `owner_id` solo lo aplica un superusuario (a un dispositivo se le ignora).
- **Devuelve:** payload-finca — `200`; `400` en validación (mismos mensajes que el `POST`); `404`.
- Requiere token.

```
PATCH /api/fincas/1/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"extension": 30}
```
```js
await call("PATCH", `/api/fincas/${fincaId}/`, { token, body: { extension: 30 } });
```

### `DELETE /api/fincas/<id>/`
- **Devuelve:** vacío — `204`; `404`. Elimina en cascada los trazados, monitoreos, muestras y detecciones de la finca.
- Requiere token.

```js
await call("DELETE", `/api/fincas/${fincaId}/`, { token });   // 204
```

### Trazados de la finca — `/api/fincas/<finca_id>/trazados/` y `/api/fincas/trazados/<id>/`

Un **trazado** es el dibujo del terreno que la app móvil guarda por finca y que varios
monitoreos reutilizan. Las coordenadas son del **lienzo de la app** (no geográficas).

Estructura (`trazado_payload`):

```json
{
  "id": 1,
  "finca_id": 1,
  "nombre": "Lote norte",
  "poligono": [
    { "x": 12.5, "y": 20, "id": "v1" },
    { "x": 310, "y": 18, "id": "v2" },
    { "x": 290, "y": 240, "id": "v3" }
  ],
  "recorrido": [{ "x": 40, "y": 50 }, { "x": 120, "y": 90 }, { "x": 200, "y": 150 }],
  "bbox": { "min_x": 12.5, "min_y": 18, "max_x": 310, "max_y": 240 },
  "n_monitoreos": 0,
  "created_at": "2026-10-22T04:43:31.423389+00:00",
  "updated_at": "2026-10-22T04:43:31.423389+00:00"
}
```

- `poligono`: contorno del terreno, **al menos 3 vértices** `{x, y}`; `id` es opcional (texto o
  entero) y se conserva. `recorrido`: ruta de muestreo, lista de `{x, y}` que **puede estar
  vacía**. El índice `i` del `recorrido` es el `punto_indice` `i` de las muestras.
- `x` e `y` deben ser números finitos (no se aceptan texto, `true`, `NaN` ni `Infinity`). Cualquier
  otra clave de un punto se descarta.
- Topes configurables: `AGRI_MAX_PUNTOS_POLIGONO` (1000) y `AGRI_MAX_PUNTOS_RECORRIDO` (500).
- `bbox` es la caja envolvente de polígono y recorrido juntos; sirve para escalar el dibujo sin
  guardar el tamaño del lienzo. `n_monitoreos` cuenta los monitoreos que lo usan.
- Nombres de la app móvil aceptados como alias al **enviar**: `polygon` → `poligono` y
  `samplingPath` → `recorrido`. Si llegan ambos nombres, gana el canónico. La respuesta usa
  siempre `poligono`/`recorrido`.

#### `GET /api/fincas/<finca_id>/trazados/`
- **Devuelve:** `{"trazados": [payload-trazado, ...]}` del más nuevo al más antiguo — `200`;
  `404` si la finca no existe o es de otro dispositivo.

#### `POST /api/fincas/<finca_id>/trazados/`
- **Envío:** JSON `{"nombre": "Lote norte", "poligono": [...], "recorrido": [...]}`. Sólo
  `poligono` es obligatorio; `nombre` es opcional.
- **Devuelve:** payload-trazado — `201`.
- **Errores `400`:** `"El campo 'poligono' es obligatorio."`; `"poligono: Se requieren al menos 3 puntos."`;
  `"poligono: El punto 1 requiere 'x' como número finito."`; `"recorrido: Se permiten máximo 500 puntos."`;
  `"Se esperaba un objeto JSON."`. `404` si la finca no es del dispositivo.

```
POST /api/fincas/1/trazados/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"nombre": "Lote norte",
 "polygon": [{"x": 12.5, "y": 20, "id": "v1"}, {"x": 310, "y": 18, "id": "v2"}, {"x": 290, "y": 240, "id": "v3"}],
 "samplingPath": [{"x": 40, "y": 50}, {"x": 120, "y": 90}, {"x": 200, "y": 150}]}
```
```js
const res = await call("POST", `/api/fincas/${fincaId}/trazados/`, {
  token,
  body: { nombre: "Lote norte", polygon: terreno.polygon, samplingPath: terreno.samplingPath },
});
if (res.status === 201) trazadoId = res.data.id;   // guárdelo junto al terreno local
```
Respuesta `201`: el payload-trazado mostrado arriba.

#### `GET /api/fincas/trazados/<id>/`
- **Devuelve:** payload-trazado — `200`; `404`.

#### `PUT/PATCH /api/fincas/trazados/<id>/`
- **Envío:** JSON con `nombre`, `poligono` y/o `recorrido` (actualización parcial; admite los alias).
- **Inmutabilidad:** mientras algún monitoreo use el trazado, `poligono` y `recorrido` **no se
  pueden cambiar** (`409`); `nombre` sí. Reenviar la misma geometría no cuenta como cambio.
  Para dibujar de nuevo, cree otro trazado.
- **Devuelve:** payload-trazado — `200`; `400` geometría inválida; `409` trazado en uso:
```json
{ "error": "El trazado está en uso por monitoreos: su polígono y recorrido no se pueden modificar." }
```

#### `DELETE /api/fincas/trazados/<id>/`
- **Devuelve:** vacío — `204`; `409` si algún monitoreo lo usa (bórrelo o cambie el trazado del monitoreo antes):
```json
{ "error": "El trazado está en uso por monitoreos y no se puede eliminar." }
```

Todos requieren token. Un dispositivo sólo alcanza los trazados de **sus** fincas (`404` si no).

---

## 5. Enfermedades — `/api/enfermedades/`

El catálogo viene precargado (p. ej. `ESCALDADO_HOJA_ARROZ` y `PYRICULARIA_ORYZAE`). Para la app es de **sólo lectura**:
las escrituras exigen superusuario y un dispositivo recibe `403 {"error": "Se requiere un superusuario"}`.

Estructura (`_enfermedad_payload`):

```json
{
  "id": 2,
  "codigo": "PYRICULARIA_ORYZAE",
  "nombre_comun": "Tizón del arroz",
  "nombre_cientifico": "Pyricularia oryzae",
  "nombre_cientifico_alterno": "Magnaporthe oryzae",
  "cultivo": "Arroz",
  "descripcion": "",
  "observaciones": "",
  "alias": ["blast", "rice_blast", "leaf_blast", "pyricularia", "tizon", "magnaporthe_oryzae"],
  "activa": true,
  "created_at": "2026-01-01T00:00:00.000000+00:00",
  "updated_at": "2026-01-01T00:00:00.000000+00:00"
}
```

> `alias` son los nombres de clase que emite el modelo de detección para esa
> enfermedad. Al crear una detección, la clase se compara (sin mayúsculas, tildes
> ni diferencias entre `_`, `-`, `.` y espacios) contra el `codigo` y los `alias`
> de las enfermedades **activas**. Un mismo nombre no puede identificar a dos
> enfermedades (`400`).

### `GET /api/enfermedades/`
- **Envío:** opcional `?activas=false` (o `0`) para listar todas (por defecto solo las activas).
- **Devuelve:** `{"enfermedades": [payload-enfermedad, ...]}` — `200`
- Requiere token.

```
GET /api/enfermedades/ HTTP/1.1
Authorization: Bearer <token>
```
```js
const { data } = await call("GET", "/api/enfermedades/", { token });   // data.enfermedades
```

### `POST /api/enfermedades/`  *(solo superusuario)*
- **Envío:** JSON
```json
{
  "codigo": "ESCALDADO_HOJA_ARROZ",
  "nombre_comun": "Escaldado de la hoja",
  "nombre_cientifico": "Rhynchosporium oryzae",
  "cultivo": "arroz",
  "nombre_cientifico_alterno": "",
  "descripcion": "",
  "observaciones": "",
  "alias": ["leaf_scald", "escaldado"],
  "activa": true
}
```
  (`codigo`, `nombre_comun`, `nombre_cientifico`, `cultivo` obligatorios; los demás opcionales).
- **Devuelve:** payload-enfermedad — `201`; `400` si `codigo`/`nombre_cientifico` ya existen o un alias ya identifica a otra enfermedad;
  `403` si no es superusuario.
- Requiere token.

### `GET /api/enfermedades/<id>/`
- **Devuelve:** payload-enfermedad — `200`; `404` (HTML).
- Requiere token.

### `PUT/PATCH /api/enfermedades/<id>/`  *(solo superusuario)*
- **Envío:** JSON con campos a cambiar.
- **Devuelve:** payload-enfermedad — `200`; `400` en validación; `403`.
- Requiere token.

### `DELETE /api/enfermedades/<id>/`  *(solo superusuario)*
- **Devuelve:** vacío — `204`; `403`.
- **Importante:** si la enfermedad tiene detecciones asociadas devuelve `400` y sugiere desactivarla con `activa:false`.
- Requiere token.

---

## 6. Monitoreos — `/api/monitoreos/`

### Estados de un monitoreo (FSM)

| Estado | Puede transicionar a |
|--------|----------------------|
| `BORRADOR`   | `EN_PROGRESO`, `CANCELADO` |
| `EN_PROGRESO`| `FINALIZADO`, `CANCELADO` |
| `FINALIZADO` | (terminal) |
| `CANCELADO`  | (terminal) |

> Una vez `FINALIZADO` o `CANCELADO`, no se puede modificar ni añadir muestras/detecciones.
> No se puede saltar de `BORRADOR` a `FINALIZADO`: hay que pasar por `EN_PROGRESO`.
> Se pueden añadir muestras en `BORRADOR` y en `EN_PROGRESO`.

Estructura (`_monitoreo_payload`):

```json
{
  "id": 1,
  "finca_id": 1,
  "trazado_id": 1,
  "finca_nombre": "Finca La Aurora",
  "finca_vereda": "El Roble",
  "finca_municipio": "Ibagué",
  "finca_departamento": "Tolima",
  "codigo": "MON-03176102",
  "estado": "BORRADOR",
  "fecha": "2026-09-10",
  "observaciones": "Revisión semanal",
  "created_at": "2026-10-22T04:43:31.464405+00:00",
  "updated_at": "2026-10-22T04:43:31.464405+00:00",
  "trazado": { "...payload-trazado, o null si no tiene...": "" },
  "muestras": []
}
```

`trazado_id` (`null` si no tiene) viaja siempre; el objeto `trazado` completo y `muestras` (con sus `detecciones`)
sólo en el detalle, la creación y el `PATCH`/`PUT` (no en el listado).

### `GET /api/monitoreos/`
- **Envío:** filtros opcionales por query: `?finca_id=&estado=&desde=&hasta=` (`desde`/`hasta` = fecha `AAAA-MM-DD`;
  una fecha mal escrita responde `400 {"error": "'desde' debe tener formato AAAA-MM-DD."}`).
- **Devuelve:** `{"monitoreos": [payload-monitoreo, ...]}` (sin `trazado` ni `muestras`) — `200`
- Requiere token.

```
GET /api/monitoreos/?finca_id=1&estado=EN_PROGRESO HTTP/1.1
Authorization: Bearer <token>
```
```js
const { data } = await call("GET", `/api/monitoreos/?finca_id=${fincaId}&estado=EN_PROGRESO`, { token });
```

### `POST /api/monitoreos/`
- **Envío:** JSON
```json
{
  "finca_id": 1,
  "estado": "BORRADOR",
  "fecha": "2026-09-10",
  "observaciones": "Revisión semanal",
  "trazado_id": 1,
  "muestras": []
}
```
  `finca_id` es obligatorio. `estado` (opcional, por defecto `BORRADOR`) solo acepta `BORRADOR` o `EN_PROGRESO` al crear.
  `fecha` (opcional, por defecto hoy). `trazado_id` (opcional) debe ser un trazado **de la misma finca**; si no existe o
  es de otra finca responde `400` con el mismo mensaje. `muestras` no se acepta por JSON: si viene con elementos
  responde `400` indicando que las muestras se suben una a una con `POST /api/monitoreos/<id>/muestras/` (multipart, receta 5).
- **Devuelve:** payload-monitoreo **con `trazado` y `muestras`** — `201`.
- **Errores:**

| Código | Causa | Cuerpo |
|--------|-------|--------|
| `404` | `finca_id` ausente, inexistente o de otro dispositivo | HTML |
| `400` | `estado` distinto de `BORRADOR`/`EN_PROGRESO` | `"Estado inicial no válido: FINALIZADO. Use BORRADOR o EN_PROGRESO para crear un monitoreo."` |
| `400` | `trazado_id` inexistente o de otra finca | `"El trazado indicado no existe o no pertenece a la finca del monitoreo."` |
| `400` | `fecha` con formato inválido | `"['“abc” : el valor tiene un formato de fecha inválido. Debería estar en el formato YYYY-MM-DD.']"` |
| `400` | Cuerpo no es un objeto JSON | `"Se esperaba un objeto JSON."` |
| `400` | `muestras` con elementos | `"Las muestras no se envían en este endpoint: crea el monitoreo y sube cada muestra con POST /api/monitoreos/<id>/muestras/ (multipart con la foto)."` |

```
POST /api/monitoreos/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"finca_id": 1, "trazado_id": 1, "estado": "BORRADOR", "fecha": "2026-09-10", "observaciones": "Revisión semanal"}
```
```js
const res = await call("POST", "/api/monitoreos/", {
  token,
  body: { finca_id: fincaId, trazado_id: trazadoId, estado: "BORRADOR", fecha: "2026-09-10", observaciones: "Revisión semanal" },
});
if (res.status === 201) monitoreoId = res.data.id;
```
Respuesta `201` (trazado abreviado):
```json
{
  "id": 1, "finca_id": 1, "trazado_id": 1,
  "finca_nombre": "Finca La Aurora", "finca_vereda": "El Roble",
  "finca_municipio": "Ibagué", "finca_departamento": "Tolima",
  "codigo": "MON-03176102", "estado": "BORRADOR", "fecha": "2026-09-10",
  "observaciones": "Revisión semanal",
  "created_at": "2026-10-22T04:43:31.464405+00:00", "updated_at": "2026-10-22T04:43:31.464405+00:00",
  "trazado": { "id": 1, "finca_id": 1, "nombre": "Lote norte", "poligono": ["..."], "recorrido": ["..."],
               "bbox": { "min_x": 12.5, "min_y": 18, "max_x": 310, "max_y": 240 }, "n_monitoreos": 1,
               "created_at": "2026-10-22T04:43:31.423389+00:00", "updated_at": "2026-10-22T04:43:31.423389+00:00" },
  "muestras": []
}
```
> El `POST` no es idempotente: si la respuesta se pierde, un reintento crea otro monitoreo. Consulte antes
> `GET /api/monitoreos/?finca_id=…` (receta 8).

### `GET /api/monitoreos/<id>/`
- **Devuelve:** payload-monitoreo **con `trazado`, `muestras` y sus `detecciones`** — `200`; `404`.
- Requiere token.

### `PUT/PATCH /api/monitoreos/<id>/`
- **Envío:** JSON con campos a cambiar: `observaciones`, `fecha`, `finca_id`, `trazado_id` y/o `estado`.
  - Cambiar `estado` dispara la FSM (ej. de `BORRADOR` a `EN_PROGRESO`). Se puede combinar con otros campos salvo si el
    destino es `FINALIZADO` o `CANCELADO`.
  - `trazado_id` asigna o cambia el trazado (`null` lo quita) sólo mientras el monitoreo es
    editable (no `FINALIZADO`/`CANCELADO`). Si ya hay muestras, todas deben caber en el
    recorrido del nuevo trazado (`punto_indice` menor que el número de puntos).
  - No se permite cambiar finca si el monitoreo ya tiene muestras.
  - No se puede cambiar `estado` a un estado final **y** a la vez modificar otros campos en el mismo request.
- **Devuelve:** payload-monitoreo con `trazado` y muestras — `200`; `404`.
- **Errores `400`:**

| Causa | Mensaje |
|-------|---------|
| Transición no permitida (incluye repetir el mismo estado) | `"Transición no permitida de EN_PROGRESO a EN_PROGRESO"` |
| Estado inexistente | `"Estado desconocido: XX"` |
| Estado final + otros campos | `"No se puede modificar un monitoreo y transicionarlo a un estado final simultáneamente"` |
| Monitoreo ya cerrado | `"No se puede modificar un monitoreo en estado FINALIZADO"` |
| Trazado de otra finca | `"El trazado indicado no existe o no pertenece a la finca del monitoreo."` |
| Cambiar de finca con muestras | `"No se puede cambiar la finca de un monitoreo con muestras."` |
| Muestras fuera del recorrido | `"El monitoreo tiene muestras en el punto 3, fuera del recorrido del trazado (3 puntos)."` |
- Requiere token.

```
PATCH /api/monitoreos/1/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"estado": "EN_PROGRESO"}
```
```js
await call("PATCH", `/api/monitoreos/${monitoreoId}/`, { token, body: { estado: "EN_PROGRESO" } });   // iniciar
await call("PATCH", `/api/monitoreos/${monitoreoId}/`, { token, body: { estado: "FINALIZADO" } });    // finalizar (sin otros campos)
```

### `DELETE /api/monitoreos/<id>/`
- **Devuelve:** vacío — `204`; `404`. Funciona en cualquier estado y elimina sus muestras y detecciones.
- Requiere token.

---

## 7. Muestras — `/api/monitoreos/<id>/muestras/` y `/api/monitoreos/muestras/<id>/`

Estructura (`muestra_payload`):

```json
{
  "id": 1,
  "monitoreo_id": 1,
  "codigo": "MUE-428B458B",
  "foto_url": "/media/muestras/2026/10/22/cde56176a9804304898ecde9573a86e7.jpg",
  "imagen_url": "/media/muestras/2026/10/22/cde56176a9804304898ecde9573a86e7.jpg",
  "ancho_px": 800,
  "alto_px": 600,
  "punto_indice": 0,
  "foto_indice": 2,
  "estado": "PENDIENTE",
  "latitud": "4.71100000",
  "longitud": "-74.07210000",
  "created_at": "2026-10-22T04:43:31.578443+00:00",
  "updated_at": "2026-10-22T04:43:31.579446+00:00",
  "detecciones": []          // cuando incluye
}
```

- `foto_url` e `imagen_url` son alias del mismo archivo. Con almacenamiento local es una ruta relativa (`/media/...`: anteponga
  la URL base); con almacenamiento S3/B2 es una URL absoluta. `latitud`/`longitud` se devuelven como string o `null`
  (el `POST` devuelve el texto tal como se envió; los `GET`, con 8 decimales).
- `ancho_px`/`alto_px` los calcula el backend al subir la foto: son el tamaño de la
  imagen **sin aplicar la rotación EXIF**, que es el sistema de coordenadas de las cajas.
- `punto_indice`/`foto_indice` ubican la foto en el recorrido de muestreo (índices
  desde 0, como en ricemobile). Son opcionales, pero van juntos; `foto_indice` va de
  `0` a `AGRI_MAX_FOTOS_POR_PUNTO - 1` (5 fotos por defecto) y la pareja no se puede
  repetir dentro del monitoreo. Con ellos se calcula la incidencia por punto.
- Si el monitoreo tiene un trazado con `recorrido` no vacío, `punto_indice` debe ser menor
  que el número de puntos del recorrido (`400` si lo excede). Con recorrido vacío o sin
  trazado no hay límite.

Estados de muestra: `PENDIENTE` (por defecto), `PROCESADA`, `ERROR`.

### `GET /api/monitoreos/<id>/muestras/`
- **Envío:** opcional `?estado=PENDIENTE`.
- **Devuelve:** `{"muestras": [payload-muestra con detecciones, ...]}` — `200`. Si el monitoreo no existe o es de otro
  dispositivo devuelve `{"muestras": []}`, no `404`.
- Requiere token.

### `POST /api/monitoreos/<id>/muestras/`  ⚠️ **multipart/form-data**
La muestra se envía como **formulario multipart** (no JSON) porque incluye un archivo.

- **Envío (multipart):**
```
foto: <archivo JPEG/PNG>         # obligatorio (también acepta el campo "imagen")
punto_indice: 0                  # opcional (junto con foto_indice)
foto_indice: 2                   # opcional (junto con punto_indice)
codigo: MUE-1                    # opcional (se genera MUE-XXXXXXXX si se omite)
estado: PENDIENTE                # opcional (PENDIENTE | PROCESADA | ERROR)
latitud: 4.7110                  # opcional (-90..90)
longitud: -74.0721               # opcional (-180..180)
detecciones: [...]               # opcional, STRING JSON (ver nota)
```
  Los campos de texto vacíos se tratan como ausentes. El campo `detecciones` es un **string JSON** con el arreglo
  **tal cual lo devuelve el detector de ricemobile** (`ObjectDetection.detectObjects`):
```json
[
  {
    "frame": { "origin": { "x": 120, "y": 80 }, "size": { "x": 45, "y": 60 } },
    "labels": [
      { "text": "{\"enfermedad\":\"blast\",\"severidad\":\"ALTA\",\"posicion\":\"hoja\"}", "confidence": 0.92 },
      { "text": "leaf_scald", "confidence": 0.41 }
    ],
    "uuid": "9f3a0c2e-1b7d-4c55-9a10-3d2f6b8e7a41",   // opcional, id generado en el dispositivo
    "notas": "marca en la hoja"                        // opcional
  }
]
```
  - `frame`: caja en **píxeles** de la foto sin rotar; `origin` es la esquina superior
    izquierda y `size` el ancho/alto. La caja debe caber en la imagen (`400` si no; margen de 1 px).
  - `labels`: al menos una. La de **mayor confianza** es la principal; el resto se
    guarda en `etiquetas_alternas`.
  - `labels[].text`: texto plano con la clase (`"blast"`) **o** un JSON en string con
    la clase y demás atributos del modelo. Del JSON se extraen, sin distinguir mayúsculas:
    - clase: `enfermedad`, `clase`, `class`, `label`, `nombre`, `disease` o `name`
    - severidad: `severidad`, `severity` o `nivel_severidad`
    - posición: `posicion`, `position`, `organo`, `organ` o `ubicacion`

    El objeto completo se conserva en `atributos`.
  - La enfermedad se resuelve por `codigo`/`alias` (ver §5). Si la clase no está en el
    catálogo la detección se guarda igual, con `enfermedad_id: null` y `catalogada: false`.
  - `uuid`: si se envía debe ser un UUID válido y **único en todo el sistema**; si se omite, el servidor genera uno.

  **Nota sobre imágenes:** válidas JPEG/PNG (también MPO del modo Retrato de iPhone),
  máx. 10 MB y dimensiones ≤ 8192 px (configurable). Un archivo que no es imagen devuelve `400`.
- **Devuelve:** payload-muestra **con sus detecciones** — `201`. La operación es atómica: si la muestra o cualquier caja
  es inválida no se guarda nada.
- **Errores:**

| Código | Causa | Mensaje |
|--------|-------|---------|
| `404` | Monitoreo inexistente o ajeno | HTML |
| `400` | Falta `foto` | `"El campo 'foto' es obligatorio"` |
| `400` | Monitoreo cerrado | `"No se puede modificar un monitoreo en estado FINALIZADO"` |
| `400` | Pareja repetida | `"{'__all__': ['Ya existe una muestra para ese punto y foto en el monitoreo.']}"` |
| `400` | Sólo uno de los índices | `"{'punto_indice': ['punto_indice y foto_indice deben enviarse juntos.']}"` |
| `400` | `punto_indice` fuera del recorrido | `"{'punto_indice': ['El recorrido del trazado tiene 3 puntos (índices 0 a 2).']}"` |
| `400` | `foto_indice` ≥ 5 | `"{'foto_indice': ['Se permiten máximo 5 fotos por punto (índices 0 a 4).']}"` |
| `400` | `detecciones` no es JSON | `"detecciones no es JSON válido: Expecting value: line 1 column 2 (char 1)"` |
| `400` | `detecciones` sin `labels` | `"detecciones[0]: 'labels' debe ser una lista con al menos una etiqueta."` |
| `400` | Caja fuera de la imagen | `"{'__all__': ['La caja se sale de la imagen (800x600 px).']}"` |
| `400` | `uuid` ya existente | `"{'uuid': ['Ya existe Detección con este UUID externo.']}"` |
| `400` | Latitud fuera de rango | `"{'latitud': ['Asegúrese de que este valor es menor o igual a 90.']}"` |
| `400` | Archivo no es imagen | `"{'foto': ['No se pudo abrir la imagen: cannot identify image file <ImageFieldFile: x.jpg>']}"` |
- Requiere token.

HTTP (multipart; el `boundary` lo genera el cliente):
```
POST /api/monitoreos/1/muestras/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----rb

------rb
Content-Disposition: form-data; name="foto"; filename="muestra.jpg"
Content-Type: image/jpeg

<bytes del JPEG>
------rb
Content-Disposition: form-data; name="punto_indice"

0
------rb
Content-Disposition: form-data; name="foto_indice"

2
------rb
Content-Disposition: form-data; name="latitud"

4.7110
------rb
Content-Disposition: form-data; name="longitud"

-74.0721
------rb
Content-Disposition: form-data; name="detecciones"

[{"frame":{"origin":{"x":120,"y":80},"size":{"x":45,"y":60}},"labels":[{"text":"blast","confidence":0.92}]}]
------rb--
```
fetch (React Native: `type` y `name` son obligatorios en el objeto del archivo):
```js
const form = new FormData();
form.append("foto", { uri: photoUri, name: "muestra.jpg", type: "image/jpeg" });
form.append("punto_indice", String(puntoIndice));
form.append("foto_indice", String(fotoIndice));
form.append("latitud", "4.7110");
form.append("longitud", "-74.0721");
form.append("detecciones", JSON.stringify(detection));   // resultado de detectObjects, sin transformar
const res = await call("POST", `/api/monitoreos/${monitoreoId}/muestras/`, { token, form });
```
Respuesta `201` (ver el payload-muestra de arriba, con `detecciones` rellena):
```json
{
  "id": 1, "monitoreo_id": 1, "codigo": "MUE-428B458B",
  "foto_url": "/media/muestras/2026/10/22/cde56176a9804304898ecde9573a86e7.jpg",
  "imagen_url": "/media/muestras/2026/10/22/cde56176a9804304898ecde9573a86e7.jpg",
  "ancho_px": 800, "alto_px": 600, "punto_indice": 0, "foto_indice": 2, "estado": "PENDIENTE",
  "latitud": "4.7110", "longitud": "-74.0721",
  "created_at": "2026-10-22T04:43:31.578443+00:00", "updated_at": "2026-10-22T04:43:31.579446+00:00",
  "detecciones": [
    {
      "id": 1, "muestra_id": 1, "uuid": "9f3a0c2e-1b7d-4c55-9a10-3d2f6b8e7a41",
      "etiqueta": "{\"enfermedad\": \"blast\", \"severidad\": \"ALTA\", \"posicion\": \"hoja\"}",
      "clase": "blast", "severidad": "ALTA", "posicion": "hoja",
      "atributos": { "enfermedad": "blast", "severidad": "ALTA", "posicion": "hoja" },
      "etiquetas_alternas": [{ "text": "leaf_scald", "confidence": 0.41 }],
      "confidence": 0.92, "origin_x": 120.0, "origin_y": 80.0, "size_x": 45.0, "size_y": 60.0,
      "frame": { "origin": { "x": 120.0, "y": 80.0 }, "size": { "x": 45.0, "y": 60.0 } },
      "notas": "marca en la hoja",
      "enfermedad_id": 2, "catalogada": true, "enfermedad_codigo": "PYRICULARIA_ORYZAE",
      "enfermedad_nombre_comun": "Tizón del arroz", "enfermedad_nombre_cientifico": "Pyricularia oryzae",
      "enfermedad_nombre_cientifico_alterno": "Magnaporthe oryzae",
      "created_at": "2026-10-22T04:43:31.583446+00:00", "updated_at": "2026-10-22T04:43:31.583446+00:00"
    }
  ]
}
```

### `GET /api/monitoreos/muestras/<id>/`
- **Devuelve:** payload-muestra con detecciones — `200`; `404`.
- Requiere token.

### `PUT/PATCH /api/monitoreos/muestras/<id>/`
- **Envío:** JSON (no multipart) con campos a cambiar: `estado`, `latitud`, `longitud`, `punto_indice`, `foto_indice`.
  La foto **no** se puede reemplazar por esta vía.
- **Devuelve:** payload-muestra con detecciones — `200`; `404`; `400` si el monitoreo padre está finalizado/cancelado
  (`"No se puede modificar un monitoreo en estado FINALIZADO"`), el `estado` no es válido (`"Estado de muestra no válido: X"`) o
  los índices no cumplen las reglas de arriba.
- Requiere token.

```
PATCH /api/monitoreos/muestras/1/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"estado": "PROCESADA"}
```
```js
await call("PATCH", `/api/monitoreos/muestras/${muestraId}/`, { token, body: { estado: "PROCESADA" } });
```

### `DELETE /api/monitoreos/muestras/<id>/`
- **Devuelve:** vacío — `204`; `404`. Con el monitoreo `FINALIZADO`/`CANCELADO` responde `409 {"error": "No se puede modificar un monitoreo en estado FINALIZADO"}`.
- Requiere token.

---

## 8. Detecciones — `/api/monitoreos/muestras/<id>/detecciones/` y `/api/monitoreos/detecciones/<id>/`

Estructura (`deteccion_payload`):

```json
{
  "id": 1,
  "muestra_id": 1,
  "uuid": "9f3a0c2e-1b7d-4c55-9a10-3d2f6b8e7a41",
  "etiqueta": "{\"enfermedad\": \"blast\", \"severidad\": \"ALTA\", \"posicion\": \"hoja\"}",
  "clase": "blast",
  "severidad": "ALTA",
  "posicion": "hoja",
  "atributos": { "enfermedad": "blast", "severidad": "ALTA", "posicion": "hoja" },
  "etiquetas_alternas": [{ "text": "leaf_scald", "confidence": 0.41 }],
  "confidence": 0.92,
  "origin_x": 120.0,
  "origin_y": 80.0,
  "size_x": 45.0,
  "size_y": 60.0,
  "frame": { "origin": { "x": 120.0, "y": 80.0 }, "size": { "x": 45.0, "y": 60.0 } },
  "notas": "marca en la hoja",
  "enfermedad_id": 2,
  "catalogada": true,
  "enfermedad_codigo": "PYRICULARIA_ORYZAE",
  "enfermedad_nombre_comun": "Tizón del arroz",
  "enfermedad_nombre_cientifico": "Pyricularia oryzae",
  "enfermedad_nombre_cientifico_alterno": "Magnaporthe oryzae",
  "created_at": "2026-10-22T04:43:31.583446+00:00",
  "updated_at": "2026-10-22T04:43:31.583446+00:00"
}
```

- Coordenadas en **píxeles** de la foto sin rotar (`ancho_px` × `alto_px` de la muestra).
  `frame` repite los mismos valores con el formato de ricemobile, para dibujar sin conversión.
- `etiqueta` es el `text` crudo de la etiqueta principal; `clase`, `severidad` y
  `posicion` se extraen de él (ver §7). Si el `text` es texto plano, `severidad` y `posicion` quedan `""` y `atributos` `{}`.
- `enfermedad_*` son `null` cuando la clase no está en el catálogo.
- `catalogada` es `true` si la clase se resolvió a una enfermedad del catálogo
  (`enfermedad_id` no es `null`) y `false` en caso contrario.
- `confidence` debe estar entre `0` y `1`. `uuid` no se puede cambiar tras la creación.

### `GET /api/monitoreos/muestras/<id>/detecciones/`
- **Envío:** filtros opcionales: `?enfermedad_id=&clase=&severidad=&sin_enfermedad=true&confianza_min=&confianza_max=`
  (`clase` y `severidad` sin distinguir mayúsculas; `sin_enfermedad=true` (o `1`) lista las no catalogadas).
- **Devuelve:** `{"detecciones": [payload-deteccion, ...]}` — `200`. Una muestra inexistente o ajena devuelve lista vacía.
- Requiere token.

```
GET /api/monitoreos/muestras/1/detecciones/?sin_enfermedad=true HTTP/1.1
Authorization: Bearer <token>
```
```js
const { data } = await call("GET", `/api/monitoreos/muestras/${muestraId}/detecciones/?sin_enfermedad=true`, { token });
```

### `POST /api/monitoreos/muestras/<id>/detecciones/`
Agrega una caja suelta a una muestra existente, con el mismo formato de ricemobile.
- **Envío:** JSON
```json
{
  "frame": { "origin": { "x": 10, "y": 10 }, "size": { "x": 20, "y": 20 } },
  "labels": [{ "text": "brown_spot", "confidence": 0.55 }],
  "uuid": "d24b497c-5fdf-4483-a0b7-32bb93b93390",
  "notas": "marca en la hoja"
}
```
  `uuid` y `notas` son opcionales.
- **Devuelve:** payload-deteccion — `201`.
- **Errores:** `404` (muestra inexistente o ajena); `400` con `"Se esperaba un objeto JSON {frame, labels}."`,
  `"'frame' es obligatorio y debe ser {origin, size}."`, `"'labels' debe ser una lista con al menos una etiqueta."`,
  `"'uuid' no es un UUID válido."`, `"{'uuid': ['Ya existe Detección con este UUID externo.']}"`,
  `"{'__all__': ['La caja se sale de la imagen (800x600 px).']}"` o
  `"No se puede modificar un monitoreo en estado FINALIZADO"`.
- Requiere token.

```
POST /api/monitoreos/muestras/1/detecciones/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"frame": {"origin": {"x": 10, "y": 10}, "size": {"x": 20, "y": 20}}, "labels": [{"text": "brown_spot", "confidence": 0.55}]}
```
```js
const res = await call("POST", `/api/monitoreos/muestras/${muestraId}/detecciones/`, {
  token,
  body: { frame: box.frame, labels: box.labels, uuid: box.uuid },
});
```
Respuesta `201` (clase fuera del catálogo):
```json
{
  "id": 2, "muestra_id": 1, "uuid": "d24b497c-5fdf-4483-a0b7-32bb93b93390",
  "etiqueta": "brown_spot", "clase": "brown_spot", "severidad": "", "posicion": "",
  "atributos": {}, "etiquetas_alternas": [], "confidence": 0.55,
  "origin_x": 10.0, "origin_y": 10.0, "size_x": 20.0, "size_y": 20.0,
  "frame": { "origin": { "x": 10.0, "y": 10.0 }, "size": { "x": 20.0, "y": 20.0 } },
  "notas": "", "enfermedad_id": null, "catalogada": false,
  "enfermedad_codigo": null, "enfermedad_nombre_comun": null,
  "enfermedad_nombre_cientifico": null, "enfermedad_nombre_cientifico_alterno": null,
  "created_at": "2026-10-22T04:43:31.900000+00:00", "updated_at": "2026-10-22T04:43:31.900000+00:00"
}
```

### `GET /api/monitoreos/detecciones/<id>/`
- **Devuelve:** payload-deteccion — `200`; `404`.
- Requiere token.

### `PUT/PATCH /api/monitoreos/detecciones/<id>/`
Corrección manual (p. ej. un agrónomo reasigna la enfermedad).
- **Envío:** JSON con campos a cambiar: `enfermedad_id` (o `null`), `severidad`, `posicion`,
  `notas`, `confidence`, `origin_x/y`, `size_x/y`. `uuid`, `etiqueta` y `clase` **no** cambian (se ignoran).
- **Devuelve:** payload-deteccion — `200`; `404`; `400` en validación:
  `"La enfermedad con id 999 no existe."`, `"{'confidence': ['Asegúrese de que este valor es menor o igual a 1.0.', 'La confianza debe estar entre 0 y 1.']}"`
  o el monitoreo cerrado.
- Requiere token.

```
PATCH /api/monitoreos/detecciones/1/ HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"severidad": "MEDIA", "notas": "revisada"}
```
```js
await call("PATCH", `/api/monitoreos/detecciones/${deteccionId}/`, { token, body: { severidad: "MEDIA", notas: "revisada" } });
```

### `DELETE /api/monitoreos/detecciones/<id>/`
- **Devuelve:** vacío — `204`; `404`. Con el monitoreo `FINALIZADO`/`CANCELADO` responde `409 {"error": "No se puede modificar un monitoreo en estado FINALIZADO"}`.
- Requiere token.

---

## 9. Dashboard — KPIs

Los endpoints `/api/dashboard/…` aceptan el token del dispositivo y, para un dispositivo, **sólo calculan con sus propios datos**
(el panel web ve el conjunto completo).

### `GET /`  *(HTML, sólo web)*
Página HTML del dashboard con los KPIs y el visor de bounding boxes. Exige sesión web (sin sesión redirige a `/login/`);
la app móvil no la usa.

### Filtros comunes
`?finca_id=&desde=&hasta=&estado=&enfermedad_id=&severidad=&confianza_min=&confianza_max=`

`enfermedad_id`, `severidad` y los de confianza se aplican a las detecciones; `desde`/`hasta`
usan la fecha del monitoreo.

`estado` limita los monitoreos considerados (KPIs globales, por finca, por enfermedad y el
listado de `/api/dashboard/finca/<id>/`):

| Valor | Efecto |
|-------|--------|
| *(ausente o vacío)* | Sólo `FINALIZADO` (la app finaliza un monitoreo cuando ya sincronizó todo). |
| `TODOS` | Sin filtro de estado. |
| `FINALIZADO`, `EN_PROGRESO`, `BORRADOR`, `CANCELADO` | Ese estado. |
| Lista separada por comas, p. ej. `FINALIZADO,EN_PROGRESO` | Cualquiera de ellos. |

Un valor desconocido responde `400` con `{"error": "Estado no válido: ..."}`. Las mayúsculas
no importan. Excepciones: `/api/dashboard/monitoreo/<id>/` no filtra por estado (es un monitoreo
explícito) y `/api/dashboard/enfermedades/?monitoreo_id=` tampoco, salvo que se envíe `estado`.

Ejemplos de petición:

```
GET /api/dashboard/data/?estado=TODOS&finca_id=1 HTTP/1.1
Authorization: Bearer <token>
```
```js
const kpis  = await call("GET", "/api/dashboard/data/?estado=TODOS", { token });
const enfs  = await call("GET", "/api/dashboard/enfermedades/?estado=FINALIZADO,EN_PROGRESO", { token });
const finca = await call("GET", `/api/dashboard/finca/${fincaId}/?estado=TODOS`, { token });
const mon   = await call("GET", `/api/dashboard/monitoreo/${monitoreoId}/`, { token });
```

Errores comunes: `400 {"error": "Estado no válido: ZZ. Valores permitidos: BORRADOR, EN_PROGRESO, FINALIZADO, CANCELADO, TODOS."}`
(con `?estado=zz`), `404` (HTML) si la finca o el monitoreo no existe o es de otro dispositivo, `401` sin token.

### `GET /api/dashboard/data/`
KPIs globales, por finca y por enfermedad.
- **Envío:** filtros comunes.
- **Devuelve:**
```json
{
  "global": {
    "total_fincas": 2,
    "total_monitoreos": 7,
    "monitoreos_sin_finalizar": 2,
    "total_muestras": 30,
    "total_detecciones": 14,
    "muestras_con_deteccion": 9,
    "incidencia": 0.3,
    "incidencia_total": 0.4,
    "extension_total_ha": "50.0000",
    "detecciones_por_hectarea": 0.28,
    "confianza_promedio": 0.88
  },
  "por_finca": [
    {
      "finca_id": 3,
      "finca_nombre": "Finca La Aurora",
      "finca_vereda": "El Roble",
      "finca_municipio": "Ibagué",
      "finca_departamento": "Tolima",
      "extension_ha": "25.5000",
      "monitoreos": 4,
      "detecciones": 9,
      "detecciones_por_hectarea": 0.35,
      "confianza_promedio": 0.9,
      "muestras": 40,
      "muestras_con_deteccion": 6,
      "incidencia": 0.15
    }
  ],
  "por_enfermedad": [ /* igual que /api/dashboard/enfermedades/ */ ]
}
```
  - En `por_finca`, `muestras`, `muestras_con_deteccion` e `incidencia` usan la misma definición que
    los KPIs globales, restringida a cada finca (campos añadidos; los anteriores no cambian).
  - `incidencia` = muestras con al menos una detección **que cumpla los filtros de detección**
    (`enfermedad_id`, `severidad`, `confianza_*`) / total de muestras. Con esos filtros el
    numerador se reduce pero el denominador (todas las muestras del alcance) no cambia.
  - `incidencia_total` = muestras con **cualquier** detección / total de muestras. Ignora los
    filtros de detección; sin ellos es igual a `incidencia`.
  - `monitoreos_sin_finalizar` = monitoreos `EN_PROGRESO` o `BORRADOR`. Respeta `finca_id`,
    `desde` y `hasta`, pero **no** `estado`: sirve para avisar de datos que aún no entran en los KPIs.
- Requiere token. Los importes decimales (`extension_total_ha`, `extension_ha`) son strings.

### `GET /api/dashboard/enfermedades/`
Distribución de detecciones por enfermedad, de mayor a menor.
- **Envío:** filtros comunes y opcional `monitoreo_id`.
- **Devuelve:**
```json
{
  "enfermedades": [
    {
      "enfermedad_id": 2,
      "enfermedad_codigo": "PYRICULARIA_ORYZAE",
      "nombre": "Tizón del arroz",
      "clase": null,
      "catalogada": true,
      "conteo": 12,
      "confianza_promedio": 0.81,
      "muestras_afectadas": 7,
      "puntos_afectados": 4,
      "por_severidad": { "ALTA": 3, "MEDIA": 5, "SIN_DATO": 4 }
    },
    {
      "enfermedad_id": null,
      "enfermedad_codigo": null,
      "nombre": "brown_spot",
      "clase": "brown_spot",
      "catalogada": false,
      "conteo": 2,
      "confianza_promedio": 0.55,
      "muestras_afectadas": 2,
      "puntos_afectados": 1,
      "por_severidad": { "SIN_DATO": 2 }
    }
  ]
}
```
  Cuenta la etiqueta principal de cada caja. Las clases fuera del catálogo se agrupan
  por `clase` con `catalogada: false`.
- Requiere token.

### `GET /api/dashboard/finca/<id>/`
Detalle de una finca y monitoreos ligeros.
- **Devuelve:**
```json
{
  "finca": { "id": 3, "nombre": "Finca La Aurora", "vereda": "El Roble", "municipio": "Ibagué", "departamento": "Tolima", "extension": "25.5000" },
  "monitoreos": [
    {
      "id": 7,
      "codigo": "MON-9F3A2B1C",
      "fecha": "2026-09-10",
      "estado": "EN_PROGRESO",
      "n_muestras": 3,
      "n_detecciones": 5,
      "confianza_promedio": 0.9
    }
  ]
}
```
- Requiere token.

### `GET /api/dashboard/monitoreo/<id>/`
Monitoreo completo con muestras y detecciones (misma estructura que `GET /api/monitoreos/<id>/`)
más un `resumen` con los KPIs de la pantalla de detalle de ricemobile.
- **Envío:** opcional `?enfermedad_id=` para que la incidencia y la salud por punto sólo
  consideren esa enfermedad.
- **Devuelve** (además de los campos del monitoreo, incluido `trazado` incrustado o `null`):
```json
{
  "resumen": {
    "monitoreo_id": 7,
    "enfermedad_id": null,
    "total_muestras": 12,
    "puntos_con_muestras": 4,
    "muestras_sin_punto": 0,
    "total_detecciones": 9,
    "muestras_con_deteccion": 6,
    "incidencia": 0.5,
    "incidencia_total": 0.5,
    "enfermedades": [ /* igual que /api/dashboard/enfermedades/?monitoreo_id=7 */ ],
    "incidencia_por_punto": [
      {
        "punto_indice": 0,
        "total_fotos": 3,
        "fotos_con_deteccion": 2,
        "incidencia": 0.6667,
        "enfermedades": { "Tizón del arroz": 3 },
        "salud": 2
      }
    ]
  }
}
```
  Con `?enfermedad_id=`, `incidencia` sólo cuenta esa enfermedad e `incidencia_total` sigue
  contando muestras con cualquier detección. `salud`: `0` sin fotos, `1` sano, `2` con detección (los mismos colores gris/verde/rojo
  del recorrido en ricemobile). Se listan los puntos `0..n-1`, con `n` el mayor entre el último punto con fotos + 1 y el largo del `recorrido` del trazado (si lo tiene): los puntos sin fotos (intermedios o finales) aparecen con `salud: 0`.
- Requiere token.

---
## 10. Recetas (flujos paso a paso)

Todas usan el ayudante `call` de la sección 2. Los códigos de estado entre paréntesis son los que debe esperar la app.

### Receta 1 — Alta del dispositivo y almacenamiento del token

1. En el primer arranque no hay token guardado. Llame a `POST /api/auth/devices/register/` con el código de alta (constante de compilación).
2. Guarde `data.token` en almacenamiento seguro **antes** de hacer cualquier otra cosa: no se puede recuperar.
3. Guarde también `data.device_id` si quiere mostrarlo en diagnósticos (no hace falta para operar).

```js
async function ensureToken() {
  let token = await SecureStore.getItemAsync("device_token");
  if (token) return token;
  const res = await call("POST", "/api/auth/devices/register/", {
    body: { join_code: JOIN_CODE, platform: Platform.OS, app_version: APP_VERSION },
  });
  if (res.status === 201) {
    await SecureStore.setItemAsync("device_token", res.data.token);
    return res.data.token;
  }
  if (res.status === 403) throw new Error("Código de alta inválido: revise la configuración de la app");
  if (res.status === 429) throw new Error("Demasiados intentos de alta; espere 5 minutos");
  if (res.status === 503) throw new Error("El servidor no tiene habilitado el alta de dispositivos");
  throw new Error(`Alta fallida (${res.status})`);
}
```

### Receta 2 — Comprobación de arranque con `/me`

1. Con el token guardado, llame a `GET /api/auth/me/`.
2. `200`: siga adelante (el payload identifica al dispositivo).
3. `401`: el dispositivo fue revocado o el token se perdió → receta 10.
4. Error de red o timeout: **no** borre el token; reintente. Si el servicio gratuito estaba dormido, la primera
   petición puede tardar 30-50 s: use un timeout generoso y un indicador de carga.

```js
async function arranque() {
  const token = await ensureToken();
  const me = await call("GET", "/api/auth/me/", { token });
  if (me.status === 401) return reRegistrar();   // receta 10
  return { token, usuario: me.data };
}
```

### Receta 3 — Crear la finca

1. Valide en la app antes de enviar: `nombre`, `extension` (número ≥ 0), `municipio` y `departamento` obligatorios y no vacíos.
2. `POST /api/fincas/`. Guarde `data.id` (`finca_id` para todo lo demás).
3. `400`: muestre `data.error`. No reintente sin corregir los datos.

```js
const res = await call("POST", "/api/fincas/", {
  token,
  body: { nombre, extension: Number(extension), municipio, departamento, vereda },
});
if (res.status === 201) guardarFincaLocal(res.data);        // res.data.id
else if (res.status === 400) mostrarError(res.data.error);
```

### Receta 4 — Crear o reutilizar un trazado e iniciar un monitoreo con él

1. **Una sola vez por dibujo del terreno:** `POST /api/fincas/<finca_id>/trazados/` con `polygon` y `samplingPath` tal como
   los guarda ricemobile (mínimo 3 vértices; el recorrido puede ir vacío). Guarde `data.id` junto al terreno local.
2. **En cada monitoreo nuevo** sobre ese terreno, reutilice el mismo `trazado_id`; no cree otro trazado.
3. Cree el monitoreo con `trazado_id` (`POST /api/monitoreos/`) y, cuando el usuario empiece a muestrear, páselo a
   `EN_PROGRESO` (`PATCH`).
4. Si el usuario **redibuja** el terreno: cree un trazado nuevo. El anterior es inmutable mientras algún monitoreo lo use (`409`).
   Un monitoreo todavía editable puede cambiar de trazado con `PATCH {"trazado_id": <nuevo>}` (siempre que sus muestras quepan
   en el nuevo recorrido).
5. Para recuperar los trazados de una finca (p. ej. tras reinstalar la app, si el dispositivo se mantiene): `GET /api/fincas/<finca_id>/trazados/`.

```js
// 1) una vez por dibujo
const t = await call("POST", `/api/fincas/${fincaId}/trazados/`, {
  token,
  body: { nombre: "Lote norte", polygon: terreno.polygon, samplingPath: terreno.samplingPath },
});
const trazadoId = t.data.id;                                   // 201

// 2) y 3) por cada monitoreo
const m = await call("POST", "/api/monitoreos/", {
  token,
  body: { finca_id: fincaId, trazado_id: trazadoId, estado: "BORRADOR", fecha: "2026-09-10" },
});
const monitoreoId = m.data.id;                                 // 201
await call("PATCH", `/api/monitoreos/${monitoreoId}/`, { token, body: { estado: "EN_PROGRESO" } });
```

Errores frecuentes: `400 "El trazado indicado no existe o no pertenece a la finca del monitoreo."` (id equivocado o de otra finca);
`409` al editar o borrar un trazado en uso; `404` si la finca no es de este dispositivo.

### Receta 5 — Subir muestras (puntos, índice de foto y geolocalización opcional) con reintentos

Para cada foto tomada:

1. `punto_indice` = posición del punto en `samplingPath` (desde 0). `foto_indice` = número de la foto dentro de ese punto
   (0 a 4). **Envíe siempre los dos juntos**; la pareja no se puede repetir en el monitoreo.
2. `latitud`/`longitud` son opcionales (grados decimales como texto).
3. `detecciones` es el resultado de `detectObjects` en `JSON.stringify` (puede omitirse si la foto no tiene cajas).
4. Envíe `multipart/form-data` con `foto` como archivo. **No** fije `Content-Type` a mano.
5. Suba las fotos en orden y de una en una (una petición por foto). Guarde en una cola local las que no se hayan confirmado con `201`.

Reintentos, según la respuesta:

| Resultado | Qué hacer |
|-----------|-----------|
| `201` | Éxito: marque la foto como subida y guarde `data.id`. |
| Error de red / timeout / `5xx` | Reintente con espera creciente (2 s, 4 s, 8 s…, p. ej. 4 intentos). La creación es atómica: o se guardó entera o no se guardó nada. |
| `400` con `"Ya existe una muestra para ese punto y foto en el monitoreo."` | Probablemente un reintento tras una respuesta perdida: la foto **ya está** en el servidor. Confírmelo con `GET /api/monitoreos/<id>/muestras/` (busque la pareja `punto_indice`/`foto_indice`) y trátela como subida. |
| `400` con `"{'uuid': ['Ya existe Detección con este UUID externo.']}"` | La detección con ese `uuid` ya existe (otra subida previa). Revise como en la fila anterior; no cambie el `uuid` para "forzar" la subida o duplicará las cajas. |
| `400` por validación (índices, recorrido, caja fuera de imagen, imagen inválida, monitoreo cerrado) | No reintente: corrija el dato o descarte la foto. Muestre `data.error`. |
| `401` | Receta 10. |
| `404` | El monitoreo no existe para este dispositivo (p. ej. se borró o se reinstaló): recree el monitoreo. |

```js
async function subirMuestra(token, monitoreoId, foto) {
  const form = new FormData();
  form.append("foto", { uri: foto.uri, name: "muestra.jpg", type: "image/jpeg" });
  form.append("punto_indice", String(foto.puntoIndice));
  form.append("foto_indice", String(foto.fotoIndice));
  if (foto.lat != null) { form.append("latitud", String(foto.lat)); form.append("longitud", String(foto.lng)); }
  if (foto.detecciones?.length) form.append("detecciones", JSON.stringify(foto.detecciones));

  for (let intento = 0; intento < 4; intento++) {
    let res;
    try {
      res = await call("POST", `/api/monitoreos/${monitoreoId}/muestras/`, { token, form });
    } catch {                                   // sin red
      await esperar(2000 * 2 ** intento);
      continue;
    }
    if (res.status === 201) return res.data;
    if (res.status === 400 && /Ya existe una muestra para ese punto y foto/.test(res.data?.error ?? "")) {
      const lista = await call("GET", `/api/monitoreos/${monitoreoId}/muestras/`, { token });
      return lista.data.muestras.find(
        (m) => m.punto_indice === foto.puntoIndice && m.foto_indice === foto.fotoIndice
      );
    }
    if (res.status >= 500) { await esperar(2000 * 2 ** intento); continue; }
    throw Object.assign(new Error(res.data?.error ?? `HTTP ${res.status}`), { status: res.status });
  }
  throw new Error("Sin conexión: la foto queda en cola");
}
```

> Si reutiliza el mismo `FormData` en cada reintento, en algunas versiones de React Native el archivo se consume;
> si ve subidas vacías, reconstruya el `FormData` en cada intento.

### Receta 6 — Registrar detecciones

**Lo normal:** envíe las detecciones junto con la foto (campo `detecciones` de la receta 5). Es atómico: si una caja es
inválida no se guarda ni la muestra.

**Cajas sueltas** (después de subir la muestra): `POST /api/monitoreos/muestras/<id>/detecciones/` con una caja
`{frame, labels[, uuid, notas]}` (un objeto por petición).

Reglas a respetar:

- Coordenadas en **píxeles de la foto sin rotar** (`ancho_px` × `alto_px` de la muestra). Una caja que no cabe → `400`.
- Genere un `uuid` por caja en el dispositivo y envíelo siempre: sirve para detectar duplicados al reintentar.
- No hace falta enviar la enfermedad: se resuelve por `codigo`/`alias` (§5). Si `catalogada` es `false`, la detección
  se guardó igualmente y `clase` dice qué emitió el modelo.
- Correcciones manuales: `PATCH /api/monitoreos/detecciones/<id>/` con `enfermedad_id` (o `null`), `severidad`, `posicion`,
  `notas`, `confidence` o la caja (`origin_x/y`, `size_x/y`).
- Para listar sólo las no catalogadas de una muestra: `GET …/detecciones/?sin_enfermedad=true`.

```js
const res = await call("POST", `/api/monitoreos/muestras/${muestraId}/detecciones/`, {
  token,
  body: { frame: caja.frame, labels: caja.labels, uuid: caja.uuid },
});
// 201 -> res.data.catalogada indica si se reconoció la enfermedad
```

### Receta 7 — Transiciones de estado: iniciar, finalizar, cancelar

| Quiero… | Desde | Petición |
|---------|-------|----------|
| Iniciar el muestreo | `BORRADOR` | `PATCH /api/monitoreos/<id>/` `{"estado": "EN_PROGRESO"}` |
| Finalizar | `EN_PROGRESO` | `PATCH` `{"estado": "FINALIZADO"}` (**sin otros campos**) |
| Cancelar | `BORRADOR` o `EN_PROGRESO` | `PATCH` `{"estado": "CANCELADO"}` (**sin otros campos**) |

1. Antes de **finalizar**, asegúrese de que todas las muestras y detecciones se subieron (receta 5): después del cambio el
   monitoreo es inmutable (muestras, detecciones y campos).
2. Si necesita cambiar `observaciones`/`fecha`/`trazado_id` y finalizar, hágalo en **dos** peticiones: primero los campos, después el estado.
3. Los KPIs del dashboard cuentan por defecto sólo monitoreos `FINALIZADO` (§9).
4. Errores: `400 "Transición no permitida de BORRADOR a FINALIZADO"` (hay que pasar por `EN_PROGRESO`),
   `400 "No se puede modificar un monitoreo y transicionarlo a un estado final simultáneamente"`,
   `400 "No se puede modificar un monitoreo en estado FINALIZADO"`.

```js
await call("PATCH", `/api/monitoreos/${id}/`, { token, body: { observaciones: "Sin novedades" } });  // 1.º los campos
const fin = await call("PATCH", `/api/monitoreos/${id}/`, { token, body: { estado: "FINALIZADO" } }); // 2.º el estado
```

### Receta 8 — Manejo de errores (401, 403, 404, 409, 413, 429 y validación)

| Código | Qué significa | Acción en la app |
|--------|---------------|------------------|
| `400` | Validación o regla de negocio | Mostrar `data.error`; corregir; no reintentar tal cual. |
| `401` | Token ausente/revocado | Receta 10. |
| `403` | Código de alta inválido, o escritura del catálogo de enfermedades, o exportaciones | Error de configuración o funcionalidad no disponible para la app; no reintentar. |
| `404` | El recurso no existe **o es de otro dispositivo** (HTML) | Sacarlo de la caché local; no reintentar. `data` es `null`: no intente leer JSON. |
| `409` | Trazado en uso (editar la geometría o borrarlo) | Crear un trazado nuevo (receta 4) o dejarlo como está. |
| `413` | No lo emiten los endpoints de la app (sólo exportaciones web) | Si aparece (p. ej. proxy), reducir el tamaño de la foto. |
| `429` | Demasiados altas desde la IP | Esperar 5 minutos; no reintentar en bucle. |
| `5xx` / timeout | Error del servidor, red o servicio dormido | Reintentar con espera creciente. En `POST` de monitoreo, consulte antes el listado (ver abajo). |

**Reintentos seguros:** `GET`, `PATCH`, `PUT` y `DELETE` se pueden repetir (`DELETE` repetido devuelve `404`: trátelo como éxito).
Los `POST` de finca, trazado y monitoreo **no** son idempotentes: tras perder la respuesta consulte el listado
(`GET /api/fincas/`, `GET /api/fincas/<id>/trazados/`, `GET /api/monitoreos/?finca_id=<id>`) para ver si se creó. Las
muestras y detecciones se protegen solas con la pareja `punto_indice`/`foto_indice` y con el `uuid` (receta 5).

```js
async function llamarConManejo(method, path, opts) {
  const res = await call(method, path, opts);
  if (res.status === 401) throw new SesionRevocada();            // receta 10
  if (res.status === 404) throw new NoEncontrado(path);           // res.data === null
  if (res.status === 409) throw new EnUso(res.data.error);
  if (res.status === 429) throw new DemasiadosIntentos();
  return res;
}
```

### Receta 9 — Paginación y lectura de datos

No hay paginación: todos los `GET` de colecciones devuelven el conjunto completo del dispositivo.
Para mantener las respuestas pequeñas:

- Liste monitoreos con `GET /api/monitoreos/?finca_id=&estado=&desde=&hasta=` (sin muestras ni trazado) y pida el detalle
  (`GET /api/monitoreos/<id>/`, que trae `trazado`, `muestras` y `detecciones`) sólo del que va a abrir.
- Para las muestras de un monitoreo sin sus datos de cabecera: `GET /api/monitoreos/<id>/muestras/?estado=PENDIENTE`.
- Las fotos se descargan de `foto_url` (anteponga la URL base si empieza por `/media/`).

### Receta 10 — Revocación del dispositivo

El administrador puede revocar un dispositivo desde el admin. A partir de ese momento **todas** las peticiones con su token
(incluida `/me`) responden `401 {"error": "No autenticado"}`.

1. Detecte el `401` en cualquier llamada (o al arrancar con `/me`).
2. Borre el token guardado y vuelva a hacer el alta (receta 1). El servidor crea un **usuario nuevo**.
3. Los datos del registro anterior (fincas, trazados, monitoreos…) **dejan de ser accesibles** para el nuevo dispositivo
   (`404`): sus ids ya no sirven. Si la app guarda copias locales, márquelas como "no sincronizadas" y vuelva a crearlas
   (finca → trazado → monitoreo → muestras) o avise al usuario.
4. Un `401` también aparece si la petición no lleva la cabecera `Authorization`: verifique que la envía antes de concluir que
   el dispositivo fue revocado.

```js
async function reRegistrar() {
  await SecureStore.deleteItemAsync("device_token");
  limpiarCacheLocalDeIds();               // los ids anteriores ya no existen para este dispositivo
  return ensureToken();                   // receta 1
}
```

---

## 11. Reglas clave a recordar

- **`Authorization: Bearer <token>`** en toda petición, también en las de lectura.
- **No hay CSRF ni cookies** para la app; `credentials: "include"` no hace falta.
- **Monitoreo**: estados terminales (`FINALIZADO`, `CANCELADO`) son inmutables; finalizar y cancelar se piden sin otros campos.
- **Trazado**: se crea una vez por dibujo; mientras un monitoreo lo use, su geometría no cambia (`409`).
- **Muestra**: se crea solo por **multipart** con `foto`; el resto de operaciones usan JSON. `punto_indice` y `foto_indice` van juntos.
- **Detección**: se envía con el formato del detector de ricemobile (`{frame, labels}`),
  coordenadas en píxeles de la foto sin rotar. La enfermedad se resuelve por `codigo`/`alias`;
  severidad y posición viajan dentro de `labels[].text` como JSON. `catalogada` indica si se reconoció.
- **Finca**: `municipio` y `departamento` son obligatorios; `extension` es string; `owner_id` solo lo asigna un superusuario.
- **Enfermedades**: el CRUD (salvo GET) es exclusivo de superusuario; no se puede borrar una enfermedad con detecciones.
- **Exportaciones**: sólo panel web; la app recibe `403`.
- **Un `404` no es JSON**: no llame a `res.json()` sin comprobar el estado.

---

## 12. Integración con React Native (backend ya desplegado)

El backend está desplegado en Render y usa Postgres en Neon. Estos son los dos valores
que el frontend necesita para conectarse:

- **URL base de la API**: `https://riceback-backend.onrender.com`
- **Código de alta (`DEVICE_JOIN_CODE`)**: `<pedir al administrador del backend>` (no se publica en este documento)
  Es el valor que la app manda en `join_code` al registrarse (paso 1). Vive como
  variable de entorno en Render (`DEVICE_JOIN_CODE`) y se puede rotar ahí sin tocar
  código del backend; si se rota, hay que actualizar también el build de la app,
  porque los dispositivos ya registrados **no** se ven afectados, solo las altas nuevas.

> ⚠️ El plan gratuito de Render duerme el servicio tras ~15 min sin tráfico. La primera
> petición después de eso puede tardar 30-50s en responder — vale la pena un timeout
> generoso y un loader en el arranque de la app, no solo en el registro.

### Paso 1 — Configuración base

```js
// src/api/config.js
export const API_BASE_URL = "https://riceback-backend.onrender.com";
export const DEVICE_JOIN_CODE = "<pedir al administrador>"; // constante de compilación
```

### Paso 2 — Cliente con registro y token persistente

```js
// src/api/client.js
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, DEVICE_JOIN_CODE } from "./config";

const TOKEN_KEY = "device_token";

async function registerDevice() {
  const res = await fetch(`${API_BASE_URL}/api/auth/devices/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      join_code: DEVICE_JOIN_CODE,
      platform: "android",
      app_version: "1.0.0",
    }),
  });
  if (!res.ok) throw new Error(`No se pudo registrar el dispositivo (${res.status})`);
  const data = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  return data.token;
}

export async function getToken() {
  let token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) token = await registerDevice();
  return token;
}

export async function api(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Token revocado: registrar de nuevo y reintentar una vez (ver receta 10: los datos
    // del registro anterior dejan de ser accesibles, así que los ids viejos darán 404).
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    const newToken = await registerDevice();
    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
  }
  return res;
}
```

### Paso 3 — Uso en pantallas

```js
// Listar fincas
const res = await api("/api/fincas/");
const { fincas } = await res.json();

// Crear finca
await api("/api/fincas/", {
  method: "POST",
  body: JSON.stringify({
    nombre: "Finca La Aurora",
    extension: 25.5,
    municipio: "Ibagué",
    departamento: "Tolima",
  }),
});

// Subir muestra con foto (multipart — no fijar Content-Type manual, fetch lo arma solo)
const form = new FormData();
form.append("foto", { uri: photoUri, name: "muestra.jpg", type: "image/jpeg" });
form.append("latitud", "4.7110");
form.append("longitud", "-74.0721");
form.append("punto_indice", String(indexSamplingPoint));
form.append("foto_indice", String(indexPhotoInSamplingPoint));
// El resultado de ObjectDetection.detectObjects(uri) se envía tal cual:
form.append("detecciones", JSON.stringify(detection));
await api(`/api/monitoreos/${monitoreoId}/muestras/`, { method: "POST", body: form });
```

`CORS` no aplica a una app RN nativa (solo afecta llamadas desde navegador); solo haría
falta configurarlo en el backend si se prueba desde Expo Web.

---

## Anexo A. Exportaciones — `/api/exportar/` (solo panel web, no aplica a la app)

> Este anexo es solo de referencia: estos endpoints los usa el dashboard web con sesión. La app móvil recibe `403` y no debe llamarlos. No forman parte del flujo fincas → monitoreos → muestras → detecciones.

> **Esta sección es referencia para el panel web: la app móvil no puede usar estos endpoints** (un dispositivo recibe
> `403 {"error": "Las exportaciones sólo están disponibles para usuarios web."}` y, sin sesión ni token, `401`).
> Se conserva para que el equipo móvil conozca el contrato y los topes (`413`) que afectan al panel.

Descarga de métricas e imágenes para análisis fuera del sistema. **Sólo personal web**
(investigador o superusuario, con sesión de la web): un dispositivo móvil recibe `403` y
sin sesión `401`. Todos los endpoints son `GET`, respetan los mismos filtros y no guardan
nada en el servidor (sin cola de tareas): cada petición genera el archivo en streaming con
memoria constante.

| Endpoint | Qué devuelve |
|----------|--------------|
| `GET /api/exportar/` | Catálogo JSON: datasets con sus columnas, filtros y topes vigentes. |
| `GET /api/exportar/<dataset>.csv` | Un dataset en CSV (streaming, sin tope de filas). |
| `GET /api/exportar/<dataset>.xlsx` | Un dataset en XLSX (una hoja). |
| `GET /api/exportar/todo.xlsx[?datasets=a,b,c]` | Un libro XLSX con una hoja por dataset (todos si se omite `datasets`). |
| `GET /api/exportar/imagenes/manifiesto/` | Manifiesto JSON (o CSV) de fotos con URL de descarga. **Vía principal** para imágenes. |
| `GET /api/exportar/imagenes.zip` | ZIP en streaming armado por el servidor (lotes pequeños). |
| `GET /api/exportar/todo.zip[?imagenes=1]` | ZIP con el CSV de cada dataset, `LEEME.txt` y, opcional, las fotos. |

Los archivos se nombran `riceback_<dataset>_<AAAAMMDD-HHMM>.<ext>` (`Content-Disposition`).

### Filtros

`?estado=&finca_id=&monitoreo_id=&desde=&hasta=&enfermedad_id=&severidad=&confianza_min=&confianza_max=&con_deteccion=`

Mismos nombres y significado que el dashboard (sección 9): `estado` es `FINALIZADO` por defecto,
`TODOS` lo desactiva y acepta lista separada por comas; `desde`/`hasta` (`AAAA-MM-DD`) usan la
fecha del monitoreo. Además:

- `monitoreo_id`: limita a uno o varios monitoreos. Acepta un id (`7`) o una lista separada por comas
  (`7,9,12`, máximo 200, sin repetidos). Los datasets `fincas` y `trazados` se restringen a las fincas y
  trazados de esos monitoreos. Un valor no numérico, cero, negativo o una lista mayor al máximo responde `400`.
- `con_deteccion=true|false` (muestras, imágenes y su ZIP): `false` deja sólo las fotos sin ninguna
  detección (hojas sanas). Los demás datasets lo ignoran.
- Los filtros de detección (`enfermedad_id`, `severidad`, `confianza_*`) restringen las filas de
  `detecciones` y dejan en `muestras`/imágenes sólo las fotos con al menos una detección que los
  cumpla; `n_detecciones` y `enfermedades` cuentan únicamente esas detecciones. `total_fotos`
  de `incidencia_por_punto` no se restringe (como la incidencia del dashboard).
- Los datasets `kpis_*` usan los selectores del dashboard e ignoran `monitoreo_id` (salvo
  `kpis_por_enfermedad`).

Un filtro inválido (`estado` desconocido, fecha mal escrita, id no numérico...) responde `400`.

### Datasets y columnas

El catálogo `GET /api/exportar/` es la fuente de verdad de las columnas. Los CSV son UTF-8 con BOM
(abren bien en Excel), separador coma, fechas ISO 8601, `true`/`false`, vacío para `null` y JSON
compacto en las columnas `*_json`. Un texto que empieza por `= + - @` se antepone con `'` en el CSV
para que Excel no lo evalúe como fórmula.

| Dataset | Una fila por... | Columnas |
|---------|-----------------|----------|
| `kpis_globales` | (una sola fila) | `total_fincas, total_monitoreos, monitoreos_sin_finalizar, total_muestras, total_detecciones, muestras_con_deteccion, incidencia, incidencia_total, extension_total_ha, detecciones_por_hectarea, confianza_promedio` |
| `fincas` | finca | `id, nombre, vereda, municipio, departamento, extension_ha, owner_username, n_monitoreos, n_muestras, n_detecciones, created_at` (conteos según los filtros) |
| `kpis_por_finca` | finca | `finca_id, finca_nombre, finca_vereda, finca_municipio, finca_departamento, extension_ha, monitoreos, detecciones, detecciones_por_hectarea, confianza_promedio` |
| `trazados` | trazado | `id, finca_id, finca_nombre, nombre, n_vertices, n_puntos_recorrido, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y, n_monitoreos, poligono_json, recorrido_json, created_at` |
| `monitoreos` | monitoreo | `id, codigo, fecha, estado, finca_id, finca_nombre, municipio, departamento, vereda, trazado_id, n_muestras, n_muestras_con_deteccion, n_detecciones, incidencia, confianza_promedio, observaciones, created_at` |
| `muestras` | foto (hoja) | `id, codigo, monitoreo_id, monitoreo_codigo, fecha, estado_monitoreo, finca_id, finca_nombre, punto_indice, foto_indice, ancho_px, alto_px, latitud, longitud, estado, n_detecciones, enfermedades, foto, created_at` (`enfermedades`: códigos o clases distintos unidos con una barra vertical; `foto`: nombre en el almacenamiento) |
| `detecciones` | caja detectada | `id, uuid, muestra_id, muestra_codigo, monitoreo_id, monitoreo_codigo, fecha, finca_id, finca_nombre, punto_indice, foto_indice, enfermedad_id, enfermedad_codigo, enfermedad_nombre, catalogada, clase, etiqueta, severidad, posicion, confianza, origin_x, origin_y, size_x, size_y, notas, created_at` |
| `kpis_por_enfermedad` | enfermedad | `enfermedad_id, enfermedad_codigo, nombre, clase, catalogada, conteo, confianza_promedio, muestras_afectadas, puntos_afectados, por_severidad_json` |
| `incidencia_por_punto` | punto de muestreo de un monitoreo | `monitoreo_id, monitoreo_codigo, fecha, finca_id, finca_nombre, punto_indice, total_fotos, fotos_con_deteccion, incidencia, salud, enfermedades` (todos los puntos `0..n-1` de cada monitoreo, igual que `resumen.incidencia_por_punto` del dashboard: `n` es el mayor entre el último punto con fotos + 1 y el largo del recorrido de su trazado; los puntos sin fotos salen con `total_fotos` 0, `incidencia` 0, `salud` 0 y `enfermedades` vacío; un monitoreo sin fotos ni recorrido no aporta filas; `salud`: `0` sin fotos, `1` sano, `2` con detección) |

### Topes y códigos de error

| Código | Cuándo |
|--------|--------|
| `400` | Filtro, `datasets`, `limite`, `despues_de`, `formato` o `imagenes` inválido. |
| `401` / `403` | Sin sesión / dispositivo móvil o usuario sin rol web. |
| `404` | Dataset o formato desconocido (`/api/exportar/xxx.csv`, `muestras.pdf`). Respuesta JSON. |
| `413` | XLSX con más filas que el tope por hoja (`{"error", "dataset", "filas", "limite", "sugerencia": "csv"}`), o ZIP con más imágenes que el tope (`{"error", "imagenes", "limite", "sugerencia": "manifiesto", "manifiesto": "/api/exportar/imagenes/manifiesto/"}`). |

### Validar antes de descargar (`validar=1`)

Los endpoints de descarga (`<dataset>.csv|xlsx`, `todo.xlsx`, `todo.zip`, `imagenes.zip` y
`imagenes/manifiesto/?formato=csv`) aceptan `?validar=1`. Ejecutan **la misma validación** que la
descarga real (sesión y rol, filtros, dataset y formato, `datasets=`, topes de filas e imágenes)
pero no generan el archivo: responden `200` con JSON (`Content-Type: application/json`) o con el
mismo estado y el mismo `{"error": ...}` que daría la petición real (`400`, `401`, `403`, `404`, `413`).
El panel del dashboard lo usa antes de cada descarga para mostrar el mensaje del servidor en vez de
guardar un JSON de error como si fuera el archivo.

```json
{"ok": true, "filas": {"muestras": 120, "kpis_globales": null}, "imagenes": 120}
```

`filas` trae el número de filas de cada dataset cuando se conoce de forma barata (`null` si no) e
`imagenes` el número de fotos cuando la petición las incluye. Un valor no booleano en `validar`
responde `400`.

| Variable de entorno | Defecto | Efecto |
|---------------------|---------|--------|
| `AGRI_EXPORT_MAX_FILAS_XLSX` | `200000` | Filas máximas por hoja XLSX (nunca más de 1.048.575, el límite de Excel). El CSV no tiene tope. |
| `AGRI_EXPORT_MAX_IMAGENES_ZIP` | `300` | Imágenes máximas de `imagenes.zip` y de `todo.zip?imagenes=1`. |
| `AGRI_EXPORT_MANIFIESTO_MAX` | `1000` | Tamaño máximo de página del manifiesto (`limite`). |
| `AGRI_EXPORT_URL_EXPIRA_SEG` | `3600` | Vigencia de las URL firmadas del manifiesto. |

### Manifiesto de imágenes

`GET /api/exportar/imagenes/manifiesto/?despues_de=<id>&limite=<n>` (`limite` por defecto 200,
máximo `AGRI_EXPORT_MANIFIESTO_MAX`). Paginación por cursor sobre el id de la muestra:

```json
{
  "total": 1250,
  "limite": 200,
  "siguiente": 4817,
  "expira_en_seg": 3600,
  "items": [
    {
      "muestra_id": 4602, "codigo": "MUE-1A2B3C4D", "monitoreo_codigo": "MON-9F8E7D6C",
      "fecha": "2026-03-14", "finca_nombre": "La Esperanza", "punto_indice": 0, "foto_indice": 1,
      "enfermedades": ["BLAST", "brown_spot"],
      "ruta_sugerida": "La-Esperanza/MON-9F8E7D6C/punto_0/foto_1_4602.jpg",
      "url": "https://s3.us-west-004.backblazeb2.com/bucket/muestras/2026/03/14/ab12.jpg?X-Amz-...",
      "tamano_bytes": null
    }
  ]
}
```

- `total` sólo viene en la primera página (sin `despues_de`). `siguiente` es el valor que se envía
  como `despues_de` en la página siguiente y es `null` al terminar.
- `url`: con almacenamiento S3/B2 es una **URL firmada** de lectura que caduca en
  `AGRI_EXPORT_URL_EXPIRA_SEG`; el navegador la descarga directo del bucket sin pasar por el
  servidor. Con almacenamiento local es la URL absoluta de `/media/` (en desarrollo con `DEBUG`).
  Pida páginas conforme las vaya consumiendo: las URL de una página vieja pueden haber caducado.
- `tamano_bytes`: sólo se informa con almacenamiento local; en S3 es `null` (costaría una
  petición HEAD por foto).
- `ruta_sugerida` es única y usa sólo caracteres seguros; sirve como ruta dentro del ZIP del cliente.
- Con `?formato=csv` se descarga el manifiesto completo (sin paginar) como CSV en streaming, útil
  para scripts (`wget`/`curl`).

### ZIP del servidor

- `GET /api/exportar/imagenes.zip`: `metadata.csv` (las muestras con `n_detecciones`,
  `enfermedades` y la columna `archivo`), `detecciones.csv` y las fotos en
  `imagenes/<finca>/<monitoreo>/punto_P/foto_F_<id>.<ext>`. Se arma en streaming, sin compresión
  y leyendo cada foto por trozos de 64 KB. Si hay más de `AGRI_EXPORT_MAX_IMAGENES_ZIP` fotos
  responde `413`. Una foto que no exista en el almacenamiento se omite y se lista en
  `faltantes.txt` (el ZIP nunca se aborta).
- `GET /api/exportar/todo.zip`: `LEEME.txt` (filtros y fecha de generación), `datos/<dataset>.csv`
  de cada dataset (`?datasets=a,b` para elegir) y, con `?imagenes=1`, las fotos en `imagenes/` (mismo
  tope y `faltantes.txt`).

Los ZIP son para lotes pequeños: el servidor atiende la descarga entera. Para volúmenes grandes use
el manifiesto y arme el ZIP en el navegador.

### Configuración CORS del bucket (B2/S3) para el ZIP en el navegador

El dashboard descarga las fotos directo del bucket con las URL firmadas, así que el bucket debe
permitir peticiones `GET` desde el dominio del dashboard (si no, el navegador bloquea la lectura
aunque la URL sea válida):

- **Origen permitido:** el dominio del dashboard, p. ej. `https://riceback.onrender.com`
  (evite `*` si el bucket tiene datos sensibles).
- **Métodos:** `GET` (y `HEAD`).
- **Cabeceras permitidas:** `*` (o al menos `Range`, `Content-Type`).
- **Cabeceras expuestas:** `Content-Length`, `Content-Type`, `ETag`.
- **Tiempo de caché del preflight:** `3600`.

Ejemplo para Backblaze B2 (regla de CORS del bucket, API nativa `b2_update_bucket`):

```json
[
  {
    "corsRuleName": "dashboard-descargas",
    "allowedOrigins": ["https://riceback.onrender.com"],
    "allowedOperations": ["s3_get", "s3_head"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["Content-Length", "Content-Type", "ETag"],
    "maxAgeSeconds": 3600
  }
]
```

Las URL firmadas caducan según `AGRI_EXPORT_URL_EXPIRA_SEG` (3600 s por defecto): una descarga muy
larga debe pedir páginas del manifiesto a medida que avanza, no todas al inicio.

### Ejemplos

```bash
# CSV de detecciones de severidad alta desde una fecha (sesión de la web: cookie)
curl -b cookies.txt -o detecciones.csv \
  "https://host/api/exportar/detecciones.csv?severidad=ALTA&desde=2026-01-01"

# Libro XLSX con tres hojas
curl -b cookies.txt -o datos.xlsx \
  "https://host/api/exportar/todo.xlsx?datasets=monitoreos,muestras,incidencia_por_punto"

# Fotos sanas (sin detección) del monitoreo 12: manifiesto en CSV para un script
curl -b cookies.txt -o sanas.csv \
  "https://host/api/exportar/imagenes/manifiesto/?formato=csv&monitoreo_id=12&con_deteccion=false"

# Todo: CSV de cada dataset + fotos
curl -b cookies.txt -o todo.zip "https://host/api/exportar/todo.zip?imagenes=1&estado=TODOS"
```

### Despliegue

Las descargas largas necesitan un servidor con hilos: la imagen Docker arranca gunicorn con
`--worker-class gthread --threads ${GUNICORN_THREADS:-4} --workers ${GUNICORN_WORKERS:-1}
--timeout ${GUNICORN_TIMEOUT:-300}`. Con un solo worker de la clase `sync` una exportación larga
bloquearía el resto de peticiones.
