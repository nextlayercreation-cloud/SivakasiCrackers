/**
 * src/api/client.js
 * ---------------------------------------------------------
 * Single axios instance used by every API module. Base URL
 * points at the Express middleware server.
 *
 * In development, CRA's "proxy" field in package.json can
 * also forward /api requests to localhost:5000 — this base
 * URL is set explicitly anyway so the app works even without
 * the proxy (e.g. when frontend and backend run on different
 * machines/ports).
 * ---------------------------------------------------------
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default client;
