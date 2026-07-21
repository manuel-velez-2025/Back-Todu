# Todú — Backend

Backend de **Todú**, una app gamificada de tareas y tareas fijas diarias con
economía de XP/Coins, minijuegos, tienda de personalización y
recomendaciones de lugares. Arquitectura de microservicios con un gateway
único como puerta de entrada.

```
Cliente (Next.js)
      │
      ▼
 api-gateway (puerto 3000)
      │
      ├── /auth, /perfil, /inventario  → user-service (3001)         → schema users
      ├── /tareas                      → task-service (3002)         → schema tasks
      ├── /gamificacion, /xp, /robot,
      │   /juegos, /tienda             → gamification-service (3003) → schema gamification
      └── /geo                         → geo-service (3005)          → schema geo (cache) + Google Places
```

`robot-service` fue fusionado dentro de `gamification-service` desde el
diseño original (evolución del robot y XP se calculan juntos, sin una
llamada HTTP extra que pueda fallar por red).

## Funcionalidades

**Cuentas y perfil** — registro/login con bcrypt, login con Google,
edición de perfil, periodo de prueba de 20 días.

**Tareas** — CRUD completo, dificultad (easy/medium/hard), evidencia con
foto validada por IA (Claude Vision) y almacenada en Cloudinary,
**tareas fijas** que se repiten cada día (se reinician automáticamente a
medianoche), y tareas vinculadas a un lugar de Todú Places.

**Economía de XP/Coins** — el XP tiene dos contadores: uno histórico
(`xp_total`, de donde sale el nivel — nunca baja) y uno gastable
(`xp_disponible`, la "cartera" con la que se apuesta y se compra).
Completar una tarea paga XP con un **multiplicador de racha**
(hasta ×2 con racha de 10+ días). Dejar más de 3 tareas incumplidas
seguidas (vencidas o fijas sin hacer) rompe la racha a 0; completar
cualquier tarea la restablece.

**Robot con emociones** — reacciona a eventos (tarea completada, subida
de nivel, racha, tarea vencida, resultado de juegos) con expresiones y
accesorios equipables.

**Arcade** (nivel 3+) — **Farkle**: apuestas de XP con cobro inmediato,
premio de 2× al ganar, una sola partida en curso por usuario (candado a
nivel de base de datos). **Memorama**: recompensa fija de XP con tope
diario, pensado como fuente "gratuita" de XP sin afectar el nivel.

**Tiendas** — accesorios cosméticos del robot (ninja, mago, pirata...) y
decoraciones para el cuarto de Todú (trofeos, mascotas, pared, piso,
ambiente...), ambas compradas con la cartera de XP mediante compra
transaccional (nunca se pierde XP sin recibir el artículo).

**Todú Places** (nivel 2+) — recomendaciones de lugares cercanos vía
Google Places, con un tip generado por IA por cada lugar (cacheado en
base de datos), y la opción de agregar el lugar directo como tarea.

**Notificaciones push** — aviso cuando una tarea está por vencer
(Web Push con llaves VAPID).

## Endpoints principales (vía api-gateway)

| Ruta | Servicio | Notas |
|---|---|---|
| `/auth/*` | user-service | Registro, login, login con Google |
| `/perfil/*` | user-service | Requiere sesión |
| `/inventario/*` | user-service | Accesorios del robot + tienda de accesorios |
| `/tareas/*` | task-service | CRUD, completar, evidencia, notificaciones push |
| `/gamificacion/*`, `/xp/*`, `/robot/*` | gamification-service | Progreso, XP, avatar |
| `/juegos/*` | gamification-service | Farkle y memorama — **requiere nivel 3** |
| `/tienda/*` | gamification-service | Decoraciones del cuarto |
| `/geo/*` | geo-service | Todú Places — **requiere nivel 2** |

Todas las rutas salvo `/auth` requieren `Authorization: Bearer <token>`.
El nivel mínimo se valida en el gateway (`checkLevel`), consultando el
nivel real del usuario contra `gamification-service` antes de dejar
pasar la petición.

## Cómo levantarlo en local

```bash
docker compose up --build
```

Levanta los 5 servicios + sus bases de datos de Postgres, corriendo las
migraciones de cada `migrations/001_init.sql` la primera vez. El gateway
queda en `http://localhost:3000`.

## Variables de entorno

Cada servicio necesita su propio `.env` (o las variables configuradas en
la plataforma de despliegue). Ninguna se comparte en este repositorio;
esta es solo la lista de **nombres** que se deben configurar:

**Todos los servicios**
- `DATABASE_URL` — cadena de conexión a Postgres
- `JWT_SECRET` — compartido entre todos los servicios (para validar
  tokens y para las llamadas internas servicio-a-servicio)

**api-gateway**
- `USER_SERVICE_URL`, `TASK_SERVICE_URL`, `GAMIFICATION_SERVICE_URL`,
  `GEO_SERVICE_URL`

**task-service**
- `GAMIFICATION_SERVICE_URL` — para notificar XP al completar tareas
- `CLOUDINARY_URL` (o las 3 variables de Cloudinary por separado) —
  almacenamiento de evidencias
- `ANTHROPIC_API_KEY` — validación de evidencia con IA (opcional: sin
  ella, la evidencia se aprueba automática y queda marcada como "sin
  validar con IA")
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — notificaciones
  push (opcional: sin ellas, las notificaciones simplemente no se envían,
  sin errores)

**geo-service**
- `GOOGLE_PLACES_API_KEY` (opcional: sin ella, `/geo/cercanos` responde
  503 explicando que falta la llave — nunca inventa datos)
- `ANTHROPIC_API_KEY` — tips de lugares generados por IA

**user-service**
- `GAMIFICATION_SERVICE_URL` — para cobrar XP al comprar accesorios
- Credenciales de Google Sign-In, si se usa

## Requisitos de Bases de Datos Avanzadas — dónde están

| Requisito | Dónde |
|---|---|
| Vistas con JOIN | `vista_inventario_usuario` (LEFT JOIN, user-service), `vista_tareas_con_evidencia` (INNER JOIN, task-service), `vista_progreso_nivel` (gamification-service) |
| Índices | `idx_usuarios_email`, `idx_inventario_usuario_id` (user-service); `idx_tareas_tipo_estado` (task-service); `idx_farkle_una_en_curso` — índice único parcial (gamification-service) |
| Funciones | `es_mayor_de_edad()` (user-service), `calcular_nivel()` (gamification-service) |
| Procedimientos almacenados | `registrar_usuario()` (user-service); `sumar_xp_atomico()`, `gastar_xp_atomico()`, `acreditar_xp_disponible()`, `registrar_incumplimientos()` (gamification-service) — todos usan `FOR UPDATE` para evitar condiciones de carrera |
| Transacciones multi-tabla | Compra de items (agregar + cobrar con compensación si falla el cobro), apuestas de Farkle (descontar + crear partida en una sola transacción) |
| Roles de base de datos | `rol_app_todu` (lectura/escritura de la aplicación) y `rol_reportes_todu` (solo lectura, para reportes), definidos por servicio — nunca se usa el rol dueño de la base para la app |

## Stack tecnológico

Node.js + Express + TypeScript en los 5 servicios, PostgreSQL (alojado en
Supabase), Zod para validación, JWT para autenticación, Docker Compose
para desarrollo local, despliegue en Railway con red privada entre
servicios.

## Notas y limitaciones conocidas

- El resultado reportado al cerrar una partida de Farkle lo decide el
  cliente; el servidor confía en ese reporte al resolver la apuesta.
  Eliminar esa confianza requeriría mover la lógica del juego al
  servidor — documentado como mejora futura.
- El almacenamiento de evidencias usa Cloudinary; si se cambia de
  proveedor, solo se reemplaza el adaptador en
  `task-service/infrastructure/http/upload.ts` sin tocar el resto del
  código.