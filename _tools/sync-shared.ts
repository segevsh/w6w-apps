/**
 * Copies every kit directory under `apps/_shared/` byte-identically into `apps/<group>/_shared/`
 * for each provider group (nested apps can include only their own group's `_shared`, D1).
 *
 *   deno run -A _tools/sync-shared.ts [--check] [rootDir]
 *
 * `rootDir` is the apps repo root (default: the parent of this file); the drift test points it at a
 * temp copy. `--check` writes nothing and exits 1 listing every missing or differing file.
 * Generated copies are never edited by hand.
 */
import { dirname, fromFileUrl, join, relative } from "jsr:@std/path@^1.0.0";

export const GROUPS = [
  "google",
  "microsoft",
  "atlassian",
  "mailchimp",
  "meta",
  "zendesk",
  "twilio",
  "aws",
  "dropbox",
  "freshworks",
  "linkedin",
  "zoho",
];

async function files(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    for await (const e of Deno.readDir(d)) {
      const p = join(d, e.name);
      if (e.isDirectory) await walk(p);
      else if (e.isFile) out.push(relative(dir, p));
    }
  }
  await walk(dir);
  return out.sort();
}

/** Sync (or check) all kits; returns the drifted paths relative to `root`. */
export async function syncShared(
  root: string,
  check: boolean,
): Promise<string[]> {
  const canon = join(root, "apps", "_shared");
  const drift: string[] = [];
  for await (const kit of Deno.readDir(canon)) {
    if (!kit.isDirectory) continue;
    const src = join(canon, kit.name);
    const srcFiles = await files(src);
    for (const group of GROUPS) {
      const dest = join(root, "apps", group, "_shared", kit.name);
      const destFiles = await files(dest).catch(() => [] as string[]);
      for (const f of destFiles) {
        if (!srcFiles.includes(f)) {
          const p = join(dest, f);
          drift.push(relative(root, p));
          if (!check) await Deno.remove(p);
        }
      }
      for (const f of srcFiles) {
        const want = await Deno.readFile(join(src, f));
        const have = await Deno.readFile(join(dest, f)).catch(() => null);
        const same = have !== null && have.length === want.length &&
          have.every((b, i) => b === want[i]);
        if (same) continue;
        drift.push(relative(root, join(dest, f)));
        if (!check) {
          await Deno.mkdir(dirname(join(dest, f)), { recursive: true });
          await Deno.writeFile(join(dest, f), want);
        }
      }
    }
  }
  return drift;
}

if (import.meta.main) {
  const check = Deno.args.includes("--check");
  const arg = Deno.args.find((a) => !a.startsWith("--"));
  const root = arg ?? fromFileUrl(new URL("..", import.meta.url));
  const drift = await syncShared(root, check);
  if (check && drift.length) {
    console.error(
      `shared copies drifted (run sync-shared.ts):\n${drift.join("\n")}`,
    );
    Deno.exit(1);
  }
  console.log(
    check ? "shared copies in sync" : `synced ${drift.length} file(s)`,
  );
}
