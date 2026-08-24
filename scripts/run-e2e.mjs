import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseUrl = "http://127.0.0.1:4173";

async function serverAlreadyRunning() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(750) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(process) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`Vite завершился до запуска тестов (код ${process.exitCode}).`);
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Сервер ещё запускается.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Vite не запустился за 60 секунд.");
}

if (await serverAlreadyRunning()) {
  throw new Error("Порт 4173 уже занят. Остановите локальный dev-сервер и повторите проверку.");
}

const vite = spawn(
  process.execPath,
  ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4173"],
  { cwd: root, stdio: "inherit", windowsHide: true },
);

let exitCode = 1;
try {
  await waitForServer(vite);
  const playwright = spawn(
    process.execPath,
    ["./node_modules/@playwright/test/cli.js", "test"],
    {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "1" },
    },
  );
  const [code] = await once(playwright, "exit");
  exitCode = typeof code === "number" ? code : 1;
} finally {
  if (vite.exitCode === null) {
    vite.kill();
    await Promise.race([
      once(vite, "exit"),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  }
}

process.exitCode = exitCode;
