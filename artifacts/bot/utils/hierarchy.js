const IMMUNE_ROLE = '1471395858607116382';
const PUNISHMENT_ROLE = '1404892921932546148';

const CAN_MUTE_ROLES = ['1429178980992553163', '1486626111634014219', '1404873526779056158'];
const CAN_BAN_ROLES = ['1429178980992553163', '1486626111634014219'];
const CAN_CLEAR_ROLES = ['1486626111634014219', '1429178980992553163', '1404873526779056158'];

// Server role hierarchy: index 0 = highest rank
const ROLE_HIERARCHY = [
  ['1429169517119934685'],
  ['1404872037624709152', '1429169686670606488'],
  ['1404872755786158200'],
  ['1404872949399425204'],
  ['1429169137644732569'],
];

function getRoleLevel(member) {
  for (let i = 0; i < ROLE_HIERARCHY.length; i++) {
    for (const roleId of ROLE_HIERARCHY[i]) {
      if (member.roles.cache.has(roleId)) return i;
    }
  }
  return ROLE_HIERARCHY.length;
}

function hasAnyRole(member, roleIds) {
  return roleIds.some(id => member.roles.cache.has(id));
}

function canModerate(moderator, target) {
  if (target.roles.cache.has(IMMUNE_ROLE)) return false;
  const modLevel = getRoleLevel(moderator);
  const targetLevel = getRoleLevel(target);
  return modLevel < targetLevel;
}

module.exports = { IMMUNE_ROLE, PUNISHMENT_ROLE, CAN_MUTE_ROLES, CAN_BAN_ROLES, CAN_CLEAR_ROLES, ROLE_HIERARCHY, getRoleLevel, hasAnyRole, canModerate };
