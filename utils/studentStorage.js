import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { studentService } from '../services/student.service';
import { routeService } from '../services/route.service';
import { safeZoneService } from '../services/safeZone.service';
import { mapsService } from '../services/maps.service';

const NOTIF_KEY = '@guardian_notificaciones';
const HISTORY_KEY = '@guardian_historial';
const ROUTES_KEY = '@guardian_local_routes';
const ZONES_KEY = '@guardian_local_zones';

const GRADE_TO_ENUM = {
  'Pre Kinder': 'PRE_KINDER',
  'Pre-Kinder': 'PRE_KINDER',
  Prekinder: 'PRE_KINDER',
  Prejardin: 'PRE_KINDER',
  Kinder: 'KINDER',
  Jardin: 'KINDER',
  Transition: 'TRANSITION',
  First: 'FIRST',
  Second: 'SECOND',
  Third: 'THIRD',
  Fourth: 'FOURTH',
  Fifth: 'FIFTH',
  Sixth: 'SIXTH',
  Seventh: 'SEVENTH',
  Eighth: 'EIGHTH',
  Ninth: 'NINTH',
  Tenth: 'TENTH',
  Eleventh: 'ELEVENTH',
};

const NUMBER_TO_GRADE_ENUM = {
  0: 'TRANSITION',
  1: 'FIRST',
  2: 'SECOND',
  3: 'THIRD',
  4: 'FOURTH',
  5: 'FIFTH',
  6: 'SIXTH',
  7: 'SEVENTH',
  8: 'EIGHTH',
  9: 'NINTH',
  10: 'TENTH',
  11: 'ELEVENTH',
};

const ENUM_TO_GRADE = {
  PRE_KINDER: 'Prejardin',
  KINDER: 'Jardin',
  TRANSITION: 'Transicion',
  FIRST: 'Primero',
  SECOND: 'Segundo',
  THIRD: 'Tercero',
  FOURTH: 'Cuarto',
  FIFTH: 'Quinto',
  SIXTH: 'Sexto',
  SEVENTH: 'Septimo',
  EIGHTH: 'Octavo',
  NINTH: 'Noveno',
  TENTH: 'Decimo',
  ELEVENTH: 'Undecimo',
};

export function getInitials(nombre = '') {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || '??';
}

export function normalizeGrade(value = '') {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (GRADE_TO_ENUM[trimmed]) return GRADE_TO_ENUM[trimmed];

  const normalized = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º]/g, '')
    .replace(/\b(grado|curso)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const numericGrade = normalized.match(/\d+/)?.[0];
  if (numericGrade && NUMBER_TO_GRADE_ENUM[numericGrade]) {
    return NUMBER_TO_GRADE_ENUM[numericGrade];
  }

  const compactGrade = normalized.replace(/[^a-z]/g, '');
  const aliases = {
    prekinder: 'PRE_KINDER',
    prejardin: 'PRE_KINDER',
    jardin: 'KINDER',
    kinder: 'KINDER',
    transicion: 'TRANSITION',
    transition: 'TRANSITION',
    primero: 'FIRST',
    primer: 'FIRST',
    first: 'FIRST',
    segundo: 'SECOND',
    second: 'SECOND',
    tercero: 'THIRD',
    tercer: 'THIRD',
    third: 'THIRD',
    cuarto: 'FOURTH',
    fourth: 'FOURTH',
    quinto: 'FIFTH',
    fifth: 'FIFTH',
    sexto: 'SIXTH',
    sixth: 'SIXTH',
    septimo: 'SEVENTH',
    setimo: 'SEVENTH',
    seventh: 'SEVENTH',
    octavo: 'EIGHTH',
    eighth: 'EIGHTH',
    noveno: 'NINTH',
    ninth: 'NINTH',
    decimo: 'TENTH',
    tenth: 'TENTH',
    undecimo: 'ELEVENTH',
    eleventh: 'ELEVENTH',
    once: 'ELEVENTH',
  };

  return aliases[compactGrade] || null;
}

export function gradeLabel(value = '') {
  return ENUM_TO_GRADE[value] || value;
}

export function calculateAge(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  const birth = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
}

function buildLinkCode(id = '') {
  return String(id).replace(/-/g, '').slice(0, 10).toUpperCase();
}

async function getStudentExtras(studentId) {
  const [apiZones, localZones, localRoutes] = await Promise.all([
    safeZoneService.list().catch(() => []),
    getLocalCollection(ZONES_KEY, studentId),
    getLocalCollection(ROUTES_KEY, studentId),
  ]);
  const zones = apiZones
    .filter(zone => String(zone.studentId) === String(studentId))
    .map(zone => ({
      ...zone,
      id: zone.id,
      name: zone.zoneName,
      radius: `${zone.radiusMeters} Metros`,
      radiusMeters: zone.radiusMeters,
      center: { latitude: Number(zone.latitude), longitude: Number(zone.longitude) },
    }));
  return { zones: zones.length ? zones : localZones, routes: localRoutes };
}

async function mapStudent(apiStudent) {
  const contacts = await studentService.listEmergencyContacts(apiStudent.id).catch(() => []);
  const primaryContact = contacts.find(contact => contact.isPrimary || contact.esPrincipal) || contacts[0];
  const extras = await getStudentExtras(apiStudent.id);
  const fullName = apiStudent.fullName || apiStudent.nombreCompleto || '';
  const schoolGrade = apiStudent.schoolGrade || apiStudent.gradoEscolar || '';
  const birthDate = apiStudent.birthDate || apiStudent.fechaNacimiento || '';
  const apiRoutes = apiStudent.routes || apiStudent.rutas;
  const routes = Array.isArray(apiRoutes)
    ? apiRoutes.map(route => ({
      ...route,
      id: route.id || route.routeId,
      name: route.name || route.routeName || route.nombre,
      start: route.start || route.originAddress || route.origen || formatCoordinates(route.originLatitude, route.originLongitude),
      end: route.end || route.destinationAddress || route.destino || formatCoordinates(route.destinationLatitude, route.destinationLongitude),
    }))
    : extras.routes;

  return {
    id: apiStudent.id,
    usuarioId: apiStudent.userId || apiStudent.usuarioId,
    nombre: fullName,
    nombreAcudiente: apiStudent.guardianName || apiStudent.nombreAcudiente,
    grado: gradeLabel(schoolGrade),
    gradoEscolar: schoolGrade,
    fechaNacimiento: birthDate,
    edad: calculateAge(birthDate),
    colegio: '',
    contacto_id: primaryContact?.id || null,
    contacto_nombre: primaryContact?.fullName || primaryContact?.nombreCompleto || '',
    contacto_telefono: primaryContact?.phone || primaryContact?.telefono || '',
    contacto_parentesco: primaryContact?.relationship || primaryContact?.parentesco || '',
    dispositivos_vinculados: apiStudent.linkedDevices || 0,
    acudientes_vinculados: apiStudent.linkedGuardians || apiStudent.acudientesVinculados || 1,
    correo_acudiente: apiStudent.guardianEmail || apiStudent.correoAcudiente || '',
    foto: apiStudent.photoData || apiStudent.foto || '',
    codigo_vinculacion: buildLinkCode(apiStudent.id),
    label: getInitials(fullName),
    color: COLORS.PRIMARIO,
    status: (apiStudent.isActive ?? apiStudent.estaActivo) ? 'SAFE' : 'INFO',
    routes,
    zones: extras.zones,
  };
}

async function refreshStudents() {
  const students = await studentService.list();
  return Promise.all(students.map(mapStudent));
}

export async function getStudents() {
  return refreshStudents();
}

export async function addStudent(studentData) {
  const created = await studentService.create({
    fullName: studentData.nombre.trim(),
    schoolGrade: normalizeGrade(studentData.grado),
    birthDate: studentData.fechaNacimiento || null,
    photoData: studentData.foto || null,
  });

  if (studentData.contacto_nombre?.trim() && studentData.contacto_telefono?.trim()) {
    await studentService.createEmergencyContact(created.id, {
      fullName: studentData.contacto_nombre.trim(),
      phone: studentData.contacto_telefono.trim(),
      relationship: studentData.contacto_parentesco?.trim() || 'Guardian',
      isPrimary: true,
    });
  }

  return refreshStudents();
}

export async function updateStudent(id, studentData) {
  const updated = await studentService.update(id, {
    fullName: studentData.nombre.trim(),
    schoolGrade: normalizeGrade(studentData.grado),
    birthDate: studentData.fechaNacimiento || null,
    photoData: studentData.foto || null,
  });

  if (studentData.contacto_nombre?.trim() && studentData.contacto_telefono?.trim()) {
    const contactPayload = {
      fullName: studentData.contacto_nombre.trim(),
      phone: studentData.contacto_telefono.trim(),
      relationship: studentData.contacto_parentesco?.trim() || 'Guardian',
      isPrimary: true,
    };
    const contacts = await studentService.listEmergencyContacts(id).catch(() => []);
    const existing = studentData.contacto_id
      ? contacts.find(contact => contact.id === studentData.contacto_id)
      : contacts.find(contact => contact.isPrimary || contact.esPrincipal) || contacts[0];

    if (existing) {
      await studentService.updateEmergencyContact(id, existing.id, contactPayload);
    } else {
      await studentService.createEmergencyContact(id, contactPayload);
    }
  }

  return refreshStudents(updated);
}

export async function deleteStudent(id) {
  await studentService.remove(id);
  await removeLocalCollections(id);
  return refreshStudents();
}

async function getLocalMap(storageKey) {
  const data = await AsyncStorage.getItem(storageKey);
  return data ? JSON.parse(data) : {};
}

async function setLocalMap(storageKey, value) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(value));
}

async function getLocalCollection(storageKey, studentId) {
  const map = await getLocalMap(storageKey);
  return map[studentId] || [];
}

async function setLocalCollection(storageKey, studentId, collection) {
  const map = await getLocalMap(storageKey);
  map[studentId] = collection;
  await setLocalMap(storageKey, map);
}

async function removeLocalCollections(studentId) {
  for (const storageKey of [ROUTES_KEY, ZONES_KEY]) {
    const map = await getLocalMap(storageKey);
    delete map[studentId];
    await setLocalMap(storageKey, map);
  }
}

function generateLocalId(prefix) {
  return `${prefix}-${Date.now()}`;
}

export async function addZone(studentId, zoneData) {
  const coordinates = await mapsService.geocode(zoneData.address);
  const saved = await safeZoneService.create({
    studentId,
    zoneName: zoneData.name,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    radiusMeters: parseInt(String(zoneData.radius).replace(/\D/g, ''), 10),
    inactivityAlertSeconds: 300,
  });
  return [{ ...saved, name: saved.zoneName, radius: `${saved.radiusMeters} Metros` }];
}

function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return '';
  return `${latitude}, ${longitude}`;
}

export async function updateZone(studentId, zoneId, zoneData) {
  const coordinates = await mapsService.geocode(zoneData.address);
  const saved = await safeZoneService.update(zoneId, {
    studentId,
    zoneName: zoneData.name,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    radiusMeters: parseInt(String(zoneData.radius).replace(/\D/g, ''), 10),
    inactivityAlertSeconds: 300,
  });
  return [{ ...saved, name: saved.zoneName, radius: `${saved.radiusMeters} Metros` }];
}

export async function deleteZone(studentId, zoneId) {
  await safeZoneService.remove(zoneId);
  return [];
}

export async function addRoute(studentId, routeData) {
  const [origin, destination] = await Promise.all([
    mapsService.geocode(routeData.start),
    mapsService.geocode(routeData.end),
  ]);
  const route = await routeService.create({
    routeName: routeData.name,
    description: `Origen: ${routeData.start}. Destino: ${routeData.end}.`,
    originLatitude: origin.latitude,
    originLongitude: origin.longitude,
    destinationLatitude: destination.latitude,
    destinationLongitude: destination.longitude,
    stops: [],
  });
  await studentService.assignRoute(studentId, route.id);
  return [route];
}

export async function updateRoute(studentId, routeId, routeData) {
  const [origin, destination] = await Promise.all([
    mapsService.geocode(routeData.start),
    mapsService.geocode(routeData.end),
  ]);
  const route = await routeService.update(routeId, {
    routeName: routeData.name,
    description: `Origen: ${routeData.start}. Destino: ${routeData.end}.`,
    originLatitude: origin.latitude,
    originLongitude: origin.longitude,
    destinationLatitude: destination.latitude,
    destinationLongitude: destination.longitude,
    stops: [],
  });
  return [route];
}

export async function deleteRoute(studentId, routeId) {
  await routeService.remove(routeId);
  return [];
}

export async function getNotifications() {
  const data = await AsyncStorage.getItem(NOTIF_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addNotification(notif) {
  const current = await getNotifications();
  const newNotif = {
    id: `notif-${Date.now()}`,
    time: 'Ahora',
    ...notif,
  };
  const updated = [newNotif, ...current].slice(0, 50);
  await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteNotification(id) {
  const current = await getNotifications();
  const updated = current.filter(notification => notification.id !== id);
  await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  return updated;
}

export async function getHistory() {
  const data = await AsyncStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addHistory(entry) {
  const current = await getHistory();
  const newEntry = {
    id: `history-${Date.now()}`,
    fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }),
    ...entry,
  };
  const updated = [newEntry, ...current].slice(0, 50);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteHistory(id) {
  const current = await getHistory();
  const updated = current.filter(history => history.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}
