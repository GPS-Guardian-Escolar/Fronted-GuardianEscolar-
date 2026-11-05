export function canManageStudent(student, user) {
  if (!user?.id || !student?.id) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return (student.usuarioId != null && String(student.usuarioId) === String(user.id))
    || user.role === 'ADMIN' || roles.includes('ADMIN');
}

export function hasActiveStudentQr(student, now = Date.now()) {
  const expiresAt = Date.parse(student?.codigo_expira_en || '');
  return Boolean(student?.codigo_vinculacion && Number.isFinite(expiresAt) && expiresAt > now);
}

export function validateIssuedLinkCode(issued) {
  if (typeof issued?.code !== 'string' || !issued.code.trim()
      || !hasActiveStudentQr({ codigo_vinculacion: issued.code, codigo_expira_en: issued.expiresAt })) {
    throw new Error('Invalid link code response');
  }
  return issued;
}

// Keep a newly issued code in memory across refreshes, only while the owner can use it.
export function mergeStudentLinkCodes(incoming, previous, user) {
  const previousById = new Map(previous.map(student => [student.id, student]));
  return incoming.map(student => {
    const cached = previousById.get(student.id);
    if (!canManageStudent(student, user) || !hasActiveStudentQr(cached)
        || Number(student.dispositivos_vinculados || 0) !== Number(cached.dispositivos_vinculados || 0)) return student;
    return { ...student, codigo_vinculacion: cached.codigo_vinculacion, codigo_expira_en: cached.codigo_expira_en };
  });
}

export function getLinkCodeErrorKey(error) {
  const status = error?.response?.status;
  if (status === 401) return 'studSessionExpired';
  if (status === 403) return 'studReadOnlyDetails';
  if (status === 404) return 'studLinkStudentMissing';
  if (status === 429) return 'studLinkTryLater';
  if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK' || !error?.response && error?.request) return 'studLinkNetworkFailed';
  return 'studLinkCodeIssueFailed';
}
