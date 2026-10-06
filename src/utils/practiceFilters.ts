/** Practice mode item pools: all targets, one tier, or a DataDragon stat tag */
export const PRACTICE_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All items' },
  { value: 'epic', label: 'Epic components' },
  { value: 'legendary', label: 'Legendaries' },
  { value: 'Damage', label: 'Attack damage' },
  { value: 'CriticalStrike', label: 'Crit' },
  { value: 'AttackSpeed', label: 'Attack speed' },
  { value: 'SpellDamage', label: 'Ability power' },
  { value: 'Health', label: 'Health' },
  { value: 'Armor', label: 'Armor' },
  { value: 'SpellBlock', label: 'Magic resist' },
  { value: 'Boots', label: 'Boots' },
];
