export interface CreateWeatherServiceBody {
  contractSalesManager: string;
  salesManager?: string | null;
  province: string;
  group: string;
  station: string;
  stationType?: string | null;
  forecastStartDate?: string | null;
  officialForecastDate?: string | null;
  serviceEndDate?: string | null;
  overdueMonths?: string | null;
  isOverdue?: string | null;
  estimatedContractAmount?: number | null;
  estimatedContractDate?: string | null;
  renewalNotes?: string | null;
  notes?: string | null;
}
