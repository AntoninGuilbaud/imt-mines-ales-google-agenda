import { writeFile } from "node:fs/promises";
import { fetchPersonalIcs } from "../src/school-client";
import { generateIcs } from "../src/ics-generator";
import { parseSourceIcs } from "../src/ics-parser";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante: ${name}`);
  return value;
};

const source = await fetchPersonalIcs(
  process.env.SCHOOL_BASE_URL ?? "https://webdfd.mines-ales.fr/planning-eleves",
  required("PLANNING_USERNAME"),
  required("PLANNING_PASSWORD"),
  process.env.STUDENT_ID ?? "20432",
);
const events = parseSourceIcs(source);
if (events.length === 0) throw new Error("Le flux source ne contient aucun événement.");

const output = generateIcs(events);
const destination = process.env.ICS_OUTPUT ?? "site/calendar.ics";
await writeFile(destination, output, "utf8");
console.log(`Generated ${events.length} events in ${destination}`);
