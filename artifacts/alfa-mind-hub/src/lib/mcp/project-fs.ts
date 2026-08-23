/**
 * Sandboxed project-file access for the MCP code tools.
 *
 * Every path is normalised and confined to the project root, secret/config
 * sensitive paths are blocked outright, and shell access is limited to a
 * fixed allowlist of npm scripts (no arbitrary commands).
 *
 * Import-safe: no env reads, no I/O at module scope.
 */

export type Ok<T> = { success: true } & T;
export type Err = { success: false; error: string; code: string };

export function ok<T extends object>(value: T): Ok<T> {
  return { success: true, ...value };
}

export function err(code: string, error: string): Err {
  return { success: false, code, error };
}

/** Directories never listed, read, searched or written. */
const DENIED_DIRS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  ".output",
  ".nitro",
  ".vinxi",
  ".vercel",
  ".wrangler",
  ".cache",
  ".turbo",
  "coverage",
  ".lovable",
  ".workspace",
  ".agents",
  ".claude",
];

/** Files never listed, read or written (secrets, credentials, keys, locks). */
const DENIED_FILE_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\..*)?$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.netrc$/i,
  /(^|\/)bunfig\.toml$/i,
  /(^|\/)[^/]*secret[^/]*$/i,
  /(^|\/)[^/]*credential[^/]*$/i,
  /(^|\/)[^/]*\.(pem|key|p12|pfx|keystore|jks|crt|cer)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /(^|\/)\.ssh(\/|$)/i,
  /(^|\/)\.aws(\/|$)/i,
  /(^|\/)supabase\/\.temp(\/|$)/i,
];

const TEXT_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "css",
  "scss",
  "html",
  "md",
  "mdx",
  "txt",
  "sql",
  "yml",
  "yaml",
  "toml",
  "svg",
  "csv",
]);

const MAX_READ_BYTES = 400_000;
const MAX_WRITE_BYTES = 400_000;

export function projectRoot(): string {
  const runtime = globalThis as typeof globalThis & {
    process?: { cwd?: () => string };
  };
  const cwd = runtime.process?.cwd?.();
  if (!cwd) throw new Error("Project filesystem is not available in this runtime");
  return cwd;
}

/** Normalise a caller-supplied path to a repo-relative POSIX path, or fail. */
export function safeRelativePath(input: string): { rel: string } | Err {
  const raw = String(input ?? "").trim();
  if (!raw) return err("invalid_path", "Path is required");
  if (raw.includes("\0")) return err("invalid_path", "Path contains a null byte");

  const unixed = raw.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(unixed)) return err("invalid_path", "Absolute paths are not allowed");

  const root = projectRoot().replace(/\\/g, "/");
  let candidate = unixed;
  if (candidate.startsWith("/")) {
    // Accept an absolute path only when it already points inside the project.
    if (candidate === root || candidate.startsWith(`${root}/`)) {
      candidate = candidate.slice(root.length).replace(/^\//, "");
    } else {
      return err("outside_project", "Path is outside the project root");
    }
  }

  const segments: string[] = [];
  for (const segment of candidate.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return err("outside_project", "Path escapes the project root");
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const rel = segments.join("/");
  if (!rel) return err("invalid_path", "Path resolves to the project root");
  if (isDeniedPath(rel)) return err("forbidden_path", `Access to "${rel}" is not permitted`);
  return { rel };
}

export function isDeniedPath(rel: string): boolean {
  const parts = rel.split("/");
  if (parts.some((p) => DENIED_DIRS.includes(p))) return true;
  return DENIED_FILE_PATTERNS.some((re) => re.test(rel));
}

export function isTextPath(rel: string): boolean {
  const ext = rel.includes(".") ? rel.split(".").pop()!.toLowerCase() : "";
  if (TEXT_EXTENSIONS.has(ext)) return true;
  // Extension-less dotfiles we still allow (e.g. .prettierrc, .gitignore)
  return /(^|\/)\.[a-z0-9-]+$/i.test(rel);
}

type FsModule = typeof import("node:fs/promises");

export async function fsp(): Promise<FsModule | Err> {
  try {
    return (await import("node:fs/promises")) as FsModule;
  } catch {
    return err("fs_unavailable", "Filesystem access is not available in this runtime");
  }
}

export function absolutePath(rel: string): string {
  return `${projectRoot().replace(/\\/g, "/")}/${rel}`;
}

export type FileEntry = { path: string; type: "file" | "directory"; size?: number };

export async function listDirectory(
  rel: string,
  options: { recursive: boolean; limit: number },
): Promise<FileEntry[]> {
  const fs = await fsp();
  if ("success" in fs) throw new Error(fs.error);
  const out: FileEntry[] = [];

  async function walk(current: string, depthAllowed: boolean) {
    if (out.length >= options.limit) return;
    const dirPath = current ? absolutePath(current) : projectRoot();
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (out.length >= options.limit) return;
      const childRel = current ? `${current}/${entry.name}` : entry.name;
      if (isDeniedPath(childRel)) continue;
      if (entry.isDirectory()) {
        out.push({ path: childRel, type: "directory" });
        if (depthAllowed) await walk(childRel, true);
      } else if (entry.isFile()) {
        let size: number | undefined;
        try {
          size = (await fs.stat(absolutePath(childRel))).size;
        } catch {
          size = undefined;
        }
        out.push({ path: childRel, type: "file", ...(size === undefined ? {} : { size }) });
      }
    }
  }

  await walk(rel, options.recursive);
  return out;
}

export async function readTextFile(rel: string): Promise<{ content: string } | Err> {
  const fs = await fsp();
  if ("success" in fs) return fs;
  if (!isTextPath(rel)) return err("not_text", `"${rel}" is not a readable text source file`);
  try {
    const stat = await fs.stat(absolutePath(rel));
    if (!stat.isFile()) return err("not_a_file", `"${rel}" is not a file`);
    if (stat.size > MAX_READ_BYTES)
      return err("too_large", `"${rel}" is larger than ${MAX_READ_BYTES} bytes`);
  } catch {
    return err("not_found", `"${rel}" does not exist`);
  }
  const content = await fs.readFile(absolutePath(rel), "utf8");
  return { content };
}

export async function writeTextFile(
  rel: string,
  content: string,
): Promise<{ bytes: number; created: boolean } | Err> {
  const fs = await fsp();
  if ("success" in fs) return fs;
  if (!isTextPath(rel)) return err("not_text", `"${rel}" is not a writable text source file`);
  const bytes = new TextEncoder().encode(content).length;
  if (bytes > MAX_WRITE_BYTES)
    return err("too_large", `Content exceeds ${MAX_WRITE_BYTES} bytes`);

  let created = true;
  try {
    await fs.stat(absolutePath(rel));
    created = false;
  } catch {
    created = true;
  }

  const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
  if (dir) await fs.mkdir(absolutePath(dir), { recursive: true });
  await fs.writeFile(absolutePath(rel), content, "utf8");
  return { bytes, created };
}

/** Files considered by search / recursive listing when no glob is given. */
export function matchesGlob(rel: string, glob: string | undefined): boolean {
  if (!glob) return true;
  const pattern = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, "(?:.*/)?")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${pattern}$`).test(rel);
}

export const COMMAND_PRESETS = {
  typecheck: { label: "TypeScript typecheck", argv: ["bunx", "tsgo", "--noEmit"] },
  lint: { label: "ESLint", argv: ["bun", "run", "lint"] },
  test: { label: "Vitest suite", argv: ["bunx", "vitest", "run"] },
  build: { label: "Production build", argv: ["bun", "run", "build"] },
} as const;

export type CommandPreset = keyof typeof COMMAND_PRESETS;

export type CommandResult = {
  preset: CommandPreset;
  label: string;
  command: string;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};

const MAX_OUTPUT_CHARS = 20_000;

function tailClamp(value: string): string {
  return value.length > MAX_OUTPUT_CHARS
    ? `…(truncated)…\n${value.slice(-MAX_OUTPUT_CHARS)}`
    : value;
}

export async function runPreset(
  preset: CommandPreset,
  timeoutMs = 300_000,
): Promise<CommandResult | Err> {
  const entry = COMMAND_PRESETS[preset];
  if (!entry) return err("unknown_preset", `Unknown command preset "${preset}"`);

  let spawn: typeof import("node:child_process").spawn;
  try {
    ({ spawn } = await import("node:child_process"));
    if (typeof spawn !== "function") throw new Error("spawn unavailable");
  } catch {
    return err(
      "exec_unavailable",
      "Project checks can only run in the development/preview runtime, not on the deployed edge runtime.",
    );
  }

  const [cmd, ...args] = entry.argv;
  return await new Promise<CommandResult | Err>((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(cmd!, args, {
        cwd: projectRoot(),
        // Only the minimum environment: never forward app secrets to a subprocess.
        env: { PATH: (globalThis as never as { process: { env: Record<string, string> } }).process.env["PATH"] ?? "", HOME: "/root", CI: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      resolve(err("exec_failed", error instanceof Error ? error.message : String(error)));
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error: Error) => {
      clearTimeout(timer);
      resolve(err("exec_failed", error.message));
    });
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      resolve({
        preset,
        label: entry.label,
        command: entry.argv.join(" "),
        exitCode: code,
        timedOut,
        stdout: tailClamp(stdout),
        stderr: tailClamp(stderr),
      });
    });
  });
}
