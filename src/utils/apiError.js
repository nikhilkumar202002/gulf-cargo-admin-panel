const STATUS_MESSAGES = {
  400: "The request could not be completed. Please check the entered information.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested record could not be found.",
  409: "This record conflicts with an existing change.",
  422: "Please correct the highlighted fields.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "The server encountered a problem. Please try again.",
  503: "The service is temporarily unavailable. Please try again shortly.",
};

const NETWORK_MESSAGE = "Unable to reach the server. Check your connection and try again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

const isTechnicalMessage = (value) => {
  const text = String(value || "").trim();
  if (!text) return true;

  return /sqlstate|sql syntax|stack trace|\btraceback\b|exception|axioserror|request failed with status code|node_modules|\/var\/|\\src\\|at\s+\w+\s*\(/i.test(text);
};

const safeMessage = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const text = String(value).trim();
  return isTechnicalMessage(text) ? "" : text;
};

const isGenericHttpMessage = (value) =>
  /^(bad request|unauthorized|forbidden|not found|conflict|unprocessable entity|too many requests|internal server error|service unavailable)$/i.test(value);

const normalizeFieldErrors = (errors) => {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};

  return Object.entries(errors).reduce((result, [field, messages]) => {
    const values = Array.isArray(messages) ? messages : [messages];
    const safeValues = values
      .map((message) => safeMessage(message))
      .filter(Boolean);
    if (safeValues.length) result[field] = safeValues;
    return result;
  }, {});
};

export const getApiError = (error) => {
  try {
    const responseData = error?.response?.data;
    const status = Number(error?.response?.status || responseData?.status) || null;
    const fieldErrors = normalizeFieldErrors(responseData?.errors);
    const backendMessage = [responseData?.message, responseData?.error]
      .map(safeMessage)
      .find((message) => message && !isGenericHttpMessage(message)) || "";
    const hasNetworkFailure = !error?.response && (
      error?.code === "ECONNABORTED" ||
      error?.code === "ETIMEDOUT" ||
      error?.code === "ERR_NETWORK" ||
      error?.message === "Network Error"
    );
    const isNetworkError = Boolean(hasNetworkFailure);
    const retryable = isNetworkError || status === 429 || status === 500 || status === 503;

    let message = backendMessage;
    if (!message && Object.keys(fieldErrors).length && status === 422) {
      message = STATUS_MESSAGES[422];
    }
    if (!message && status && STATUS_MESSAGES[status]) message = STATUS_MESSAGES[status];
    if (!message && isNetworkError) message = NETWORK_MESSAGE;
    if (!message) message = GENERIC_MESSAGE;

    return { status, message, fieldErrors, retryable, isNetworkError };
  } catch {
    return {
      status: null,
      message: GENERIC_MESSAGE,
      fieldErrors: {},
      retryable: false,
      isNetworkError: false,
    };
  }
};

export default getApiError;
