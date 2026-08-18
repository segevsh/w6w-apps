import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 24 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 24);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} declares no output`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that creates a second thing, or spends money twice. */
Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "backup-create",
    "index-create",
    "index-create-for-model",
    "index-delete",
    "index-restore",
  ]);
});

/**
 * Every destructive action that cannot say in advance how much it removes must
 * be gated behind an explicit confirmation.
 */
Deno.test("index: irreversible actions carry a confirmation flag", () => {
  for (const key of ["index-delete", "namespace-delete", "record-delete"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string }>).find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
  }
});

/**
 * Measured 2026-08-18: omitting this header serves 2024-04, not the latest. No
 * request may go out without it.
 */
Deno.test("index: the API version header is set in exactly one place, and pinned", async () => {
  const client = await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url));
  assert(/API_VERSION = "2026-04"/.test(client), "the version is not pinned to 2026-04");
  assert(
    /"x-pinecone-api-version": API_VERSION/.test(client),
    "the client does not set the version header",
  );
});

/**
 * The data plane lives on a per-index host, so the allowlist has to cover it —
 * and the control plane host must still be named explicitly, since `*.` does
 * not match an apex.
 */
Deno.test("index: the egress allowlist covers both planes", () => {
  assertEquals(manifest.w6w.network.allow, ["api.pinecone.io", "*.pinecone.io"]);
});

Deno.test("index: nothing calls a host outside the allowlist", async () => {
  for (const dir of ["actions", "auth", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const m of code.matchAll(/https:\/\/([a-z0-9.${}-]+)/g)) {
        assert(
          m[1] === "api.pinecone.io" || m[1].includes("${"),
          `${dir}/${entry.name} reaches ${m[1]}`,
        );
      }
    }
  }
});

/** Collections are pod-only legacy; backups are the serverless replacement. */
Deno.test("index: no action touches the legacy collections surface", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert(!/\/collections/.test(code), `${entry.name} calls the collections API`);
  }
});

Deno.test("index: one auth method and three declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["indexes", "quota", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.pinecone");
  assertEquals(manifest.w6w.categories, ["ai", "databases", "search"]);
});
