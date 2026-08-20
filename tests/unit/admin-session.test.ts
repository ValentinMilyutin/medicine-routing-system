import { afterEach, beforeEach, describe, expect, it } from "vitest";
import adminSessionHandler, {
  adminSessionTestUtils,
} from "../../api/admin/session";

const ENDPOINT = "https://medicine.example/api/admin/session";
const SESSION_SECRET = "test-session-secret-with-at-least-32-characters";

function request(method: string, options: RequestInit = {}) {
  return new Request(ENDPOINT, {
    ...options,
    method,
    headers: {
      origin: "https://medicine.example",
      ...options.headers,
    },
  });
}

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "correct-admin-password";
  process.env.ADMIN_SESSION_SECRET = SESSION_SECRET;
  delete process.env.VERCEL;
});

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.VERCEL;
});

describe("серверная сессия единственного администратора", () => {
  it("не запускает вход без серверных секретов", async () => {
    delete process.env.ADMIN_PASSWORD;
    const response = await adminSessionHandler.fetch(request("GET"));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      authenticated: false,
      error: "admin_not_configured",
    });
  });

  it("отклоняет неверный пароль без установки cookie", async () => {
    const response = await adminSessionHandler.fetch(
      request("POST", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wrong" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("создаёт HttpOnly-сессию только для admin и принимает её повторно", async () => {
    const login = await adminSessionHandler.fetch(
      request("POST", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "correct-admin-password" }),
      }),
    );
    const setCookie = login.headers.get("set-cookie") ?? "";
    const cookie = setCookie.split(";")[0];

    expect(login.status).toBe(200);
    expect(await login.json()).toEqual({
      authenticated: true,
      user: { username: "admin", role: "admin" },
    });
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Secure");

    const session = await adminSessionHandler.fetch(
      request("GET", { headers: { cookie } }),
    );
    expect(session.status).toBe(200);
    expect(await session.json()).toMatchObject({ authenticated: true });
  });

  it("отклоняет подменённую и истёкшую сессию", () => {
    const token = adminSessionTestUtils.createSessionToken(
      SESSION_SECRET,
      Date.now() - 9 * 60 * 60 * 1000,
    );
    expect(
      adminSessionTestUtils.verifySessionToken(token, SESSION_SECRET),
    ).toBe(false);
    expect(
      adminSessionTestUtils.verifySessionToken(`${token}x`, SESSION_SECRET),
    ).toBe(false);
  });

  it("завершает сессию удалением cookie", async () => {
    const response = await adminSessionHandler.fetch(request("DELETE"));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("не принимает изменяющий запрос с чужого origin", async () => {
    const response = await adminSessionHandler.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: "correct-admin-password" }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
