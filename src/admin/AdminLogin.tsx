import { type FormEvent, useState } from "react";
import { loginAdmin, type AdminUser } from "./admin-api";

export default function AdminLogin(props: {
  onAuthenticated: (user: AdminUser) => void;
  initialError?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(props.initialError ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const user = await loginAdmin(password);
      setPassword("");
      props.onAuthenticated(user);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось выполнить вход.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Закрытый раздел
      </div>
      <h1 className="mt-2 text-2xl font-bold">Вход администратора</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Единственная учётная запись — <span className="font-semibold">admin</span>.
        Обычным пользователям вход не требуется.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="admin-password">
            Пароль
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!password || submitting}
          className="w-full rounded-2xl bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Проверка…" : "Войти как admin"}
        </button>
      </form>
    </div>
  );
}
