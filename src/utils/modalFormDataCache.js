import {
  getCountries as fetchCountries,
  getDistrictsByState as fetchDistrictsByState,
  getDocumentTypes as fetchDocumentTypes,
  getPhoneCodes as fetchPhoneCodes,
  getStatesByCountry as fetchStatesByCountry,
} from "../services/coreService";

const TTL = 24 * 60 * 60 * 1000;
const pending = new Map();

const getCached = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && Date.now() - value.timestamp < TTL ? value.data : null;
  } catch {
    return null;
  }
};

const remember = (key, request) => {
  const cached = getCached(key);
  if (cached) return Promise.resolve(cached);
  if (pending.has(key)) return pending.get(key);

  const promise = request()
    .then((data) => {
      localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
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
    )
  );

export const getModalDistricts = (stateId) =>
  remember(`modal_districts_${stateId}`, () =>
    fetchDistrictsByState(stateId)
  );
