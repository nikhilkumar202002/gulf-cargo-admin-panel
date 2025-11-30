import axiosInstance from "./axiosInstance";

// Create a new delivery type
export const createDeliveryType = async (deliveryTypeData) => {
  try {
    const response = await axiosInstance.post('/delivery-type', deliveryTypeData);
    return response.data;
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : error.message);
  }
};

// Fetch all delivery types
export const getAllDeliveryTypes = async () => {
  try {
    const response = await axiosInstance.get('/delivery-types');
    return response.data;
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : error.message);
  }
};

// Fetch active delivery types
export const getActiveDeliveryTypes = async () => {
  try {
    const response = await axiosInstance.get('/delivery-types?status=1');
    return response.data;
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : error.message);
  }
};

// Fetch inactive delivery types
export const getInactiveDeliveryTypes = async () => {
  try {
    const response = await axiosInstance.get('/delivery-types?status=0');
    return response.data;
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : error.message);
  }
};
