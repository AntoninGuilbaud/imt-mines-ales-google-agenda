import type { SourceEvent } from "./types";

function unfold(input: string): string[] {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function value(lines: string[], name: string): string {
  const line = lines.find((item) => item.startsWith(`${name}:`) || item.startsWith(`${name};`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

export function parseSourceIcs(input: string): SourceEvent[] {
  return input.split(/BEGIN:VEVENT\r?\n?/).slice(1).flatMap((raw) => {
    const lines = unfold(raw.split(/END:VEVENT/)[0]);
    const uid = value(lines, "UID");
    const start = value(lines, "DTSTART");
    const end = value(lines, "DTEND");
    if (!uid || !start || !end) return [];
    return [{
      uid,
      start,
      end,
      summary: value(lines, "SUMMARY"),
      location: value(lines, "LOCATION"),
      description: value(lines, "DESCRIPTION"),
      status: value(lines, "STATUS") || undefined,
    }];
  });
}
