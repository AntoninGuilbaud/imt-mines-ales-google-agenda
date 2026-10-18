const CLAVIERES = "6 avenue de Clavières, 30100 Alès, France";
const CROUPILLAC = "1A rue Jules Renard, 30100 Alès, France";

export function campusAddress(location: string): string | undefined {
  const normalized = location.toUpperCase();
  if (normalized.includes("CLAV")) return CLAVIERES;
  if (normalized.includes("CROUP")) return CROUPILLAC;
  return undefined;
}

export function formatLocation(location: string): string {
  const clean = location.trim();
  const address = campusAddress(clean);
  if (!address || clean === "-") return clean === "-" ? "" : clean;
  return `Salle ${clean}, École des Mines d'Alès - ${address}`;
}
