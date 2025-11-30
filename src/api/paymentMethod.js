import axiosInstance from "./axiosInstance";

// POST: Create a new payment method
export const createPaymentMethod = async (data) => {
  try {
    const response = await axiosInstance.post("/payment-method", data); // Base URL is already handled in axiosInstance
    return response.data; // Return the response data from API
  } catch (error) {
    throw error; 
  }
};

// GET: Get all payment methods
export const getAllPaymentMethods = async () => {
  try {
    const response = await axiosInstance.get("/payment-methods");
    return response.data; // Return the response data from API
  } catch (error) {
    throw error;
  }
};

// GET: Get active payment methods (status = 1)
export const getActivePaymentMethods = async () => {
  try {
    const response = await axiosInstance.get("/payment-methods?status=1");
    return response.data; // Return the response data from API
  } catch (error) {
    throw error;
  }
};

// GET: Get inactive payment methods (status = 0)
export const getInactivePaymentMethods = async () => {
  try {
    const response = await axiosInstance.get("/payment-methods?status=0");
    return response.data; // Return the response data from API
  } catch (error) {
    throw error;
  }
};
