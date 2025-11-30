import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import dashboard from './slices/dashboardSlice'; // example, below
import branchReducer from "./slices/branchSlice";


export const store = configureStore({
  reducer: {
    auth,
    dashboard,
    branch: branchReducer,
  },
  middleware: (getDefault) => getDefault({
    serializableCheck: false, // you’re storing tokens/axios errors; skip noise
  }),
});

export const selectAuth = (state) => state.auth;
export const selectDashboard = (state) => state.dashboard;
