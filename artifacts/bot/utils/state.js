let doubleXp = false;

module.exports = {
  isDoubleXp: () => doubleXp,
  setDoubleXp: (val) => { doubleXp = !!val; },
};
