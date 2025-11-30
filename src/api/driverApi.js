import axiosInstance from "./axiosInstance";

// POST /driver - Create a new driver
export const createDriver = async (driverData) => {
  try {
    const isFD = typeof FormData !== "undefined" && driverData instanceof FormData;
    const { data } = await axiosInstance.post("/driver", driverData, {
      headers: isFD ? {} : { "Content-Type": "application/json", Accept: "application/json" },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

// GET /drivers - Fetch all drivers
export const getAllDrivers = async () => {
  try {
    const { data } = await axiosInstance.get('/drivers');
    return data;  // Return the response data
  } catch (error) {
    throw error;  // Propagate error for handling in component
  }
};

// GET /drivers?status=1 - Fetch active drivers
export const getActiveDrivers = async () => {
  try {
    const { data } = await axiosInstance.get('/drivers?status=1');
    return data;  // Return the response data
  } catch (error) {
    throw error;  // Propagate error for handling in component
  }
};

// GET /drivers?status=0 - Fetch inactive drivers
export const getInactiveDrivers = async () => {
  try {
    const { data } = await axiosInstance.get('/drivers?status=0');
    return data;  // Return the response data
  } catch (error) {
    throw error;  // Propagate error for handling in component
  }
};
