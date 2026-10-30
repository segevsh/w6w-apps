import { denoReadDir, denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const manifest = JSON.parse(
  await denoReadTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; appearance: { darkMode?: unknown } };
};

test("index: exports 15 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 15);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that starts a new job/resource on a retry says so. */
test("index: the actions that are not safe to retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["datasource-refresh", "project-create"]);
});

/** Deleting a project or workbook cannot be undone by a clone the way a Git repo can. */
test("index: the destructive actions are gated behind a confirmation", () => {
  for (const key of ["project-delete", "workbook-delete"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string; required?: boolean }>)
      .find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
    assertEquals(confirm!.required, true);
  }
});

test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["personal-access-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["instance", "service"]);
});

/**
 * Tableau Cloud is pod-hosted and Tableau Server is self-hosted — there is no
 * fixed hostname to allowlist, matching the posture this pack already uses
 * for `gitea` and `mautic`.
 */
test("index: the manifest is honest about having no fixed API host", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.tableau");
});

test("index: the icon is the vendor's mark on the pack's normalized canvas", async () => {
  const svg = await denoReadTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Tableau</title>"), "the mark no longer names Tableau");
});

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
    assert(!/\bcredential\b/i.test(src), `${entry.name} reads the credential`);
    assert(!/x-tableau-auth/i.test(src), `${entry.name} sets the session header directly`);
  }
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
