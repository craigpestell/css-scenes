import { readFile } from 'node:fs/promises';

/** Generate tokens.css (@property registrations + :root custom props) from tokens.json. */
export async function generateTokens(file) {
  const t = JSON.parse(await readFile(file, 'utf8'));
  const props = [];
  const root = [];
  const colors = [];

  for (const [name, v] of Object.entries(t.color)) {
    props.push(`@property --c-${name}{syntax:"${v.syntax}";inherits:true;initial-value:${v.light}}`);
    colors.push(`--c-${name}:light-dark(${v.light},${v.dark});`);
  }
  for (const [name, v] of Object.entries(t.duration)) root.push(`--t-${name}:${v};`);
  for (const [name, v] of Object.entries(t.easing)) root.push(`--ease-${name}:${v};`);
  for (const [name, v] of Object.entries(t.angle)) {
    props.push(`@property --a-${name}{syntax:"${v.syntax}";inherits:false;initial-value:${v.initial}}`);
  }

  return `${props.join('\n')}
@layer tokens{:root{color-scheme:light dark;${colors.join('')}${root.join('')}}}
`;
}
