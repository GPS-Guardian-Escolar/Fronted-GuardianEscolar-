import api from './api';

export const studentService = {
  list: async () => {
    const response = await api.get('/students');
    return response.data;
  },

  create: async ({ fullName, schoolGrade, birthDate, userId, photoData }) => {
    const response = await api.post('/students', {
      fullName,
      schoolGrade,
      birthDate,
      userId,
      photoData,
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    await api.delete(`/students/${id}`);
  },

  unlinkDevice: async (studentId) => {
    await api.delete(`/students/${studentId}/device`);
  },

  assignRoute: async (studentId, routeId) => {
    await api.post(`/students/${studentId}/routes/${routeId}`);
  },

  listEmergencyContacts: async (studentId) => {
    const response = await api.get(`/students/${studentId}/emergency-contacts`);
    return response.data;
  },

  createEmergencyContact: async (studentId, data) => {
    const response = await api.post(`/students/${studentId}/emergency-contacts`, data);
    return response.data;
  },

  updateEmergencyContact: async (studentId, contactId, data) => {
    const response = await api.put(`/students/${studentId}/emergency-contacts/${contactId}`, data);
    return response.data;
  },

  removeEmergencyContact: async (studentId, contactId) => {
    await api.delete(`/students/${studentId}/emergency-contacts/${contactId}`);
  },

  linkDevice: async (data) => {
    const payload = {
      code: data.code,
      deviceIdentifier: data.deviceIdentifier,
      platform: data.platform,
      deviceName: data.deviceName,
    };

    if (data.studentId) payload.studentId = data.studentId;

    const response = await api.post('/students/link-device', payload, { skipAuth: true });
    return response.data;
  },

  linkedProfile: async (studentId, code) => {
    const response = await api.get(`/students/${studentId}/linked-profile`, {
      params: { code },
      skipAuth: true,
    });
    return response.data;
  },

  listGuardians: async (studentId) => {
    const response = await api.get(`/students/${studentId}/guardians`);
    return response.data;
  },

  shareWithGuardian: async (studentId, data) => {
    const response = await api.post(`/students/${studentId}/guardians`, {
      email: data.email,
      relationshipRole: data.relationshipRole,
    });
    return response.data;
  },
};
