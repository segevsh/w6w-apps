import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { url?: string }; darkMode?: { icon: { url?: string } } };
  };
};

Deno.test("index: exports 25 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 25);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform", "trigger"].includes(a.type),
      `${a.key} has type ${a.type}`,
    );
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Vanta is a system of record; this app reads it and writes three things. */
Deno.test("index: only three actions write, and they are the ones named", () => {
  const writes = app.actions.filter((a) => a.type === "perform").map((a) => a.key).sort();
  assertEquals(writes, ["control-set-owner", "person-offboard", "test-entity-deactivate"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["client-credentials"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "tenant", "quota"]);
});

/** Vanta Gov is a separate host, with its own token endpoint. */
Deno.test("index: the manifest names both the commercial and FedRAMP hosts", () => {
  assertEquals(manifest.w6w.network.allow, ["api.vanta.com", "api.vanta-gov.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.vanta");
});

/**
 * The two writes that change what "compliant" means, or close a checklist
 * against real people, are gated.
 */
Deno.test("index: offboarding is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "person-offboard")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "person-offboard has no confirmation flag");
  assertEquals(confirm!.required, true);
});

Deno.test("index: deactivating a test entity requires a reason", () => {
  const action = app.actions.find((a) => a.key === "test-entity-deactivate")!;
  const reason = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "reason")!;
  assertEquals(reason.required, true);
});

/**
 * Vanta has endpoints to acknowledge a missed remediation SLA and to delete
 * controls, vendors and documents. Writing "acknowledged by automation" against
 * a missed security deadline, or deleting a compliance record, is not something
 * a workflow should be able to do by accident.
 */
Deno.test("index: nothing here deletes a record or acknowledges an SLA miss", () => {
  for (const a of app.actions) {
    assert(!/delete|remove|acknowledge/i.test(a.key), `${a.key} destroys or excuses a record`);
  }
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint or an output label is not code. Concatenated
    // continuations count too, or half a two-line description survives.
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

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

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

/**
 * This app reads a company's staff roster, its device fleet and its security
 * findings. A run log records shapes and ids, never people or findings.
 */
Deno.test("index: no action logs personal data or a finding", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (const forbidden of [/\bemail\b/i, /\bname\b/i, /\breason\b/i, /vulnerab/i]) {
        assert(!forbidden.test(object), `${entry.name} logs sensitive data: ${object}`);
      }
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
