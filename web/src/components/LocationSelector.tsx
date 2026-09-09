'use client';

import React, { useState, useMemo } from 'react';
import {
  CITY_NAMES,
  getDistrictsByCity,
  getNeighborhoodsByCityAndDistrict,
} from '@/constants/locations';
import { ChevronDown, MapPin, Navigation } from 'lucide-react';

interface LocationSelectorProps {
  city: string;
  district: string;
  neighborhood: string;
  addressDetails: string;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
  onNeighborhoodChange: (neighborhood: string) => void;
  onAddressDetailsChange: (details: string) => void;
  onGetLocation: () => void;
  isLocating: boolean;
  hasCoords: boolean;
  locationMessage?: string;
}

export default function LocationSelector({
  city,
  district,
  neighborhood,
  addressDetails,
  onCityChange,
  onDistrictChange,
  onNeighborhoodChange,
  onAddressDetailsChange,
  onGetLocation,
  isLocating,
  hasCoords,
  locationMessage,
}: LocationSelectorProps) {
  // Available districts for selected city
  const districts = useMemo(() => {
    if (!city) return [];
    return getDistrictsByCity(city);
  }, [city]);

  // Available neighborhoods for selected city & district
  const neighborhoods = useMemo(() => {
    if (!city || !district) return [];
    return getNeighborhoodsByCityAndDistrict(city, district);
  }, [city, district]);

  const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    onCityChange(newCity);
    onDistrictChange('');
    onNeighborhoodChange('');
  };

  const handleDistrictSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrict = e.target.value;
    onDistrictChange(newDistrict);
    onNeighborhoodChange('');
  };

  const handleNeighborhoodSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onNeighborhoodChange(e.target.value);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
          <MapPin className="h-4 w-4 text-teal-600" aria-hidden="true" />
          Hizmet Konumu
        </div>
        <button
          type="button"
          onClick={onGetLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-100/70 px-3 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-100 disabled:opacity-60 cursor-pointer"
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          {isLocating
            ? 'Konum alınıyor…'
            : hasCoords
            ? 'Konumu yenile'
            : 'Yaklaşık konumumu al'}
        </button>
      </div>

      {locationMessage && (
        <p className="text-xs leading-relaxed text-slate-600" role="status">
          {locationMessage}
        </p>
      )}

      {/* İl ve İlçe Seçimi */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="city-select" className="mb-1 block text-xs font-semibold text-slate-700">
            İl <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="city-select"
              required
              value={city}
              onChange={handleCitySelect}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 outline-hidden transition focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">İl Seçiniz</option>
              {CITY_NAMES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div>
          <label htmlFor="district-select" className="mb-1 block text-xs font-semibold text-slate-700">
            İlçe <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="district-select"
              required
              disabled={!city}
              value={district}
              onChange={handleDistrictSelect}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 outline-hidden transition focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="">
                {!city ? 'Önce İl Seçin' : 'İlçe Seçiniz'}
              </option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Mahalle Seçimi */}
      <div>
        <label htmlFor="neighborhood-select" className="mb-1 block text-xs font-semibold text-slate-700">
          Mahalle <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <select
            id="neighborhood-select"
            required
            disabled={!district || neighborhoods.length === 0}
            value={neighborhood}
            onChange={handleNeighborhoodSelect}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 outline-hidden transition focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <option value="">
              {!district
                ? 'Önce İlçe Seçin'
                : neighborhoods.length === 0
                ? 'Bu ilçede kayıtlı mahalle bulunamadı'
                : 'Mahalle Seçiniz'}
            </option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Adres Detayı (İsteğe bağlı) */}
      <div>
        <label htmlFor="address-details" className="mb-1 block text-xs font-semibold text-slate-700">
          Adres Detayı <span className="font-normal text-slate-500">(Cadde, sokak, bina no, yön tarifi)</span>
        </label>
        <input
          id="address-details"
          maxLength={250}
          autoComplete="street-address"
          value={addressDetails}
          onChange={(e) => onAddressDetailsChange(e.target.value)}
          placeholder="Örn. Atatürk Caddesi No:14 Daire:5"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-hidden transition focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
        />
      </div>
    </div>
  );
}
