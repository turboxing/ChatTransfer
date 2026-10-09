import { request } from './client';

export function getVersionInfo() {
  return request('/getVersionInfo');
}

export function getHomeDir() {
  return request('/getHomeDir');
}

export function openCachePath() {
  return request('/openCachePath', { method: 'POST' });
}

export function setCachePath(path, migrate = true) {
  return request('/setCachePath', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, migrate })
  });
}
