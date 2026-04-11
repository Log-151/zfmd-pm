import { WeatherService } from './weatherService';
export interface WeatherServiceAlert {
  service: WeatherService;
  alertLevel: string;
  daysUntilExpiry?: number | null;
  overdueMonths?: string | null;
}
