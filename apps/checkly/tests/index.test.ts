import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; appearance: { darkMode?: unknown } };
};

Deno.test("index: exports 25 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 25);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform", "trigger"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Both of these bill or duplicate on a retry. */
Deno.test("index: the actions that repeat on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["check-run", "maintenance-window-create"]);
});

/** Two actions lose something no later call restores. */
Deno.test("index: the destructive actions are gated behind a confirmation", () => {
  for (const key of ["check-delete", "variable-delete"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string; required?: boolean }>)
      .find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
    assertEquals(confirm!.required, true);
  }
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/**
 * Neither health check runs, and both say why. That is the honest outcome for
 * a vendor that publishes no machine-readable status and no usage figure.
 */
Deno.test("index: both health checks are declared absences carrying their evidence", () => {
  for (const check of app.healthChecks!) {
    assertEquals(typeof check.check, "undefined", `${check.key} should not be a live probe`);
    assert(check.unavailable, `${check.key} has no declared reason`);
    assert(
      check.unavailable!.reason.includes("2026-08-18"),
      `${check.key}'s reason does not carry the date it was measured`,
    );
  }
});

Deno.test("index: the manifest allowlists exactly the one API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.checklyhq.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.checkly");
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colours", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Checkly</title>"), "the mark no longer names Checkly");
  assert(svg.includes("#0075FF"), "the mark lost Checkly's blue");
  assert(svg.includes("#002652"), "the mark lost Checkly's navy");
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

/** Both halves of the credential belong to the auth hook, on every request. */
Deno.test("index: no action sets the key or the account header", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/x-checkly-account/i.test(src), `${entry.name} sets the account header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

/** A variable's value is a credential often enough to never log it. */
Deno.test("index: the variable actions never log a value", async () => {
  for (const name of ["variable-set.ts", "variable-delete.ts"]) {
    const src = code(await Deno.readTextFile(new URL(`../actions/${name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    assert(logs.length > 0, `${name}: the log-data matcher found nothing to check`);
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      assert(!/\bvalue\b/.test(object), `${name} logs a value: ${object}`);
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
