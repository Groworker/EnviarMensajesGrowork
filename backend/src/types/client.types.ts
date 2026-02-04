/**
 * Type definitions for Client entity
 */

export interface CountryInterest {
  country: string;
  code: string;
}

export interface CityInterest {
  city: string;
  country: string;
}

export interface MatchingCriteria {
  // Legacy fields - mantener por compatibilidad
  countries?: string[];
  cities?: string[];
  keywords?: string[];
  excludeKeywords?: string[];
  industries?: string[];
  strictMode?: boolean;

  // Nuevos campos de configuración
  matchMode?: 'all' | 'any';
  jobTitleMatchMode?: 'exact' | 'contains' | 'none';
  enabledFilters?: string[];
}
