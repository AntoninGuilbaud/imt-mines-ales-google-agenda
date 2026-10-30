const USER_AGENT = "IMT-Mines-Ales-Personal-Calendar/1.0 (personal use; contact: local)";
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Le site de l'école n'a pas répondu dans le délai prévu.");
    }
    throw error;
  }
}

export async function fetchPersonalIcs(
  baseUrl: string,
  username: string,
  password: string,
  studentId: string,
): Promise<string> {
  const loginUrl = new URL("../php/planning-eleves/login/login.php", `${baseUrl}/`).toString();
  const login = await fetchWithTimeout(loginUrl, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ Username: username, Password: password, url: "", login: "Connexion" }),
  });
  const loginCookie = sessionCookie(login.headers);
  if (login.status < 300 || login.status >= 400 || !loginCookie) {
    throw new Error("La connexion au planning de l'école a échoué.");
  }
  const response = await fetchWithTimeout(`${baseUrl}/index.php?url=ics/eleve/${encodeURIComponent(studentId)}`, {
    headers: { Cookie: loginCookie, "User-Agent": USER_AGENT },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (!response.ok || !contentType.toLowerCase().includes("text/calendar") || !body.includes("BEGIN:VCALENDAR")) {
    throw new Error("Le site de l'école n'a pas renvoyé un calendrier ICS authentifié.");
  }

  return body;
}

function sessionCookie(headers: Headers): string | undefined {
  const headersWithSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const values = [
    ...(typeof headersWithSetCookie.getSetCookie === "function" ? headersWithSetCookie.getSetCookie() : []),
    headers.get("set-cookie") ?? headers.get("Set-Cookie") ?? "",
  ];
  const cookie = values
    .flatMap((value) => value.split(/,(?=[^;,]+=)/))
    .map((value) => value.split(";", 1)[0].trim())
    .find((value) => value.startsWith("PHPSESSID="));
  return cookie || undefined;
}
