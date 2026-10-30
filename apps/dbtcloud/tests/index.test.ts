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
    appearance: { icon: { url?: string }; darkMode?: { icon: { url?: string } } };
  };
};

test("index: exports 23 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 23);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform", "trigger"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that enqueues a second run. Cancelling twice is harmless. */
test("index: the actions that start another build say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["job-rerun", "job-run", "run-retry"]);
});

test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "account", "quota"]);
});

/**
 * dbt Cloud runs in cells, so the allowlist covers every `*.dbt.com` account
 * host plus the legacy apex `cloud.getdbt.com` — which `*.dbt.com` does not
 * match, being a different domain entirely.
 */
test("index: the manifest names the legacy host and every cell", () => {
  assertEquals(manifest.w6w.network.allow, ["cloud.getdbt.com", "*.dbt.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.dbtcloud");
});

/** The same call resumes or rebuilds everything, decided by unchecked state. */
test("index: job-rerun is gated behind an acknowledgement", () => {
  const action = app.actions.find((a) => a.key === "job-rerun")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirmFullRebuild");
  assert(confirm, "job-rerun has no acknowledgement");
  assertEquals(confirm!.required, true);
});

/** dbt requires it, and it is the cheapest observability in the integration. */
test("index: triggering a run requires a cause", () => {
  const action = app.actions.find((a) => a.key === "job-run")!;
  const cause = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "cause")!;
  assertEquals(cause.required, true);
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose and literal option values in field metadata are not code. Concatenated
    // continuations count too, or half a two-line description survives.
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message|value)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

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

/**
 * A dbt log is a build transcript and can be megabytes; an email is personal
 * data. Neither belongs in a run log — sizes and ids do.
 */
test("index: no action logs an email address or a log body", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      assert(!/\bemail\b/i.test(object), `${entry.name} logs an address: ${object}`);
      assert(!/\blogs\b/i.test(object), `${entry.name} logs a log body: ${object}`);
    }
  }
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('value: "credentials",').trim(), ",");
  assertEquals(code("value: ctx.credential,").trim(), "value: ctx.credential,");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
