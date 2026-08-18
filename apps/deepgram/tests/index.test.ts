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

/** Anything that spends money or mints a credential a second time. */
Deno.test("index: the actions that cost something on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["audio-transcribe", "key-create", "speech-generate", "token-grant"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota", "concurrency"]);
});

Deno.test("index: the manifest names only the API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.deepgram.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.deepgram");
});

/** Revoking a key is immediate, permanent, and easy to aim at the wrong one. */
Deno.test("index: deleting a key is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "key-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "key-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/**
 * The synchronous form returns audio bytes, which a workflow step cannot hold —
 * so the callback is required rather than offered.
 */
Deno.test("index: speech generation requires a callback URL", () => {
  const action = app.actions.find((a) => a.key === "speech-generate")!;
  const callback = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "callbackUrl")!;
  assertEquals(callback.required, true);
});

/**
 * Whether submitted audio and text may train Deepgram's models is a governance
 * decision, so both actions that submit content expose it.
 */
Deno.test("index: the model-improvement opt-out is offered wherever content is submitted", () => {
  for (const key of ["audio-transcribe", "speech-generate"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
    assert(keys.includes("mipOptOut"), `${key} does not offer the opt-out`);
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
 * A transcript is somebody's recorded conversation, a minted key is a
 * credential, and a granted token is as powerful as the key behind it. None
 * belongs in a run log.
 */
Deno.test("index: no action logs a transcript, a key, a token or an address", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (const forbidden of [/transcript/i, /\btoken\b/i, /\bemail\b/i, /\btext\b/i]) {
        assert(!forbidden.test(object), `${entry.name} logs sensitive data: ${object}`);
      }
      // `apiKeyId` is an id, not a key; a bare `key` would be the value.
      assert(!/\bkey\s*[:,}]/.test(object), `${entry.name} may log a key value: ${object}`);
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
