import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 19 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 19);
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

/** Firing an event and calling a service both do something new each time. */
Deno.test("index: the actions that repeat on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["event-fire", "intent-handle", "service-call"]);
});

Deno.test("index: exports the one auth method and all four health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance", "entities", "quota"]);
});

/** The instance is self-hosted, so it can be at any hostname. */
Deno.test("index: the manifest admits the instance can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["status.home-assistant.io", "*"]);
  assertEquals(manifest.w6w.id, "io.w6w.homeassistant");
  assertEquals(manifest.w6w.categories, ["iot", "productivity"]);
});

/**
 * The central trap. Home Assistant's own docs say `POST /api/states` "will not
 * communicate with the actual device", so anything that means to control
 * something must go through a service — and `state-set` must guard the domains
 * where the mistake is silent.
 */
Deno.test("index: only the service actions post to /services, and state-set guards devices", () => {
  const stateSet = app.actions.find((a) => a.key === "state-set")!;
  const keys = (stateSet.params as Array<{ key: string }>).map((p) => p.key);
  assert(keys.includes("confirmNoDeviceControl"), keys.join(","));
  assert(/does NOT communicate/.test(stateSet.description!), stateSet.description);

  const controllers = app.actions.filter((a) => /service-call|entity-switch/.test(a.key));
  assertEquals(controllers.length, 2);
});

/** `history-get` requires entity ids because the unfiltered query is dangerous. */
Deno.test("index: history requires entities, unlike the API", () => {
  const history = app.actions.find((a) => a.key === "history-get")!;
  const entity = (history.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "entityId")!;
  assertEquals(entity.required, true);
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
    assert(!/\btoken\b/i.test(src), `${entry.name} handles the access token`);
  }
});

/**
 * These entities are somebody's house: who is home, when a door opened, what a
 * camera sees. A run log records entity ids, domains and counts.
 */
Deno.test("index: no action logs a state value, a template or event data", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /\bstate\s*[,:}]/i,
          /\bstates\s*[,:}]/i,
          /\btemplate\b/i,
          /\bdata\s*[,:}]/i,
          /\battributes\b/i,
          /\bentries\s*[,:}]/i,
          /\blog\s*[,:}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs household data: ${object}`);
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
