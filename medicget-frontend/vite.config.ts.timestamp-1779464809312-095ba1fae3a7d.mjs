// vite.config.ts
import { defineConfig } from "file:///sessions/awesome-loving-darwin/mnt/medicget-frontend/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/awesome-loving-darwin/mnt/medicget-frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "node:path";
var __vite_injected_original_dirname = "/sessions/awesome-loving-darwin/mnt/medicget-frontend";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 5173,
    // Headers HTTP enviados con cada respuesta del dev server.
    // PayPhone Cajita exige `Referrer-Policy: origin` (o
    // `origin-when-cross-origin`) para verificar la identidad del
    // sitio al cargar el modal — sin esto su validación falla
    // silenciosamente y el modal no renderiza. La meta tag del HTML
    // no siempre es suficiente porque algunos UAs respetan solo el
    // header HTTP.
    headers: {
      "Referrer-Policy": "origin"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvYXdlc29tZS1sb3ZpbmctZGFyd2luL21udC9tZWRpY2dldC1mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL2F3ZXNvbWUtbG92aW5nLWRhcndpbi9tbnQvbWVkaWNnZXQtZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Nlc3Npb25zL2F3ZXNvbWUtbG92aW5nLWRhcndpbi9tbnQvbWVkaWNnZXQtZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgLy8gSGVhZGVycyBIVFRQIGVudmlhZG9zIGNvbiBjYWRhIHJlc3B1ZXN0YSBkZWwgZGV2IHNlcnZlci5cclxuICAgIC8vIFBheVBob25lIENhaml0YSBleGlnZSBgUmVmZXJyZXItUG9saWN5OiBvcmlnaW5gIChvXHJcbiAgICAvLyBgb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luYCkgcGFyYSB2ZXJpZmljYXIgbGEgaWRlbnRpZGFkIGRlbFxyXG4gICAgLy8gc2l0aW8gYWwgY2FyZ2FyIGVsIG1vZGFsIFx1MjAxNCBzaW4gZXN0byBzdSB2YWxpZGFjaVx1MDBGM24gZmFsbGFcclxuICAgIC8vIHNpbGVuY2lvc2FtZW50ZSB5IGVsIG1vZGFsIG5vIHJlbmRlcml6YS4gTGEgbWV0YSB0YWcgZGVsIEhUTUxcclxuICAgIC8vIG5vIHNpZW1wcmUgZXMgc3VmaWNpZW50ZSBwb3JxdWUgYWxndW5vcyBVQXMgcmVzcGV0YW4gc29sbyBlbFxyXG4gICAgLy8gaGVhZGVyIEhUVFAuXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdSZWZlcnJlci1Qb2xpY3knOiAnb3JpZ2luJyxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVYsU0FBUyxvQkFBb0I7QUFDOVcsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFRTixTQUFTO0FBQUEsTUFDUCxtQkFBbUI7QUFBQSxJQUNyQjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
