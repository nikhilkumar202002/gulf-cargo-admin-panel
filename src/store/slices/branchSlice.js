import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  branchId: null,
  branchName: "",
};

const branchSlice = createSlice({
  name: "branch",
  initialState,
  reducers: {
    setBranch(state, { payload }) {
      state.branchId = payload?.branchId ?? null;
      state.branchName = payload?.branchName ?? "";
    },
    clearBranch(state) {
      state.branchId = null;
      state.branchName = "";
    },
  },
});

export const { setBranch, clearBranch } = branchSlice.actions;
export default branchSlice.reducer;
