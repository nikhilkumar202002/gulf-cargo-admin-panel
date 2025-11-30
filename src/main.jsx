import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { store } from "./store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 1. Import

import "@fontsource/inter";
import "@fontsource/inter/400.css";
import "@fontsource/inter/400-italic.css";
import "./index.css";

// 2. Create Client with "Stale Time"
// This tells React: "Don't refetch data for 5 minutes, use the cache."
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (Data stays fresh)
      cacheTime: 1000 * 60 * 30, // 30 minutes (Keep in memory)
      refetchOnWindowFocus: false, // Don't refetch when clicking tabs
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* 3. Wrap App */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);