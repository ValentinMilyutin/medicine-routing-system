import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import {
  getAdminSession,
  logoutAdmin,
  type AdminUser,
} from "./admin-api";

type SessionState =
  | { status: "checking" }
  | { status: "anonymous"; error?: string }
  | { status: "authenticated"; user: AdminUser };

export default function AdminApp(props: { onBack: () => void }) {
  const [session, setSession] = useState<SessionState>({ status: "checking" });

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((user) => {
        if (!active) return;
        setSession(
          user ? { status: "authenticated", user } : { status: "anonymous" },
        );
      })
      .catch((reason) => {
        if (!active) return;
        setSession({
          status: "anonymous",
          error:
            reason instanceof Error
              ? reason.message
              : "Не удалось проверить сессию.",
        });
      });
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await logoutAdmin();
    setSession({ status: "anonymous" });
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <button
          type="button"
          onClick={props.onBack}
          className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          ← На публичную часть
        </button>

        {session.status === "checking" && (
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-sm">
            Проверка административной сессии…
          </div>
        )}
        {session.status === "anonymous" && (
          <div className="mx-auto max-w-md">
            <AdminLogin
              initialError={session.error}
              onAuthenticated={(user) =>
                setSession({ status: "authenticated", user })
              }
            />
          </div>
        )}
        {session.status === "authenticated" && (
          <AdminDashboard user={session.user} onLogout={logout} />
        )}
      </div>
    </div>
  );
}
