import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = 'https://api.gulfcargoksa.com/public/api';

// adapt endpoints to your real ones; handle 404s gracefully
export const fetchCounters = createAsyncThunk(
  'dashboard/fetchCounters',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [staff] = await Promise.all([
        axios.get(`${API}/count-staff`, { headers }).catch(() => ({ data: { count: 0 } })),
        // add more calls in Promise.all when you have them
      ]);
      return {
        staff: staff?.data?.count ?? 0,
      };
    } catch (e) {
      return rejectWithValue(e?.response?.data || e.message);
    }
  }
);

const slice = createSlice({
  name: 'dashboard',
  initialState: {
    counters: { staff: 0 },
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCounters.pending, (s) => {
      s.status = 'loading';
      s.error = null;
    });
    b.addCase(fetchCounters.fulfilled, (s, { payload }) => {
      s.status = 'succeeded';
      s.counters = payload;
    });
    b.addCase(fetchCounters.rejected, (s, { payload }) => {
      s.status = 'failed';
      s.error = payload || 'Failed to fetch counters';
    });
  },
});

export default slice.reducer;
