import api from './api';

// Photos live in `images` as a JSON array (up to 3), with `image` holding the first one
export const parseAnnouncementPhotos = (announcement) => {
  if (announcement?.images) {
    try {
      const parsed = JSON.parse(announcement.images);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // fall through to the single-image field
    }
  }
  return announcement?.image ? [announcement.image] : [];
};

export const getActiveAnnouncements = async (limit = 10) => {
  const response = await api.get('/announcements/active', { params: { limit } });
  return response.data;
};

export const getAllAnnouncements = async (params = {}) => {
  const response = await api.get('/announcements', { params });
  return response.data;
};

export const createAnnouncement = async (data) => {
  const response = await api.post('/announcements', data);
  return response.data;
};

export const updateAnnouncement = async (id, data) => {
  const response = await api.put(`/announcements/${id}`, data);
  return response.data;
};

export const deleteAnnouncement = async (id) => {
  const response = await api.delete(`/announcements/${id}`);
  return response.data;
};
