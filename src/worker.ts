import { readCache, writeCache } from "./cache";
import { generateIcs } from "./ics-generator";
import { parseSourceIcs } from "./ics-parser";
import { fetchPersonalIcs } from "./school-client";
import type { Env } from "./types";

const requests = new Map<string, number>();

const text = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...headers } });

function home(request: Request, env: Env): Response {
  const calendarUrl = env.CALENDAR_TOKEN
    ? `${new URL(request.url).origin}/calendar/${encodeURIComponent(env.CALENDAR_TOKEN)}.ics`
    : "";
  const webcalUrl = calendarUrl.replace(/^https?:/, "webcal:");
  const escaped = calendarUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return new Response(`<!doctype html>
<html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Calendrier IMT Mines Alès</title>
<style>body{font:16px system-ui;max-width:720px;margin:3rem auto;padding:0 1rem;color:#17202a}code{overflow-wrap:anywhere;background:#eef2f4;padding:.3rem}li{margin:.8rem 0}</style>
<h1>Calendrier personnel IMT Mines Alès</h1>
<p>Ce flux privé republie votre planning personnel avec un cache respectueux du serveur de l'école.</p>
${escaped ? `<p><strong>URL HTTPS du flux :</strong><br><code>${escaped}</code></p><button onclick="navigator.clipboard.writeText(document.querySelector('code').textContent)">Copier l'URL</button><p><strong>URL webcal :</strong><br><code>${webcalUrl}</code></p>` : "<p>Le token du calendrier n'est pas encore configuré.</p>"}
<h2>Ajouter dans Google Agenda</h2><ol><li>Créez un calendrier dédié, par exemple « Cours IMT ».</li><li>Dans « Autres agendas », choisissez « À partir de l'URL ».</li><li>Collez l'URL ci-dessus et validez.</li></ol>
<p>Google peut actualiser un calendrier abonné toutes les 12 à 24 heures. Les notifications se règlent dans les paramètres du calendrier.</p>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") return text("ok\n");
    if (url.pathname === "/") return home(request, env);
    const token = env.CALENDAR_TOKEN;
    if (!token || url.pathname !== `/calendar/${token}.ics`) return text("Non trouvé\n", 404);

    const now = Date.now();
    const lastRequest = requests.get(token) ?? 0;
    if (now - lastRequest < 10_000) return text("Trop de demandes, réessayez dans quelques secondes.\n", 429, { "Retry-After": "10" });
    requests.set(token, now);
    const key = `calendar:${env.STUDENT_ID}`;
    const ttl = Number(env.CACHE_TTL_SECONDS ?? 2700);
    const cached = await readCache(env, key);
    if (cached && Date.now() - cached.fetchedAt < ttl * 1000) {
      return new Response(cached.ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=300" } });
    }
    try {
      const source = await fetchPersonalIcs(
        env.SCHOOL_BASE_URL ?? "https://webdfd.mines-ales.fr/planning-eleves",
        env.PLANNING_USERNAME,
        env.PLANNING_PASSWORD,
        env.STUDENT_ID,
      );
      const ics = generateIcs(parseSourceIcs(source));
      await writeCache(env, key, { ics, fetchedAt: Date.now() });
      return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=300" } });
    } catch (error) {
      if (cached)       return new Response(cached.ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Warning": '110 - "Stale calendar"', "X-Calendar-Stale": "true" } });
      return text(error instanceof Error ? error.message : "Erreur de récupération\n", 502);
    }
  },
} satisfies ExportedHandler<Env>;
