import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import perfilRoutes from './routes/perfil.routes';
import inventarioRoutes from './routes/inventario.routes';
import tareasRoutes from './routes/tareas.routes';
import gamificacionRoutes from './routes/gamificacion.routes';
import geoRoutes from './routes/geo.routes';

const app = express();

// ============================================================
// FIX CRÍTICO (nos costó varias horas de diagnóstico esta
// semana): este middleware va ANTES que cualquier otro, incluso
// antes que cors(). Responde el preflight OPTIONS de inmediato
// con `return`, sin dejar que la petición siga hacia
// authMiddleware ni hacia el proxy — porque Express 5 (y en la
// práctica también versiones de Express 4 mal ordenadas) no
// siempre corta la cadena de middleware después de un OPTIONS,
// y si el preflight llega a tocar authMiddleware (que exige un
// JWT que el navegador nunca manda en un preflight), termina en
// un error que el navegador reporta como "CORS bloqueado" aunque
// el problema real sea otro.
// ============================================================
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.sendStatus(204);
    return;
  }
  next();
});

// cors() se deja también para las peticiones normales (no-OPTIONS),
// que sí necesitan los headers de CORS en la respuesta real.
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }),
);

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/perfil', perfilRoutes);
app.use('/inventario', inventarioRoutes);
app.use('/tareas', tareasRoutes);
app.use('/gamificacion', gamificacionRoutes);
app.use('/xp', gamificacionRoutes);
app.use('/robot', gamificacionRoutes);
app.use('/geo', geoRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    servicios: {
      user: process.env.USER_SERVICE_URL,
      task: process.env.TASK_SERVICE_URL,
      gamification: process.env.GAMIFICATION_SERVICE_URL,
      geo: process.env.GEO_SERVICE_URL,
    },
  });
});

// IMPORTANTE: process.env.PORT (nunca un número fijo), y sin
// especificar host (equivale a escuchar en 0.0.0.0, nunca
// 'localhost') — de lo contrario Railway u otro proveedor de
// contenedores no puede conectarse aunque el contenedor arranque
// perfecto.
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`api-gateway corriendo en puerto ${PORT}`);
});
