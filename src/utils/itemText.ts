/**
 * Turns DataDragon's item description markup into plain text for tooltips.
 *
 * Input looks like:
 *   <mainText><stats><attention>60</attention> Ability Power<br>...</stats><br><br>
 *   <passive>Torment</passive><br>Damaging Abilities burn...</mainText>
 */

export interface ItemEffect {
  /** "Passive" or "Active" label, e.g. "Torment" */
  name: string;
  text: string;
}

export interface ItemText {
  /** One line per stat, e.g. "60 Ability Power" */
  stats: string[];
  effects: ItemEffect[];
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseItemDescription(description: string): ItemText {
  const statsMatch = description.match(/<stats>([\s\S]*?)<\/stats>/i);
  const stats = statsMatch
    ? statsMatch[1].split(/<br\s*\/?>/i).map(stripTags).filter(Boolean)
    : [];

  const rest = statsMatch ? description.slice((statsMatch.index ?? 0) + statsMatch[0].length) : description;

  // Split on <passive>Name</passive> / <active>Name</active> headings
  const effects: ItemEffect[] = [];
  const headingPattern = /<(passive|active)>([\s\S]*?)<\/\1>/gi;
  const headings = [...rest.matchAll(headingPattern)];

  headings.forEach((heading, i) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index : rest.length;
    const text = stripTags(rest.slice(start, end));
    const name = stripTags(heading[2]);
    if (name || text) effects.push({ name, text });
  });

  return { stats, effects };
}
