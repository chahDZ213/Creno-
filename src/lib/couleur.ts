/** Variante plus sombre d'une couleur hex, pour les états survolés. */
export function assombrir(hex: string, facteur = 0.78): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.round(v * facteur).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
}

/** Variables CSS d'un garage, à poser sur le conteneur de sa page. */
export function variables(couleur: string): React.CSSProperties {
  return {
    '--creno-primaire': couleur,
    '--creno-primaire-fonce': assombrir(couleur),
  } as React.CSSProperties;
}
