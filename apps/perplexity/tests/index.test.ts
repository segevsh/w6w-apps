import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 5;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
});

/**
 * Sonar (`chat-completion`) is retiring 2026-09-27 in favor of the Agent API
 * (`agent-response`). Someone reading either action's description in the
 * Studio picker must learn about the other, without opening the README.
 */
Deno.test("index: Sonar and the Agent API name each other in their descriptions", () => {
  const chat = app.actions.find((a) => a.key === "chat-completion")!;
  const agent = app.actions.find((a) => a.key === "agent-response")!;
  assert(chat, "chat-completion action missing");
  assert(agent, "agent-response action missing");

  assert(/2026-09-27/.test(chat.description!), "chat-completion must name the sunset date");
  assert(
    /agent-response/.test(chat.description!),
    "chat-completion must point at its successor by key",
  );
  assert(
    /sonar/i.test(agent.description!),
    "agent-response must name what it succeeds",
  );
  assert(
    /chat-completion/.test(agent.description!),
    "agent-response must point back at chat-completion by key",
  );
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency, and honestly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(a.idempotent, false, `${a.key}: chat/search/embed calls are not safe to retry`);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not the prose
 * explaining the very things they check for.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/perplexity\.ai/.test(src), `${a.key}: contains a Perplexity host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "bearer");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, which outranks `ok` in the
 * roll-up, so at any other severity it would pin the app at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = (app.healthChecks ?? []).filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest ------------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.perplexity");
  assert(manifest.w6w.network.allow.includes("api.perplexity.ai"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.perplexity.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

/**
 * The mark in `assets/icon.svg` was placed verbatim from simple-icons
 * (`cdn.simpleicons.org/perplexity`) before this app was built and must not be
 * modified, replaced, or regenerated by any tooling this app runs.
 */
Deno.test("index: the icon is the vendor's mark, untouched", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith('<svg fill="#1FB8CD" role="img" viewBox="0 0 24 24"'), "icon.svg changed");
  assert(svg.includes("<title>Perplexity</title>"), "icon.svg lost its title");
  assert(
    svg.includes("M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0"),
    "the vendor's geometry changed — the mark was redrawn",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
