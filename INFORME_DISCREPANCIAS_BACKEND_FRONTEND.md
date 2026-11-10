# Informe de Discrepancias de Datos — Frontend `ricemobile` vs Backend `RiceBack`

**Fecha:** 2026-10-20
**Origen frontend:** `C:\Users\porta\Documents\GitHub\ricemobile`
**Origen backend:** `H:\Repos\RiceBack`
**Objetivo:** que backend y frontend manejen exactamente la misma estructura de información (campos, tipos, relaciones).
**Docs de referencia:**
- Frontend espera `v2`: `ricemobile/.api_context/API_FLUJOv2.md` (821 líneas)
- Backend implementa `v1`: `RiceBack/API_FLUJO.md` (570 líneas) + código en `apps/`

> Este informe es solo lectura de código. No se modificó ningún proyecto.

---

## 1. Resumen ejecutivo

El frontend **ya envía** campos de la especificación v2 que el backend **ignora o rechaza**:

| # | Discrepancia | Severidad | Efecto actual |
|---|--------------|-----------|---------------|
| 1 | `Finca.municipio / departamento` enviados pero filtrados en backend | **P0 - Pérdida silenciosa** | Localización se pierde, `GET` nunca los devuelve |
| 2 | `Muestra.punto_indice / foto_indice` enviados pero no leídos | **P0 - Pérdida silenciosa** | Se pierde estructura del recorrido, imposible incidencia por punto |
| 3 | `Muestra.detecciones` formato `{frame,labels[]}` vs `{label,confidence,origin_x...}` | **P0 - Ruptura** | `POST muestras/` → `400` siempre que haya detecciones |
| 4 | `Deteccion.label` libre (`blast`, `leaf_scald`...) vs enum `PLAGA/ENFERMEDAD/MALEZA/OTRO` | **P0 - Ruptura** | Sin capa de mapeo clase→`enfermedad_id` nada valida |
| 5 | `Muestra.ancho_px / alto_px`, `Deteccion.etiqueta/clase/severidad/posicion/atributos/etiquetas_alternas`, `Enfermedad.alias` no existen en backend | **P0 - Faltante v2** | Dashboard v2 e incidencia por severidad imposibles |
| 6 | Frontend no sube fotos sanas (`detection==[]` se salta) | **P1 - Sesgo** | `incidencia` backend siempre ~1.0 |
| 7 | `Finca.nombre=""` cuando `nombre_finca=null` | **P1 - 400 potencial** | `Finca.nombre blank=False + full_clean()` falla |
| 8 | `MonitorDrawings.polygon/samplingPath`, `farm_form.autoriza_uso_muestras/hectareas` sin equivalente backend | **P1 - Faltante** | Recorrido y consentimiento solo locales |
| 9 | Frontend nunca envía `latitud/longitud`, nunca consulta `/enfermedades/` ni `/dashboard/` | **P2 - Desaprovechado** | Georreferencia y catálogo perdidos |
| 10 | `FincaPayload` frontend espera `municipio/departamento`, backend no los devuelve | **P2 - Contrato** | Cliente recibe `undefined` |

**Conclusión:** alinear backend a v2 (recomendado). Recortar frontend a v1 haría perder datos agronómicos ya recolectados.

---

## 2. Estructura real del frontend (lo que genera la app)

Stack: `Expo ~54, expo-router ~6, expo-sqlite ~16, expo-secure-store, expo-file-system` (`package.json`). Sin Drizzle/Supabase. DB `detections.db` en `SQLite/`.

### 2.1 Tablas SQLite locales

**`farm_form` singleton `id=1`** — `database/tables/FarmFormTable.ts:4-17,23-36`:
```
id INTEGER PK AUTOINCREMENT (=1 siempre)
nombre_finca TEXT|null
hectareas REAL|null
departamento TEXT|null
municipio TEXT|null
vereda TEXT|null
autoriza_uso_muestras INTEGER|null (null=nunca preguntado, 0=no, 1=sí) vía ensureColumn
uploaded BOOLEAN DEFAULT FALSE
remote_id INTEGER|null vía ensureColumn
last_requested_at TEXT|null
created_at TEXT DEFAULT datetime('now','localtime')
uploaded_at TEXT|null
```

**`monitorDrawings`** — `database/tables/MonitorDrawingsTable.ts`:
```
id INTEGER PK
polygon_json TEXT NOT NULL       // PolygonSharedValue = VertexSharedValue[{x,y,id}][]
samplingPath_json TEXT NOT NULL
created_at TEXT
```
Tipos: `app/monitoring/MonEdit.tsx: MonitorDrawingData`, `app/monitoring/MonCanvas.tsx: VertexSharedValue`, `types/types.d.ts: Point`.

**`monitorings`** — `database/tables/MonitoringsTable.ts`:
```
id INTEGER PK
id_monitor_drawing INTEGER NOT NULL FK→monitorDrawings(id) ON DELETE CASCADE
processed BOOLEAN DEFAULT FALSE
remote_id INTEGER|null (ensureColumn)
sync_state TEXT DEFAULT 'PENDING' (PENDING|UPLOADED, ensureColumn)
created_at TEXT
```
Joins reales: `monitorings JOIN monitorDrawings d ON d.id=m.id_monitor_drawing` en `getProcessedWithDrawing[ById]`.

**`samplings` PK compuesta** — `database/tables/SamplingsTable.ts:30-48`:
```
id_monitoring INTEGER (parte PK, lógico → monitorings.id, sin FK SQL)
index_sampling_point INTEGER NOT NULL (parte PK)
index_photo_in_sampling_point INTEGER NOT NULL (parte PK)
photo_dir TEXT NOT NULL (file://...jpg)
detection_json TEXT NOT NULL (JSON ObjectDetectionResult[], puede ser [])
remote_id INTEGER|null (ensureColumn)
uploaded BOOLEAN DEFAULT 0 (ensureColumn)
created_at TEXT
```

**`detections` (legado álbum/chatbot, NO hace sync)** — `database/tables/DetectionsTable.ts`:
```
id INTEGER PK, photo_dir TEXT NOT NULL, detection_json TEXT NOT NULL, created_at TEXT
```
Usado en `app/cameraScan/ScanControledCanvas.tsx`, `app/album/AlbumModule.tsx`.

**`tours_seen`** — `database/tables/ToursTable.ts`: `tour_id TEXT PK, seen_at TEXT`.

### 2.2 Tipos TS relevantes

`src/ObjectDetection.ts:5-14`:
```ts
type ObjectDetectionResult = {
  frame: { origin:{x:number,y:number}, size:{x:number,y:number} },
  labels: Array<{ text:string, confidence:number }>
}
```

`services/api/fincas.ts:4-11`:
```ts
type FincaPayload = { id:number, nombre:string, vereda:string, municipio:string, departamento:string, extension:string }
```

`services/api/monitoreos.ts:4-13`:
```ts
type MonitoreoPayloadMonitoreo = { id:number, finca_id:number, estado:string }
type MuestraPayload = { id:number, monitoreo_id:number }
```

`app/monitoring/samplingUtils.ts`: `SamplingData{id_monitoring,index_sampling_point,index_photo_in_sampling_point,photo_dir,detection}`, `MIN_CONFIDENCE=0.3` (`constants/config.ts:50`), `computeIncidenceByZone`, `computeHealthPerPoint (0=sin fotos,1=sano,2=enfermo)`.

### 2.3 Payloads que envía hoy el frontend

`services/api/fincas.ts:14-30,35-51`, `services/api/monitoreos.ts:16-54`, `services/sync.ts:59-172`, `constants/config.ts:5-22`:

```ts
// Crear finca
POST /api/fincas/
{ "nombre": data.nombre_finca ?? "", "extension": hectareas:number, "municipio": string, "departamento": string, "vereda"?: string }

// Crear monitoreo (siempre EN_PROGRESO, sin BORRADOR)
POST /api/monitoreos/
{ "finca_id": number, "estado": "EN_PROGRESO" }

// Subir muestra (multipart)
POST /api/monitoreos/<id>/muestras/
FormData {
  foto: {uri: photo_dir, name: `muestra_${punto}_${foto}.jpg`, type:"image/jpeg"},
  punto_indice: String(index_sampling_point),
  foto_indice: String(index_photo_in_sampling_point),
  detecciones: JSON.stringify(detection: ObjectDetectionResult[])
}

// Cerrar
PATCH /api/monitoreos/<id>/ { "estado": "FINALIZADO" }
```

Auth: `services/api/client.ts:28-57,63-133` → `POST /api/auth/devices/register/ {join_code,platform,app_version}` → `SecureStore(device_token)` → `Authorization: Bearer <token>` en todo, reintento 1x en `401`, `API_BASE_URL=https://riceback-backend.onrender.com`, `DEVICE_JOIN_CODE=riceMovil-2026_010101`, timeout 60s.

Sync: `services/sync.ts:33-53,114-172` → solo al arranque con internet, `sincronizarFinca()` luego `sincronizarMonitoreos()`. Si `!autoriza_uso_muestras` solo sube finca. `subirMuestrasDelMonitoreo` **salta** `detection==[]` y borra fila si foto no existe. `break` al primer error.

---

## 3. Estructura real del backend (lo que soporta hoy)

Sin DRF. JSON con `JsonResponse` + `services.py` (escritura) + `selectors.py` (lectura) + builders `_xxx_payload()` en `views.py`.

### 3.1 `apps.farms` — `models.py:7-32`, `views.py:13-23,28-49,53-83`, `services.py:12-44`

```python
class Finca(models.Model):
    nombre = CharField(max_length=200, blank=False)  # "" falla full_clean()
    vereda = CharField(max_length=150, blank=True, default="")
    extension = DecimalField(max_digits=12, decimal_places=4, validators=[MinValueValidator(0)])  # se serializa str()
    owner = FK(User, SET_NULL, null=True, blank=True, related_name="fincas")
    created_at / updated_at
    db_table = "farms_finca"
```

Aceptado en `POST/PUT/PATCH` — `views.py:41,75`:
```python
data = {k:v for k,v in data.items() if k in {"nombre","vereda","extension","owner_id"}}
```
**`municipio/departamento` se descartan silenciosamente.**

Devuelto `_finca_payload`:
```json
{"id":1,"nombre":"...","vereda":"...","extension":"25.5000","owner_id":1,"owner_username":"...","created_at":"...","updated_at":"..."}
```

### 3.2 `apps.monitorings` — `models.py:32-245`, `services.py:44-269`, `views.py:35-96,179-221`

```python
class Monitoreo:
    finca = FK(Finca, CASCADE, related_name="monitoreos")
    codigo = CharField(max_length=50, unique=True, default="MON-<hex8>")
    estado = TextChoices BORRADOR/EN_PROGRESO/FINALIZADO/CANCELADO default BORRADOR
    fecha = DateField default now
    observaciones = TextField blank=True
    # FSM: BORRADOR->{EN_PROGRESO,CANCELADO}, EN_PROGRESO->{FINALIZADO,CANCELADO}, terminales inmutables

class Muestra:
    monitoreo = FK(Monitoreo, CASCADE, related_name="muestras")
    codigo = CharField(max_length=50, default="MUE-<hex8>")  # NO unique
    foto = ImageField(upload_to="muestras/%Y/%m/%d/<uuid>.ext", validators=[validate_image_file 10MB, 8192px, JPEG/PNG/MPO])
    estado = TextChoices PENDIENTE/PROCESADA/ERROR default PENDIENTE
    latitud = Decimal(10,8) null blank [-90,90]
    longitud = Decimal(11,8) null blank [-180,180]
    # NO punto_indice, NO foto_indice, NO ancho_px/alto_px

class Deteccion:
    muestra = FK(Muestra, CASCADE, related_name="detecciones")
    enfermedad = FK(Enfermedad, null blank, PROTECT, related_name="detecciones")
    uuid = UUIDField unique null blank default uuid4 (inmutable en update)
    label = TextChoices PLAGA/ENFERMEDAD/MALEZA/OTRO
    confidence = Float [0,1]
    origin_x/y = Float >=0
    size_x/y = Float >=0
    notas = TextField blank=True
    # NO etiqueta/clase/severidad/posicion/atributos/etiquetas_alternas/frame
    # clean(): ENFERMEDAD exige enfermedad_id, otros lo prohíben
```

`POST /api/monitoreos/<id>/muestras/` — `views.py:195-221` solo lee:
```
foto|imagen (obligatorio), codigo?, estado?, latitud?, longitud?, detecciones?: string-JSON → json.loads → muestra_create(detecciones=list)
```
**`punto_indice/foto_indice` no se leen.** `muestra_create` hace `Deteccion(muestra, **d)` directo + `full_clean()` → espera ya formato backend.

`_muestra_payload` y `_deteccion_payload` (`views.py:62-78,35-59`) no incluyen `punto/foto/ancho/alto/etiqueta/clase`.

### 3.3 `apps.diseases`, `apps.users`, `apps.dashboard`

`diseases/models.py:5-46`: `Enfermedad{codigo UQ, nombre_comun, nombre_cientifico UQ, nombre_cientifico_alterno, cultivo, descripcion, observaciones, activa}`. **Sin `alias[]`.**

`users/models.py`: `User(AbstractUser, email unique, role=INVESTIGADOR) + Device{user OneToOne CASCADE, token_hash CHAR64 UQ, platform, app_version, is_active}`.

`dashboard/views.py + selectors.py`: KPIs `global{total_fincas,monitoreos,muestras,detecciones,extension_total_ha,detecciones_por_hectarea,confianza_promedio}, por_finca[]`. Sin `resumen` por monitoreo con `incidencia_por_punto/salud` de v2.

---

## 4. Matriz detallada de discrepancias

### D1 — Finca: `municipio / departamento` (P0)
- **Frontend envía:** `services/api/fincas.ts:23-28` `{nombre, extension, municipio, departamento, vereda?}`. Local los exige (`sync.ts:68` bloquea sync si faltan `hectareas/departamento/municipio`).
- **Backend hace:** `farms/views.py:41` filtra a `nombre/vereda/extension/owner_id`. Sin error, dato perdido.
- **Prueba:** `POST /api/fincas/ {"nombre":"X","extension":10,"municipio":"Ibagué","departamento":"Tolima"}` → `201` pero `GET /api/fincas/<id>/` no devuelve municipio/departamento.
- **Fix backend:** añadir columnas + whitelist + payload (ver §6).

### D2 — Muestra: `punto_indice / foto_indice` (P0)
- **Frontend envía:** `monitoreos.ts:48-49` como strings multipart.
- **Backend hace:** `monitorings/views.py:199-207` no los lee; `muestra_create` no los acepta; modelo no los tiene.
- **Grep backend:** `punto_indice|foto_indice` → 0 resultados en código.
- **Fix backend:** añadir `punto_indice/foto_indice Integer null` + `UniqueConstraint(monitoreo,punto_indice,foto_indice)` + validación `0<=foto_indice<AGRI_MAX_FOTOS_POR_PUNTO (5)` + aceptar en `POST` y `PATCH`.

### D3 — Muestra: formato `detecciones` (P0, ruptura total)
- **Frontend envía:** `detecciones=JSON.stringify([{frame:{origin:{x,y},size:{x,y}}, labels:[{text,confidence}]}])` (`monitoreos.ts:50`, `ObjectDetection.ts:5-14`).
- **Backend espera:** `[{"label":"ENFERMEDAD","confidence":0.92,"origin_x":120,"origin_y":80,"size_x":45,"size_y":60,"enfermedad_id":2,"notas":"...","uuid":"..."}]` (`services.py:207-241`, `API_FLUJO.md:337-348`).
- **Efecto:** `Deteccion.full_clean()` falla por `label/confidence/origin_x...` requeridos → `400 {"error":...}` y `muestra_create` atómico no guarda ni foto ni detecciones.
- **Fix backend:** implementar traductor v2 (ver §6.3). No pedir al frontend que cambie formato — el formato detector es el correcto para dibujar sin conversión.

### D4 — Detección: `label` enum vs texto libre + `enfermedad_id` (P0)
- **Frontend:** `samplingUtils.ts:70-73` agrupa por `label.text` libre del modelo (`blast`, `leaf_scald`, o JSON-string `{"enfermedad":"blast","severidad":"ALTA","posicion":"hoja"}` según v2 §7).
- **Backend:** `label` solo 4 valores + regla `ENFERMEDAD⇔enfermedad obligatoria` (`models.py:233-238`).
- **Fix backend:** resolver `text/clase → enfermedad_id` por `codigo/alias` normalizado (lower, sin tildes, `_-. ` equivalentes). Si no hay match, guardar con `enfermedad_id=null` (no catalogada) en vez de `400` — así lo pide v2 §7.

### D5 — Campos v2 inexistentes (P0)
Faltan en backend pero documentados en `API_FLUJOv2.md:119-137,319-347,423-451,183-199`:
`Finca.municipio/departamento`, `Muestra.ancho_px/alto_px/punto_indice/foto_indice`, `Deteccion.etiqueta/clase/severidad/posicion/atributos/etiquetas_alternas/frame`, `Enfermedad.alias`, `Dashboard.resumen{incidencia,incidencia_por_punto,salud}`.

### D6 — Muestras sanas nunca subidas (P1)
`sync.ts:155-156` `if (!detection.length) continue`. Backend calculará `incidencia = muestras_con_deteccion/total` sesgada a 1.0. v2 §9 define `incidencia = muestras_con_deteccion/total_muestras` esperando todas las fotos.

### D7 — `nombre=""` (P1)
`fincas.ts:24` `nombre_finca ?? ""`. `Finca.save(): full_clean()` con `blank=False` rechaza `""`. Frontend permite `nombre_finca null` (opcional). Decidir: o hacerlo `blank=True` en backend o validar obligatorio en frontend.

### D8 — Sin georreferencia / sin catálogo (P2)
Backend acepta `latitud/longitud` (`views.py:204-207`) pero frontend nunca los envía. Backend expone `GET /api/enfermedades/` pero frontend no tiene servicio para consultarlo.

---

## 5. Evidencia rápida (archivos y líneas)

**Frontend:**
- `services/api/fincas.ts:14-30` envía `municipio/departamento`
- `services/api/monitoreos.ts:48-50` envía `punto_indice/foto_indice/detecciones frame/labels`
- `services/sync.ts:68,155` exige `hectareas/depto/mun`, salta sanas
- `src/ObjectDetection.ts:5-14` formato detector
- `database/tables/SamplingsTable.ts:30-48` PK compuesta punto/foto
- `.api_context/API_FLUJOv2.md:119-199,317-404,423-479` contrato v2 esperado

**Backend:**
- `apps/farms/models.py:7-24` sin municipio/departamento
- `apps/farms/views.py:41,75` whitelist que los descarta
- `apps/monitorings/models.py:78-148,150-205` sin punto/foto/ancho/alto/etiqueta/clase
- `apps/monitorings/views.py:199-214` no lee punto/foto
- `apps/monitorings/services.py:114-157,207-241` creación directa sin traductor
- `apps/diseases/models.py:5-46` sin alias
- `API_FLUJO.md:117-164,294-365` contrato v1 implementado

---

## 6. Sugerencias para backend (orden de implementación)

### P0.1 — Finca: añadir ubicación
```python
# apps/farms/models.py
municipio = models.CharField(max_length=150, verbose_name="municipio")
departamento = models.CharField(max_length=150, verbose_name="departamento")
```
- Migración + `services.py: finca_create/update` + `views.py` whitelist `{"nombre","vereda","extension","municipio","departamento","owner_id"}` + `_finca_payload` + validación no vacíos.
- Decidir `nombre`: si sigue obligatorio, frontend debe bloquear `""`; si pasa a opcional, `blank=True`.

### P0.2 — Muestra: añadir posición en recorrido + dimensiones
```python
# apps/monitorings/models.py
punto_indice = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
foto_indice = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
ancho_px = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
alto_px = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
class Meta:
    constraints = [models.UniqueConstraint(fields=["monitoreo","punto_indice","foto_indice"], name="uniq_muestra_punto_foto")]
```
- En `muestra_create`: calcular `ancho_px/alto_px` con Pillow al guardar (sin rotar EXIF — es el sistema de coordenadas de las cajas), validar `foto_indice < AGRI_MAX_FOTOS_POR_PUNTO`, exigir `punto+foto` juntos o nulos.
- En `views.py: muestra_list_create_view`: leer `request.POST.get("punto_indice"/"foto_indice")`, aceptar en `PATCH`.

### P0.3 — Detección: traductor formato detector → modelo (el cambio más importante)
No cambiar el contrato del frontend. Aceptar en `detecciones` string-JSON el formato:
```json
[{"frame":{"origin":{"x":120,"y":80},"size":{"x":45,"y":60}},"labels":[{"text":"blast","confidence":0.92}],"uuid":"...","notas":"..."}]
```
Lógica en `services.py`:
1. `labels` no vacío, principal = mayor `confidence`.
2. `text` puede ser plano (`"blast"`) o JSON-string (`"{\"enfermedad\":\"blast\",\"severidad\":\"ALTA\",\"posicion\":\"hoja\"}"`) — parsear ambos, extraer `clase` (`enfermedad|clase|class|label|nombre|disease|name`), `severidad`, `posicion` (claves v2 §7), guardar objeto completo en `atributos`, resto de labels en `etiquetas_alternas`.
3. Normalizar clase (lower, sin tildes, `_ - .` → mismo) y resolver contra `Enfermedad.codigo + alias` activas. Si match → `enfermedad_id`, `label="ENFERMEDAD"`; si no → guardar igual con `enfermedad_id=null`, `clase=<texto>`, `label` mapeado o `OTRO` (no `400`).
4. Mapear `frame.origin/size → origin_x/y/size_x/y` float, validar `0<=confidence<=1`, caja dentro de `ancho_px×alto_px` (`400` si se sale), todo atómico.
5. Añadir columnas `etiqueta TEXT (text crudo), clase TEXT, severidad TEXT, posicion TEXT, atributos JSONB, etiquetas_alternas JSONB` + `frame` property para respuesta.

### P0.4 — Enfermedad: `alias`
```python
alias = models.JSONField(default=list, blank=True)
```
Búsqueda case-insensitive + seed con alias del modelo (`leaf_scald`, `blast`, etc.).

### P1 — Dashboard /payloads
- Devolver en `_finca_payload`: `municipio, departamento`.
- En `_muestra_payload`: `punto_indice, foto_indice, ancho_px, alto_px`.
- En `_deteccion_payload`: `etiqueta, clase, severidad, posicion, atributos, etiquetas_alternas, frame, enfermedad_codigo`.
- Añadir `GET /api/dashboard/monitoreo/<id>/ → {resumen{total_muestras, incidencia, incidencia_por_punto[{punto_indice,total_fotos,fotos_con_deteccion,incidencia,enfermedades,salud}]}}` para no duplicar cálculo en móvil.

### P2 — Reglas y docs
- Actualizar `RiceBack/API_FLUJO.md` a v2 o eliminar divergencia con `ricemobile/.api_context/API_FLUJOv2.md`. Hoy son contradictorios.
- Documentar que `extension` se devuelve como string Decimal, que `foto/imagen` son alias, y rutas reales `/api/monitoreos/muestras/<id>/` (no `/api/muestras/` abreviado).

---

## 7. Contrato propuesto (para que ambos coincidan)

```json
// POST /api/fincas/ → 201
{"nombre":"Finca La Aurora","extension":25.5,"municipio":"Ibagué","departamento":"Tolima","vereda":"El Roble"}

// POST /api/monitoreos/ → 201
{"finca_id":3,"estado":"BORRADOR"}

// POST /api/monitoreos/7/muestras/ multipart → 201
// foto=<jpg>, punto_indice=0, foto_indice=0, latitud=4.7110, longitud=-74.0721,
// detecciones='[{"frame":{"origin":{"x":120,"y":80},"size":{"x":45,"y":60}},"labels":[{"text":"blast","confidence":0.92}]}]'
```

---

## 8. Plan de verificación sugerido (backend)

1. `pytest` migraciones + `full_clean` (`nombre=""` falla, `municipio/departamento` obligatorios).
2. `POST /api/fincas/` con municipio/departamento → `GET` los devuelve.
3. `POST /api/monitoreos/` BORRADOR→EN_PROGRESO→FINALIZADO FSM + inmutabilidad terminal.
4. `POST muestras/` con formato detector real (copiar un `detection_json` de `samplings` local) → `201` con `detecciones[]` parseadas, `ancho_px/alto_px` calculados.
5. `POST muestras/` con caja fuera de imagen → `400` y nada guardado.
6. `POST muestras/` con clase no catalogada → `201` con `enfermedad_id:null, catalogada:false`.
7. Unicidad `(monitoreo,punto,foto)` → segundo `POST` igual → `400`.
8. Subir mezcla sanas + enfermas → `GET /api/dashboard/monitoreo/<id>/ resumen.incidencia` < 1.0.

---

## 9. Notas para frontend (informativo, no hacer en backend)

- Quitar `if (!detection.length) continue` en `sync.ts:155` para subir sanas.
- Añadir `expo-location` para `latitud/longitud`.
- Validar `nombre` no vacío antes de crear finca si backend lo mantiene obligatorio.
- Consumir `GET /api/enfermedades/` para mostrar `nombre_comun` en vez de `text` crudo.
- `sync` hoy solo al arranque + `break` al primer error → cola con reintento.

---
*Generado por análisis estático de ambos repos. Sin cambios de código aplicados.*
