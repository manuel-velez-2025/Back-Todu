# Todú — Backend (v2, reconstruido desde cero)

Arquitectura de microservicios con gateway, reducida de 6 a 5 piezas
desplegadas (se fusionó `robot-service` dentro de `gamification-service`,
ya que se llamaban entre sí en cada evento — ahora es una llamada de
función interna, no una petición HTTP que pueda fallar por red).

```
Cliente (Next.js)
      │
      ▼
 api-gateway (puerto 3000)
      │
      ├── user-service (3001)         → db-users
      ├── task-service (3002)         → db-tasks
      ├── gamification-service (3003) → db-gamification  (incluye avatar/robot)
      └── geo-service (3005)          → sin BD propia, llama a Google Places
```

## Cómo levantarlo localmente

```bash
docker compose up --build
```

Esto levanta los 5 servicios + 3 bases de datos de Postgres, y corre
las migraciones de `migrations/001_init.sql` de cada servicio
automáticamente al crear cada base de datos por primera vez.

El gateway queda disponible en `http://localhost:3000` — mismo
contrato de API que ya conoce el frontend (mismos endpoints, mismos
nombres de campos).

## Variables de entorno opcionales

Crea un archivo `.env` en la raíz (junto a `docker-compose.yml`) si
quieres usar las integraciones externas:

```env
JWT_SECRET=algo-largo-y-aleatorio
ANTHROPIC_API_KEY=sk-ant-...      # para validar evidencia con IA y generar tips de lugares
GOOGLE_PLACES_API_KEY=...          # para /geo/cercanos con datos reales
```

Si no las configuras, el sistema sigue funcionando:
- Sin `ANTHROPIC_API_KEY`: la evidencia se aprueba automáticamente
  (marcado explícitamente como "sin validar con IA" en la respuesta),
  y el "tip" de cada lugar viene como `null` (el frontend ya sabe usar
  un tip genérico de respaldo en ese caso).
- Sin `GOOGLE_PLACES_API_KEY`: `/geo/cercanos` responde 503 explicando
  que falta la llave — no inventa datos falsos.

## Requisitos de Bases de Datos Avanzadas — dónde están

| Requisito | Dónde |
|---|---|
| 2 consultas con variantes de JOIN | `vista_inventario_usuario` (LEFT JOIN, en `user-service/migrations`) y `vista_tareas_con_evidencia` (INNER JOIN, en `task-service/migrations`) |
| 2 vistas | Las mismas dos de arriba |
| 2 índices en 2 tablas distintas | `idx_usuarios_email` y `idx_inventario_usuario_id` (ambos en `user-service/migrations`) |
| 2 funciones | `es_mayor_de_edad()` (user-service) y `calcular_nivel()` (gamification-service) |
| 2 procedimientos almacenados | `registrar_usuario()` (user-service) y `sumar_xp_atomico()` (gamification-service, con `SELECT ... FOR UPDATE`) |
| Usuario dueño de la BD (no root) + 2 roles | `rol_app_todu` (lectura/escritura) y `rol_reportes_todu` (solo lectura), creados en cada migración |

**Antes de la demo:** cambia la contraseña `CAMBIAR_EN_PRODUCCION` de
los roles en los 3 archivos `migrations/001_init.sql` por algo real.

## Desplegar a Railway

1. Usa la **red privada de Railway** entre servicios
   (`servicio.railway.internal`) en vez de URLs públicas con sufijo
   aleatorio — evita el problema de sufijos que ya vivimos.
2. Confirma que cada servicio escuche en `process.env.PORT` (ya
   está así en el código) y sin especificar host (ya equivale a
   `0.0.0.0`).
3. Prueba primero con `docker compose up` en local — si responde
   bien ahí, cualquier falla en Railway después es de la plataforma,
   no del código.

## Lo que NO se rehízo (y por qué)

El almacenamiento de fotos de evidencia (`task-service`) guarda los
archivos en disco local del contenedor por simplicidad — funciona
perfecto para la demo, pero se pierde si el contenedor se
redespliega. Si se necesita persistencia real, se reemplaza
`infrastructure/http/upload.ts` por un adaptador a S3/Cloudinary sin
tocar el resto del código (la interfaz de `taskService.submitEvidence`
no cambia).
