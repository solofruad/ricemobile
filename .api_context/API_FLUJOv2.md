# RiceBack API — Flujo completo para el Frontend

Guía técnica que documenta **todos los endpoints**, **cómo debe enviar la información el frontend** y **qué devuelve el backend**.

- Base de la API: `/api/`
- Autenticación: **token de dispositivo** en la cabecera `Authorization: Bearer <token>`.
- Formato de respuestas: JSON (`Content-Type: application/json`).
- Errores: `{"error": "<mensaje>"}` salvo `404` (HTML de Django) y `DELETE` (204 sin cuerpo).

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

> Sin la cabecera, cualquier endpoint responde `401`. El código de alta es una constante
> de compilación de la app, no algo que teclee el usuario.

### Alcance de los datos

Cada dispositivo **sólo ve lo que él mismo registró**. Las fincas, monitoreos, muestras y
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

## 2. Respuestas y códigos de estado comunes

| Código | Significado |
|--------|-------------|
| `200`  | OK (GET / PUT / PATCH) |
| `201`  | Recurso creado (POST) |
| `204`  | Eliminado (DELETE, sin cuerpo) |
| `400`  | JSON inválido, validación o regla de negocio (`{"error": "..."}`) |
| `401`  | Token ausente, inválido o revocado (`{"error": "No autenticado"}`) |
| `403`  | Código de alta inválido |
| `404`  | Recurso inexistente **o de otro dispositivo** (HTML de Django, no JSON) |
| `429`  | Rate limit del alta de dispositivos (5 intentos / 5 min por IP) |

### Estructura de un usuario (payload `_user_payload`)

```json
{
  "id": 1,
  "username": "carla",
  "email": "carla@riceback.io",
  "role": "INVESTIGADOR",
  "first_name": "Carla",
  "last_name": "López",
  "is_staff": false,
  "is_superuser": false,
  "tipo": "investigador"
}
```

> `tipo` es `"superusuario"` si `is_superuser` es `true`, si no `"investigador"`.

---

## 3. Autenticación — `/api/auth/`

### `POST /api/auth/devices/register/`
Da de alta la instalación y entrega su token. Es el **único** endpoint que no exige token.
- **Envío:** JSON
```json
{ "join_code": "<código de alta>", "platform": "android", "app_version": "1.0.0" }
```
  `platform` y `app_version` son opcionales y sólo sirven para diagnóstico.
- **Devuelve:** — `201`
```json
{
  "token": "u3Xn...",
  "device_id": 7,
  "user": { "...payload de usuario..." }
}
```
- Errores: `403` código inválido, `429` demasiados intentos desde la misma IP,
  `503` si el servidor no tiene configurado el código de alta.
- El backend crea un usuario propio para el dispositivo (`device_<hex>`), que es el que
  queda como `owner` de lo que registre.

### `GET /api/auth/me/`
Datos del usuario del dispositivo. Sirve para verificar que el token sigue siendo válido.
- **Devuelve:** payload de usuario — `200`; `401` si el token fue revocado.
- Requiere token.

---

## 4. Fincas — `/api/fincas/`

Estructura de una finca (`_finca_payload`):

```json
{
  "id": 3,
  "nombre": "Finca La Aurora",
  "vereda": "El Roble",
  "municipio": "Ibagué",
  "departamento": "Tolima",
  "extension": "25.5000",
  "owner_id": 1,
  "owner_username": "carla",
  "created_at": "2026-01-10T14:20:00.000Z",
  "updated_at": "2026-01-10T14:20:00.000Z"
}
```

> `extension` se devuelve como **string** (Decimal).
> `municipio` y `departamento` son **obligatorios** (texto, máx. 150 caracteres). `vereda` es opcional (`""` si no se envía).

### `GET /api/fincas/`
- **Devuelve:** `{"fincas": [payload-finca, ...]}` — `200`
- Requiere token.

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
  `owner_id` es opcional. Solo un **superusuario** puede enviarlo (asigna dueño). Un investigador crea la finca a su nombre automáticamente.
- **Devuelve:** payload-finca — `201`; `400` si falta `nombre`/`extension`/`municipio`/`departamento`, alguno viene vacío o la extensión es negativa.
- Requiere token.

### `GET /api/fincas/<id>/`
- **Devuelve:** payload-finca — `200`
- Requiere token.

### `PUT/PATCH /api/fincas/<id>/`
- **Envío:** JSON parcial o completo con los campos a cambiar:
```json
{ "nombre": "Nuevo nombre", "extension": 30, "municipio": "Espinal", "departamento": "Tolima" }
```
  Campos editables: `nombre`, `extension`, `vereda`, `municipio`, `departamento`. `municipio` y `departamento` no se pueden dejar vacíos.
  `owner_id` solo lo aplica un superusuario.
- **Devuelve:** payload-finca — `200`; `400` en validación.
- Requiere token.

### `DELETE /api/fincas/<id>/`
- **Devuelve:** vacío — `204`
- Requiere token.

---

## 5. Enfermedades — `/api/enfermedades/`

Estructura (`_enfermedad_payload`):

```json
{
  "id": 2,
  "codigo": "ESCALDADO_HOJA_ARROZ",
  "nombre_comun": "Escaldado de la hoja del arroz",
  "nombre_cientifico": "Pyricularia oryzae",
  "nombre_cientifico_alterno": "",
  "cultivo": "arroz",
  "descripcion": "Enfermedad fúngica...",
  "observaciones": "",
  "alias": ["leaf_scald", "rice_leaf_scald", "escaldado"],
  "activa": true,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

> `alias` son los nombres de clase que emite el modelo de detección para esa
> enfermedad. Al crear una detección, la clase se compara (sin mayúsculas, tildes
> ni diferencias entre `_`, `-`, `.` y espacios) contra el `codigo` y los `alias`
> de las enfermedades **activas**. Un mismo nombre no puede identificar a dos
> enfermedades (`400`).

### `GET /api/enfermedades/`
- **Envío:** opcional `?activas=false` para listar todas (por defecto solo las activas).
- **Devuelve:** `{"enfermedades": [payload-enfermedad, ...]}` — `200`
- Requiere token.

### `POST /api/enfermedades/`  *(solo superusuario)*
- **Envío:** JSON
```json
{
  "codigo": "ESCALDADO_HOJA_ARROZ",
  "nombre_comun": "Escaldado de la hoja",
  "nombre_cientifico": "Pyricularia oryzae",
  "cultivo": "arroz",
  "nombre_cientifico_alterno": "",
  "descripcion": "",
  "observaciones": "",
  "alias": ["leaf_scald", "escaldado"],
  "activa": true
}
```
  (`codigo`, `nombre_comun`, `nombre_cientifico`, `cultivo` obligatorios; los demás opcionales).
- **Devuelve:** payload-enfermedad — `201`; `400` si `codigo`/`nombre_cientifico` ya existen.
- Requiere token.

### `GET /api/enfermedades/<id>/`
- **Devuelve:** payload-enfermedad — `200`
- Requiere token.

### `PUT/PATCH /api/enfermedades/<id>/`  *(solo superusuario)*
- **Envío:** JSON con campos a cambiar.
- **Devuelve:** payload-enfermedad — `200`; `400` en validación.
- Requiere token.

### `DELETE /api/enfermedades/<id>/`  *(solo superusuario)*
- **Devuelve:** vacío — `204`.
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

Estructura (`_monitoreo_payload`):

```json
{
  "id": 7,
  "finca_id": 3,
  "finca_nombre": "Finca La Aurora",
  "finca_vereda": "El Roble",
  "finca_municipio": "Ibagué",
  "finca_departamento": "Tolima",
  "codigo": "MON-9F3A2B1C",
  "estado": "EN_PROGRESO",
  "fecha": "2026-09-10",
  "observaciones": "Revisión semanal",
  "created_at": "2026-09-10T08:00:00.000Z",
  "updated_at": "2026-09-10T08:00:00.000Z",
  "muestras": []           // solo en detalle / creación
}
```

### `GET /api/monitoreos/`
- **Envío:** filtros opcionales por query: `?finca_id=&estado=&desde=&hasta=` (`desde`/`hasta` = fecha `YYYY-MM-DD`).
- **Devuelve:** `{"monitoreos": [payload-monitoreo, ...]}` (sin `muestras` anidadas) — `200`
- Requiere token.

### `POST /api/monitoreos/`
- **Envío:** JSON
```json
{
  "finca_id": 3,
  "estado": "BORRADOR",
  "fecha": "2026-09-10",
  "observaciones": "Revisión semanal",
  "muestras": []              // opcional, ver sección Muestras
}
```
  `finca_id` es obligatorio. `estado` solo acepta `BORRADOR` o `EN_PROGRESO` al crear.
- **Devuelve:** payload-monitoreo **con `muestras` anidadas** — `201`; `400` si finca no existe o estado no válido.
- Requiere token.

### `GET /api/monitoreos/<id>/`
- **Devuelve:** payload-monitoreo **con `muestras` y sus `detecciones`** — `200`
- Requiere token.

### `PUT/PATCH /api/monitoreos/<id>/`
- **Envío:** JSON con campos a cambiar: `observaciones`, `fecha`, `finca_id` y/o `estado`.
  - Cambiar `estado` dispara la FSM (ej. de `BORRADOR` a `EN_PROGRESO`).
  - No se permite cambiar finca si el monitoreo ya tiene muestras.
  - No se puede cambiar `estado` a un estado final **y** a la vez modificar otros campos en el mismo request.
- **Devuelve:** payload-monitoreo con muestras — `200`; `400` si la transición no es válida o el monitoreo está finalizado/cancelado.
- Requiere token.

### `DELETE /api/monitoreos/<id>/`
- **Devuelve:** vacío — `204`
- Requiere token.

---

## 7. Muestras — `/api/monitoreos/<id>/muestras/` y `/api/monitoreos/muestras/<id>/`

Estructura (`muestra_payload`):

```json
{
  "id": 11,
  "monitoreo_id": 7,
  "codigo": "MUE-2A5C9D3E",
  "foto_url": "/media/muestras/2026/09/10/ab12...jpg",
  "imagen_url": "/media/muestras/2026/09/10/ab12...jpg",
  "ancho_px": 4032,
  "alto_px": 3024,
  "punto_indice": 0,
  "foto_indice": 2,
  "estado": "PENDIENTE",
  "latitud": "4.71100000",
  "longitud": "-74.07210000",
  "created_at": "2026-09-10T08:05:00.000Z",
  "updated_at": "2026-09-10T08:05:00.000Z",
  "detecciones": []          // cuando incluye
}
```

- `foto_url` e `imagen_url` son alias del mismo archivo. `latitud`/`longitud` se devuelven como string o `null`.
- `ancho_px`/`alto_px` los calcula el backend al subir la foto: son el tamaño de la
  imagen **sin aplicar la rotación EXIF**, que es el sistema de coordenadas de las cajas.
- `punto_indice`/`foto_indice` ubican la foto en el recorrido de muestreo (índices
  desde 0, como en ricemobile). Son opcionales, pero van juntos; `foto_indice` va de
  `0` a `AGRI_MAX_FOTOS_POR_PUNTO - 1` (5 fotos por defecto) y la pareja no se puede
  repetir dentro del monitoreo. Con ellos se calcula la incidencia por punto.

Estados de muestra: `PENDIENTE`, `PROCESADA`, `ERROR`.

### `GET /api/monitoreos/<id>/muestras/`
- **Envío:** opcional `?estado=PENDIENTE`.
- **Devuelve:** `{"muestras": [payload-muestra con detecciones, ...]}` — `200`
- Requiere token.

### `POST /api/monitoreos/<id>/muestras/`  ⚠️ **multipart/form-data**
La muestra se envía como **formulario multipart** (no JSON) porque incluye un archivo.

- **Envío (multipart):**
```
foto: <archivo JPEG/PNG>         # obligatorio (también acepta el campo "imagen")
punto_indice: 0                  # opcional (junto con foto_indice)
foto_indice: 2                   # opcional (junto con punto_indice)
codigo: MUE-1                    # opcional
estado: PENDIENTE                # opcional
latitud: 4.7110                  # opcional
longitud: -74.0721               # opcional
detecciones: [...]               # opcional, STRING JSON (ver nota)
```
  El campo `detecciones` es un **string JSON** con el arreglo **tal cual lo devuelve
  el detector de ricemobile** (`ObjectDetection.detectObjects`):
```json
[
  {
    "frame": { "origin": { "x": 120, "y": 80 }, "size": { "x": 45, "y": 60 } },
    "labels": [
      { "text": "{\"enfermedad\":\"blast\",\"severidad\":\"ALTA\",\"posicion\":\"hoja\"}", "confidence": 0.92 },
      { "text": "leaf_scald", "confidence": 0.41 }
    ],
    "uuid": "9f3a0c2e-...",   // opcional, id generado en el dispositivo
    "notas": "marca en la hoja" // opcional
  }
]
```
  - `frame`: caja en **píxeles** de la foto sin rotar; `origin` es la esquina superior
    izquierda y `size` el ancho/alto. La caja debe caber en la imagen (`400` si no).
  - `labels`: al menos una. La de **mayor confianza** es la principal; el resto se
    guarda en `etiquetas_alternas`.
  - `labels[].text`: texto plano con la clase (`"blast"`) **o** un JSON en string con
    la clase y demás atributos del modelo. Del JSON se extraen, sin distinguir mayúsculas:
    - clase: `enfermedad`, `clase`, `class`, `label`, `nombre`, `disease` o `name`
    - severidad: `severidad`, `severity` o `nivel_severidad`
    - posición: `posicion`, `position`, `organo`, `organ` o `ubicacion`

    El objeto completo se conserva en `atributos`.
  - La enfermedad se resuelve por `codigo`/`alias` (ver §5). Si la clase no está en el
    catálogo la detección se guarda igual, con `enfermedad_id: null`.

  **Nota sobre imágenes:** válidas JPEG/PNG (también MPO del modo Retrato de iPhone),
  máx. 10 MB y dimensiones ≤ 8192 px (configurable).
- **Devuelve:** payload-muestra **con sus detecciones** — `201`; `400` si falta `foto`,
  `detecciones` no es JSON válido o no tiene el formato esperado, falla la validación
  de la imagen o de los índices. Si una caja es inválida no se guarda nada.
- Requiere token.

### `GET /api/monitoreos/muestras/<id>/`
- **Devuelve:** payload-muestra con detecciones — `200`
- Requiere token.

### `PUT/PATCH /api/monitoreos/muestras/<id>/`
- **Envío:** JSON (no multipart) con campos a cambiar: `estado`, `latitud`, `longitud`, `punto_indice`, `foto_indice`.
- **Devuelve:** payload-muestra con detecciones — `200`; `400` si el monitoreo padre está finalizado/cancelado.
- Requiere token.

### `DELETE /api/monitoreos/muestras/<id>/`
- **Devuelve:** vacío — `204`
- Requiere token.

---

## 8. Detecciones — `/api/monitoreos/muestras/<id>/detecciones/` y `/api/monitoreos/detecciones/<id>/`

Estructura (`deteccion_payload`):

```json
{
  "id": 14,
  "muestra_id": 11,
  "uuid": "9f3a...",
  "etiqueta": "{\"enfermedad\":\"blast\",\"severidad\":\"ALTA\",\"posicion\":\"hoja\"}",
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
  "enfermedad_codigo": "PYRICULARIA_ORYZAE",
  "enfermedad_nombre_comun": "Tizón del arroz",
  "enfermedad_nombre_cientifico": "Pyricularia oryzae",
  "enfermedad_nombre_cientifico_alterno": "Magnaporthe oryzae",
  "created_at": "2026-09-10T08:05:30.000Z",
  "updated_at": "2026-09-10T08:05:30.000Z"
}
```

- Coordenadas en **píxeles** de la foto sin rotar (`ancho_px` × `alto_px` de la muestra).
  `frame` repite los mismos valores con el formato de ricemobile, para dibujar sin conversión.
- `etiqueta` es el `text` crudo de la etiqueta principal; `clase`, `severidad` y
  `posicion` se extraen de él (ver §7).
- `enfermedad_*` son `null` cuando la clase no está en el catálogo.
- `confidence` debe estar entre `0` y `1`. `uuid` no se puede cambiar tras la creación.

### `GET /api/monitoreos/muestras/<id>/detecciones/`
- **Envío:** filtros opcionales: `?enfermedad_id=&clase=&severidad=&sin_enfermedad=true&confianza_min=&confianza_max=`
  (`clase` y `severidad` sin distinguir mayúsculas; `sin_enfermedad=true` lista las no catalogadas).
- **Devuelve:** `{"detecciones": [payload-deteccion, ...]}` — `200`
- Requiere token.

### `POST /api/monitoreos/muestras/<id>/detecciones/`
Agrega una caja suelta a una muestra existente, con el mismo formato de ricemobile.
- **Envío:** JSON
```json
{
  "frame": { "origin": { "x": 120, "y": 80 }, "size": { "x": 45, "y": 60 } },
  "labels": [{ "text": "blast", "confidence": 0.92 }],
  "uuid": "9f3a-...",   // opcional
  "notas": "marca en la hoja"
}
```
- **Devuelve:** payload-deteccion — `201`; `400` si el formato no es válido, la caja se
  sale de la imagen o el monitoreo está finalizado.
- Requiere token.

### `GET /api/monitoreos/detecciones/<id>/`
- **Devuelve:** payload-deteccion — `200`
- Requiere token.

### `PUT/PATCH /api/monitoreos/detecciones/<id>/`
Corrección manual (p. ej. un agrónomo reasigna la enfermedad).
- **Envío:** JSON con campos a cambiar: `enfermedad_id` (o `null`), `severidad`, `posicion`,
  `notas`, `confidence`, `origin_x/y`, `size_x/y`. `uuid`, `etiqueta` y `clase` **no** cambian.
- **Devuelve:** payload-deteccion — `200`; `400` en validación.
- Requiere token.

### `DELETE /api/monitoreos/detecciones/<id>/`
- **Devuelve:** vacío — `204`
- Requiere token.

---

## 9. Dashboard — KPIs

### `GET /`  *(HTML)*
Página HTML del dashboard con los KPIs y el visor de bounding boxes. Autenticado.

### Filtros comunes
`?finca_id=&desde=&hasta=&enfermedad_id=&severidad=&confianza_min=&confianza_max=`

`enfermedad_id`, `severidad` y los de confianza se aplican a las detecciones; `desde`/`hasta`
usan la fecha del monitoreo.

### `GET /api/dashboard/data/`
KPIs globales, por finca y por enfermedad.
- **Envío:** filtros comunes.
- **Devuelve:**
```json
{
  "global": {
    "total_fincas": 2,
    "total_monitoreos": 7,
    "total_muestras": 30,
    "total_detecciones": 14,
    "muestras_con_deteccion": 9,
    "incidencia": 0.3,
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
      "confianza_promedio": 0.9
    }
  ],
  "por_enfermedad": [ /* igual que /api/dashboard/enfermedades/ */ ]
}
```
  `incidencia` = muestras con al menos una detección / total de muestras.
- Requiere token.

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
- **Devuelve** (además de los campos del monitoreo):
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
  `salud`: `0` sin fotos, `1` sano, `2` con detección (los mismos colores gris/verde/rojo
  del recorrido en ricemobile). Los puntos intermedios sin fotos aparecen con `salud: 0`.
- Requiere token.

---

## 10. Flujo de ejemplo completo

En todas las peticiones a partir del paso 2 viaja `Authorization: Bearer <token>`.

1. **Alta del dispositivo (sólo la primera vez):**
   ```
   POST /api/auth/devices/register/
   Body: {"join_code": "<código>", "platform": "android"}
   → guardar el token que devuelve
   ```
2. **Comprobar que el token sigue vivo:**
   ```
   GET /api/auth/me/
   ```
3. **Cargar KPIs del dashboard:**
   ```
   GET /api/dashboard/data/
   ```
4. **Crear una finca:**
   ```
   POST /api/fincas/
   Body: {"nombre": "Finca La Aurora", "extension": 25.5, "municipio": "Ibagué", "departamento": "Tolima"}
   ```
5. **Crear un monitoreo (borrador):**
   ```
   POST /api/monitoreos/
   Body: {"finca_id": 3, "estado": "BORRADOR"}
   ```
6. **Cambiar a EN_PROGRESO:**
   ```
   PATCH /api/monitoreos/7/
   Body: {"estado": "EN_PROGRESO"}
   ```
7. **Subir una muestra con imagen y detecciones (multipart):**
   ```
   POST /api/monitoreos/7/muestras/
   FormData: foto=<archivo>, punto_indice=0, foto_indice=0,
             latitud=4.7110, longitud=-74.0721,
             detecciones='[{"frame":{"origin":{"x":120,"y":80},"size":{"x":45,"y":60}},
                           "labels":[{"text":"blast","confidence":0.92}]}]'
   ```
8. **Ver el monitoreo completo:**
   ```
   GET /api/monitoreos/7/
   ```
9. **Finalizar:**
   ```
   PATCH /api/monitoreos/7/
   Body: {"estado": "FINALIZADO"}
   ```

No hay logout: el token vive hasta que se revoque el dispositivo desde el admin.

---

## 11. Reglas clave a recordar

- **`Authorization: Bearer <token>`** en toda petición, también en las de lectura.
- **No hay CSRF ni cookies** para la app; `credentials: "include"` no hace falta.
- **Monitoreo**: estados terminales (`FINALIZADO`, `CANCELADO`) son inmutables.
- **Muestra**: se crea solo por **multipart** con `foto`; el resto de operaciones usan JSON.
- **Detección**: se envía con el formato del detector de ricemobile (`{frame, labels}`),
  coordenadas en píxeles de la foto sin rotar. La enfermedad se resuelve por `codigo`/`alias`;
  severidad y posición viajan dentro de `labels[].text` como JSON.
- **Finca**: `municipio` y `departamento` son obligatorios; `extension` es string; `owner_id` solo lo asigna un superusuario.
- **Enfermedades**: el CRUD (salvo GET) es exclusivo de superusuario; no se puede borrar una enfermedad con detecciones.

---

## 12. Integración con React Native (backend ya desplegado)

El backend está desplegado en Render y usa Postgres en Neon. Estos son los dos valores
que el frontend necesita para conectarse:

- **URL base de la API**: `https://riceback-backend.onrender.com`
- **Código de alta (`DEVICE_JOIN_CODE`)**: `riceMovil-2026_010101`
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
export const DEVICE_JOIN_CODE = "riceMovil-2026_010101"; // constante de compilación
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
    // Token revocado: registrar de nuevo y reintentar una vez.
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    const newToken = await registerDevice();
    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
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