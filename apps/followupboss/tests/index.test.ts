import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 26);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
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

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: every param declares a label and a type", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      assert(typeof p.type === "string" && p.type.length > 0, `${a.key}/${p.key}: no type`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible. Scanning only executable text makes
 * the guard mean what it says.
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
    assert(!/\bbtoa\b|encodeBase64/.test(src), `${a.key}: builds a Basic credential itself`);
  }
});

/**
 * The Follow Up Boss-specific half of the same rule.
 *
 * This app's credential is not just the Basic header: `X-System` and
 * `X-System-Key` identify the registered integration and materially change the
 * rate limit, so they are credential material too. They belong to
 * `auth/api-key.ts` and nowhere else.
 *
 * The pattern matches the header name **used as an object key or index** —
 * `"X-System": v` or `headers["X-System"]` — rather than any mention of the
 * string. That distinction is deliberate and was forced by a real case: Create
 * Event has a `system` BODY field (the software that produced the lead), and its
 * hint has to say "unrelated to the `X-System` header on the Connection" to stop
 * someone conflating the two. Banning the substring would make the guard punish
 * exactly the documentation that prevents the confusion, and the natural fix —
 * deleting the sentence — would leave a real violation just as invisible.
 */
Deno.test("index: no action builds an X-System header — those belong to sign", async () => {
  const asHeaderKey = /["'`]x-system(-key)?["'`]\s*[\]:]/i;
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!asHeaderKey.test(src), `${a.key}: builds an X-System header itself`);
    // Belt and braces: an action has no business assembling request headers at
    // all — the client owns that, and the credential half of it is sign's.
    assert(!/\bheaders\b\s*[:=]/.test(src), `${a.key}: assembles request headers itself`);
  }
});

/** The pattern above must still catch a real violation. */
Deno.test("index: the X-System guard would catch an actual header assignment", () => {
  const asHeaderKey = /["'`]x-system(-key)?["'`]\s*[\]:]/i;
  assert(asHeaderKey.test(`headers["X-System"] = name;`));
  assert(asHeaderKey.test(`{ "X-System-Key": key }`));
  assert(asHeaderKey.test(`{ 'x-system': name }`));
  // …and must not fire on prose that merely names the header.
  assert(!asHeaderKey.test('hint: "Unrelated to the `X-System` header on the Connection."'));
});

/**
 * The system headers are half the credential. They must never be reachable as an
 * action parameter — that would put credential material in the network-capable
 * worker and let two actions on one Connection disagree about who they are.
 */
Deno.test("index: no action exposes the credential as a param", () => {
  const banned = ["apikey", "apiKey", "systemkey", "systemKey", "systemname", "password", "token"];
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !banned.includes(p.key.toLowerCase()),
        `${a.key}: declares a credential-ish param "${p.key}"`,
      );
      assert(p.type !== "secret", `${a.key}/${p.key}: an action must not collect a secret`);
    }
  }
});

/**
 * `GET /me` returns the caller's own `apiKey`, `algoliaKey` and calling token in
 * its response body. Nothing in this app may call it — not an action, not the
 * auth hooks, not a health check — because fetching the credential back into a
 * hook walks straight around the sandbox's credential isolation.
 *
 * `/identity` is the safe equivalent and is what every whoami path here uses.
 * The regex targets the path as it would be written, so `/identity` and
 * `/rateLimit/limits` do not trip it.
 */
Deno.test("index: nothing in the app calls GET /me — it leaks the caller's API key", async () => {
  const dirs = ["actions", "auth", "health", "lib"];
  for (const dir of dirs) {
    const base = new URL(`../${dir}/`, import.meta.url);
    for await (const entry of Deno.readDir(base)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(await Deno.readTextFile(new URL(entry.name, base)));
      assert(
        !/["'`]\/me["'`]|\/v1\/me\b|\$\{API_URL\}\/me\b/.test(src),
        `${dir}/${entry.name}: calls /me, which returns the caller's own apiKey`,
      );
    }
  }
});

Deno.test("index: health checks cover service and quota, keyed and titled", () => {
  const keys = app.healthChecks.map((h) => h.key);
  assertEquals(keys.sort(), ["quota", "service"]);
  for (const h of app.healthChecks) {
    assert(h.title.length > 0, `${h.key}: no title`);
    assert(
      h.check !== undefined || h.unavailable !== undefined,
      `${h.key}: neither check nor
      unavailable`,
    );
  }
});

/**
 * An `unavailable` entry reports `unknown`, and at the default `degraded`
 * severity that would pin the app at `unknown` forever. Every declared-absent
 * check must therefore be `informational`.
 *
 * Neither check in this app is currently `unavailable` — both are live probes —
 * but the guard stays, because the failure it catches is invisible until someone
 * downgrades a check to a declaration and does not know the rule.
 */
Deno.test("index: any unavailable health check is informational", () => {
  for (const h of app.healthChecks) {
    if (!h.unavailable) continue;
    assertEquals(
      h.severity,
      "informational",
      `${h.key}: unavailable checks must be informational or they pin the app at unknown`,
    );
    assert(h.unavailable.reason.length > 0, `${h.key}: unavailable without a reason`);
  }
});

/**
 * A signed health check may not widen egress — the spec binds `network.allow` to
 * an unsigned posture, because a status host is exactly the host that must never
 * see a credential.
 */
Deno.test("index: no signed health check declares its own network allowlist", () => {
  for (const h of app.healthChecks) {
    const posture = h.credential ?? (h.kind === "service" ? "none" : "signed");
    if (posture !== "signed") continue;
    assertEquals(
      h.network,
      undefined,
      `${h.key}: signed checks may not widen egress`,
    );
  }
});
