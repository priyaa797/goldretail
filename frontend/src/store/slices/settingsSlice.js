import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mode: localStorage.getItem('themeMode') || 'light', // 'light' | 'dark'
  colorVariant: localStorage.getItem('themeColor') || 'blue', // 'blue' | 'pink' | 'orange' | 'purple'
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setThemeMode: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem('themeMode', action.payload);
    },
    setThemeColor: (state, action) => {
      state.colorVariant = action.payload;
      localStorage.setItem('themeColor', action.payload);
    },
  },
});

export const { setThemeMode, setThemeColor } = settingsSlice.actions;
export default settingsSlice.reducer;
