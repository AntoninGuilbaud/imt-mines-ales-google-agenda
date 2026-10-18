import { readFile } from "node:fs/promises";
import { generateIcs } from "../src/ics-generator";
import { parseSourceIcs } from "../src/ics-parser";

const source = process.argv[2] ?? "fixtures/personal.ics";
const input = await readFile(source, "utf8");
const output = generateIcs(parseSourceIcs(input));
process.stdout.write(output);
