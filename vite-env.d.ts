/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_EKISPERT_API_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  // add more env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}