import express from 'express';
import cors from 'cors';
import { GooglePlacesAdapter } from './infrastructure/external/GooglePlacesAdapter';
import { ClaudeTipAdapter } from './infrastructure/external/ClaudeTipAdapter';
import { PlaceSummaryRepository } from './infrastructure/repositories/PlaceSummaryRepository';
import { GeoService } from './application/geoService';
import { createGeoController } from './infrastructure/http/controllers';
import { authMiddleware } from './infrastructure/http/authMiddleware';
import { GamificationClient } from './infrastructure/http/GamificationClient';

const app = express();
app.use(cors());
app.use(express.json());

const placesApi = new GooglePlacesAdapter();
const tipGenerator = new ClaudeTipAdapter();
const placeSummaryRepo = new PlaceSummaryRepository();
const service = new GeoService(placesApi, tipGenerator, placeSummaryRepo);
const gamificationClient = new GamificationClient();
const controller = createGeoController(service, gamificationClient);

app.get('/geo/cercanos', authMiddleware, controller.cercanos);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'geo-service' }));

const PORT = Number(process.env.PORT) || 3005;
app.listen(PORT, () => {
  console.log(`geo-service corriendo en puerto ${PORT}`);
});
