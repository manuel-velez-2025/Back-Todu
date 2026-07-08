import express from 'express';
import cors from 'cors';
import { GooglePlacesAdapter } from './infrastructure/external/googlePlacesAdapter';
import { ClaudeTipAdapter } from './infrastructure/external/claudeTipAdapter';
import { GeoService } from './application/geoService';
import { createGeoController } from './infrastructure/http/controllers';
import { authMiddleware } from './infrastructure/http/authMiddleware';

const app = express();
app.use(cors());
app.use(express.json());

const service = new GeoService(new GooglePlacesAdapter(), new ClaudeTipAdapter());
const controller = createGeoController(service);

app.get('/geo/cercanos', authMiddleware, controller.cercanos);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'geo-service' }));

const PORT = Number(process.env.PORT) || 3005;
app.listen(PORT, () => {
  console.log(`geo-service corriendo en puerto ${PORT}`);
});
