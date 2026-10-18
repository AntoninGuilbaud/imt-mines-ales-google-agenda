import { describe, expect, it } from "vitest";
import { campusAddress } from "../src/campus";
import { generateIcs } from "../src/ics-generator";
import { parseSourceIcs } from "../src/ics-parser";

const fixture = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x\r\nDTSTART;TZID=Europe/Paris:20261001T090000\r\nDTEND;TZID=Europe/Paris:20261001T100000\r\nSUMMARY:Maths, avancées\r\nLOCATION:M166 - CROUP\r\nDESCRIPTION:Prof\\, Test\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;

describe("ICS pipeline", () => {
  it("parses and enriches a source event", () => {
    const [event] = parseSourceIcs(fixture);
    expect(event.summary).toBe("Maths, avancées");
    expect(campusAddress(event.location)).toContain("Jules Renard");
  });

  it("generates stable escaped ICS with alarm", () => {
    const event = parseSourceIcs(fixture)[0];
    const first = generateIcs([event]);
    expect(first).toBe(generateIcs([event]));
    expect(first).toContain("SUMMARY:M166 - CROUP - Maths\\, avancées");
    expect(first).toContain("LOCATION:Salle M166 - CROUP\\, École des Mines d'Alès");
    expect(first).toContain("TRIGGER:-PT15M");
    expect(first).toMatch(/\r\n/);
  });
});
