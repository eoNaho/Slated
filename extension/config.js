/**
 * PixelReel — config.js
 * Troque DEV para false antes de publicar na Chrome Web Store.
 */

const DEV = true;

export const API_BASE = DEV
  ? "http://localhost:3001/api/v1"
  : "https://pixelreel.com/api/v1";
export const SITE_BASE = DEV
  ? "http://localhost:3000"
  : "https://pixelreel.com";