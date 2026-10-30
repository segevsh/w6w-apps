import { denoReadDir, denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const manifest = JSON.parse(
  await denoReadTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    categories: string[];
    appearance: { darkMode?: unknown };
  };
};

test("index: exports 10 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 10);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Every action that duplicates, refuses on retry, or was chosen at runtime says so. */
test("index: the actions that are not safe to retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "call-method",
    "cancel-document",
    "create-document",
    "delete-document",
    "submit-document",
  ]);
});

/** The one action that discards state without a trash to recover it from is gated. */
test("index: delete-document is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "delete-document")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "delete-document has no confirmation flag");
  assertEquals(confirm!.required, true);
});

test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["instance", "service"]);
});

/**
 * A self-hostable app cannot name its hosts. The wide allowlist is the price,
 * and it matches the posture the pack already uses for gitea and mautic.
 */
test("index: the manifest is honest about being self-hostable", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.erpnext");
});

test("index: categories are 1-3 entries from the controlled vocabulary", () => {
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await denoReadTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>ERPNext</title>"), "the mark no longer names ERPNext");
  assert(svg.includes("#0089FF"), "the mark lost ERPNext's blue");
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
