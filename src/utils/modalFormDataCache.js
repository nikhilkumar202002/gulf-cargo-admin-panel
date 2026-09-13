import {
  getCountries as fetchCountries,
  getDistrictsByState as fetchDistrictsByState,
  getDocumentTypes as fetchDocumentTypes,
  getPhoneCodes as fetchPhoneCodes,
  getStatesByCountry as fetchStatesByCountry,
} from "../services/coreService";

const TTL = 24 * 60 * 60 * 1000;
const pending = new Map();
const memoryCache = new Map();

const getCached = (key) => {
  const inMemory = memoryCache.get(key);
  if (inMemory && Date.now() - inMemory.timestamp < TTL) return inMemory.data;
  memoryCache.delete(key);

  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (value && Date.now() - value.timestamp < TTL) {
      memoryCache.set(key, value);
      return value.data;
    }
  } catch {
    // Browser storage may be unavailable; the request can still proceed.
  }
  return null;
};

const remember = (key, request, persist = true) => {
  const cached = getCached(key);
  if (cached) return Promise.resolve(cached);
  if (pending.has(key)) return pending.get(key);

  const promise = request()
    .then((data) => {
      const value = { timestamp: Date.now(), data };
      memoryCache.set(key, value);
      if (persist) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // A full or disabled storage area must not turn a successful fetch into an error.
        }
      }
      return data;
    })
    .finally(() => pending.delete(key));

  pending.set(key, promise);
  return promise;
};

export const getModalDocumentTypes = () =>
  remember("modal_document_types", () =>
    fetchDocumentTypes({ status: 1, per_page: 100 }, { timeout: 5000 })
  );

export const getModalPhoneCodes = () =>
  remember("modal_phone_codes", () =>
    fetchPhoneCodes({ status: 1, per_page: 300 }, { timeout: 5000 })
  );

export const getModalCountries = () =>
  remember("modal_countries", () =>
    fetchCountries({ status: 1, per_page: 300 }, { timeout: 5000 })
  );

export const getModalStates = (countryId) =>
  remember(`modal_states_${countryId}`, () =>
    fetchStatesByCountry(
      countryId,
      { per_page: 100 }
    ),
    false
  );

export const getModalDistricts = (stateId) =>
  remember(`modal_districts_${stateId}`, () =>
    fetchDistrictsByState(stateId),
    false
  );
