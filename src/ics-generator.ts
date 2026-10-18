import type { SourceEvent } from "./types";
import { formatLocation } from "./campus";

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function hash(input: string): string {
  let h = 2166136261;
  for (const char of input) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}

function stableUid(event: SourceEvent): string {
  return `${hash([event.start, event.end, event.summary, event.location].join("|"))}@imt-mines-ales.local`;
}

function lines(event: SourceEvent): string[] {
  const location = formatLocation(event.location);
  const summary = location ? `${event.location} - ${event.summary}` : event.summary;
  const result = [
    "BEGIN:VEVENT",
    `UID:${stableUid(event)}`,
    `DTSTART;TZID=Europe/Paris:${event.start.replace(/^.*:/, "")}`,
    `DTEND;TZID=Europe/Paris:${event.end.replace(/^.*:/, "")}`,
    `SUMMARY:${escape(summary)}`,
    `DESCRIPTION:${escape(event.description)}`,
  ];
  if (location) result.push(`LOCATION:${escape(location)}`);
  if (event.status) result.push(`STATUS:${escape(event.status)}`);
  result.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel du cours",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
  );
  return result;
}

export function generateIcs(events: SourceEvent[]): string {
  const output = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IMT Mines Ales//Personal Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Paris",
    "BEGIN:STANDARD",
    "DTSTART:20001029T030000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:20000326T020000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];
  for (const event of events) output.push(...lines(event));
  output.push("END:VCALENDAR");
  return `${output.join("\r\n")}\r\n`;
}
