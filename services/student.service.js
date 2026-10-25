import api from './api';
import { ENDPOINTS } from '../config/endpoints';

export const studentService = {
  list: async () => {
    const response = await api.get(ENDPOINTS.STUDENTS);
    return response.data;
  },

  create: async ({ fullName, schoolGrade, birthDate, userId, photoData, emergencyContact }) => {
    const response = await api.post(ENDPOINTS.STUDENTS, {
      fullName,
      schoolGrade,
      birthDate,
      userId,
      photoData,
      emergencyContact,
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(ENDPOINTS.STUDENT_BY_ID(id), data);
    return response.data;
  },

  remove: async (id) => {
    await api.delete(ENDPOINTS.STUDENT_BY_ID(id));
  },

  unlinkDevice: async (studentId) => {
    await api.delete(ENDPOINTS.STUDENT_DEVICE(studentId));
  },

  assignRoute: async (studentId, routeId) => {
    await api.post(ENDPOINTS.STUDENT_ROUTES(studentId, routeId));
  },

  listEmergencyContacts: async (studentId) => {
    const response = await api.get(ENDPOINTS.EMERGENCY_CONTACTS(studentId));
    return response.data;
  },

  createEmergencyContact: async (studentId, data) => {
    const response = await api.post(ENDPOINTS.EMERGENCY_CONTACTS(studentId), data);
    return response.data;
  },

  updateEmergencyContact: async (studentId, contactId, data) => {
    const response = await api.put(ENDPOINTS.EMERGENCY_CONTACT_BY_ID(studentId, contactId), data);
    return response.data;
  },

  removeEmergencyContact: async (studentId, contactId) => {
    await api.delete(ENDPOINTS.EMERGENCY_CONTACT_BY_ID(studentId, contactId));
  },

  linkDevice: async (data) => {
    const payload = {
      code: data.code,
      deviceIdentifier: data.deviceIdentifier,
      platform: data.platform,
      deviceName: data.deviceName,
    };

    if (data.studentId) payload.studentId = data.studentId;

    const response = await api.post(ENDPOINTS.LINK_DEVICE, payload, { skipAuth: true });
    return response.data;
  },

  linkedProfile: async (studentId, code) => {
    const response = await api.get(ENDPOINTS.LINKED_PROFILE(studentId), {
      params: { code },
      skipAuth: true,
    });
    return response.data;
  },

  listGuardians: async (studentId) => {
    const response = await api.get(ENDPOINTS.GUARDIANS(studentId));
    return response.data;
  },

  shareWithGuardian: async (studentId, data) => {
    const response = await api.post(ENDPOINTS.GUARDIANS(studentId), {
      email: data.email,
      relationshipRole: data.relationshipRole,
    });
    return response.data;
  },

  revokeGuardian: async (studentId, guardianUserId) => {
    await api.delete(ENDPOINTS.GUARDIAN_BY_ID(studentId, guardianUserId));
  },
};
