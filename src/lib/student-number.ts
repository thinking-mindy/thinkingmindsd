const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Format: ST + 2-digit year + 4 digits + random letter — e.g. ST254319S */
export function formatStudentNumber(year: string, digits: string, letter: string): string {
  return `ST${year}${digits}${letter}`;
}

export function isValidStudentNumber(value: string): boolean {
  return /^ST\d{2}\d{4}[A-Z]$/.test(value.toUpperCase());
}

export function generateStudentNumber(existing: Iterable<string> = []): string {
  const taken = new Set(Array.from(existing).map((n) => n.toUpperCase()));
  const year = new Date().getFullYear().toString().slice(-2);

  for (let attempt = 0; attempt < 100; attempt++) {
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const num = formatStudentNumber(year, digits, letter);
    if (!taken.has(num)) return num;
  }

  throw new Error("Could not generate a unique student number. Try again.");
}
