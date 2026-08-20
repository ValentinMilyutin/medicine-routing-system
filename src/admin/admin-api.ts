export type AdminUser = {
  username: "admin";
  role: "admin";
};

type AdminSessionResponse = {
  authenticated: boolean;
  user?: AdminUser;
  error?: string;
};

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function parseResponse(response: Response): Promise<AdminSessionResponse> {
  try {
    return (await response.json()) as AdminSessionResponse;
  } catch {
    throw new AdminApiError(
      "Сервер авторизации вернул некорректный ответ.",
      "invalid_response",
      response.status,
    );
  }
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const response = await fetch("/api/admin/session", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const body = await parseResponse(response);
  if (response.status === 401) return null;
  if (!response.ok || !body.authenticated || !body.user) {
    throw new AdminApiError(
      body.error === "admin_not_configured"
        ? "Вход администратора ещё не настроен на сервере."
        : "Не удалось проверить сессию администратора.",
      body.error ?? "session_check_failed",
      response.status,
    );
  }
  return body.user;
}

export async function loginAdmin(password: string): Promise<AdminUser> {
  const response = await fetch("/api/admin/session", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  const body = await parseResponse(response);
  if (!response.ok || !body.authenticated || !body.user) {
    throw new AdminApiError(
      body.error === "admin_not_configured"
        ? "Вход администратора ещё не настроен на сервере."
        : "Неверный пароль.",
      body.error ?? "login_failed",
      response.status,
    );
  }
  return body.user;
}

export async function logoutAdmin(): Promise<void> {
  const response = await fetch("/api/admin/session", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new AdminApiError(
      "Не удалось завершить сессию.",
      "logout_failed",
      response.status,
    );
  }
}
