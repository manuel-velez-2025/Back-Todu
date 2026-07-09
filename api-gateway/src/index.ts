import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import perfilRoutes from './routes/perfil.routes';
import inventarioRoutes from './routes/inventario.routes';
import tareasRoutes from './routes/tareas.routes';
import gamificacionRoutes from './routes/gamificacion.routes';
import geoRoutes from './routes/geo.routes';

const app = express();

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

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`api-gateway corriendo en puerto ${PORT}`);
});
