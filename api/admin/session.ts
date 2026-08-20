import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "mr_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ADMIN_IDENTITY = {
  username: "admin",
  role: "admin",
} as const;

type SessionPayload = {
  sub: "admin";
  role: "admin";
  exp: number;
};

type AdminConfig = {
  password: string;
  sessionSecret: string;
};

function responseJson(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "private, no-store, max-age=0");
  responseHeaders.set("Pragma", "no-cache");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function readConfig(): AdminConfig | null {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !sessionSecret || sessionSecret.length < 32) return null;
  return { password, sessionSecret };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string, secret: string): boolean {
  const leftDigest = createHmac("sha256", secret).update(left).digest();
  const rightDigest = createHmac("sha256", secret).update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function createSessionToken(secret: string, now = Date.now()): string {
  const payload: SessionPayload = {
    sub: "admin",
    role: "admin",
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) return false;
  const expected = sign(encoded, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    return (
      payload.sub === "admin" &&
      payload.role === "admin" &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}

function cookieValue(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === COOKIE_NAME) return valueParts.join("=");
  }
  return undefined;
}

function cookieHeader(
  request: Request,
  value: string,
  maxAge: number,
): string {
  const secure =
    new URL(request.url).protocol === "https:" || process.env.VERCEL === "1";
  return [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function adminRequestOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export function hasAuthenticatedAdminSession(request: Request): boolean {
  const config = readConfig();
  return Boolean(
    config &&
      verifySessionToken(cookieValue(request), config.sessionSecret),
  );
}

async function parsePassword(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { password?: unknown };
    return typeof body.password === "string" && body.password.length <= 512
      ? body.password
      : null;
  } catch {
    return null;
  }
}

export const adminSessionTestUtils = {
  cookieName: COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
};

export default {
  async fetch(request: Request): Promise<Response> {
    const config = readConfig();
    if (!config) {
      return responseJson(
        {
          authenticated: false,
          error: "admin_not_configured",
        },
        503,
      );
    }

    if (request.method === "GET") {
      const authenticated = verifySessionToken(
        cookieValue(request),
        config.sessionSecret,
      );
      return authenticated
        ? responseJson({ authenticated: true, user: ADMIN_IDENTITY })
        : responseJson({ authenticated: false }, 401);
    }

    if (request.method === "POST") {
      if (!adminRequestOriginAllowed(request)) {
        return responseJson({ authenticated: false }, 403);
      }
      const password = await parsePassword(request);
      if (
        password === null ||
        !safeEqual(password, config.password, config.sessionSecret)
      ) {
        return responseJson(
          { authenticated: false, error: "invalid_credentials" },
          401,
        );
      }
      const token = createSessionToken(config.sessionSecret);
      return responseJson(
        { authenticated: true, user: ADMIN_IDENTITY },
        200,
        {
          "Set-Cookie": cookieHeader(
            request,
            token,
            SESSION_TTL_SECONDS,
          ),
        },
      );
    }

    if (request.method === "DELETE") {
      if (!adminRequestOriginAllowed(request)) {
        return responseJson({ authenticated: false }, 403);
      }
      return responseJson(
        { authenticated: false },
        200,
        {
          "Set-Cookie": cookieHeader(request, "", 0),
        },
      );
    }

    return responseJson(
      { error: "method_not_allowed" },
      405,
      { Allow: "GET, POST, DELETE" },
    );
  },
};
