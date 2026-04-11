export interface UpdateWeatherServiceBody {
  contractSalesManager?: string | null;
  salesManager?: string | null;
  province?: string | null;
  group?: string | null;
  station?: string | null;
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
