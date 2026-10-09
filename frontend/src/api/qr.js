import { request } from './client';

export function getIndexInfo(receiver) {
  return request(`/getIndexInfo2?receiver=${encodeURIComponent(receiver || 'group_chat')}`);
}
