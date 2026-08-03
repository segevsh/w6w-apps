import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { normalizePart, PARTS } from "../lib/client.ts";

Deno.test("index: exports the full action set with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys, [
    "search",
    "get-videos",
    "update-video",
    "delete-video",
    "rate-video",
    "get-channels",
    "list-playlists",
    "create-playlist",
    "update-playlist",
    "delete-playlist",
    "list-playlist-items",
    "add-playlist-item",
    "remove-playlist-item",
    "list-comment-threads",
    "reply-to-comment",
    "list-subscriptions",
  ]);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), `${k} is not kebab-case`);
});

Deno.test("index: every action declares a valid type, description, params and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title, `${a.key} has no title`);
    assert(a.description, `${a.key} has no description`);
    assert(Array.isArray(a.params) && a.params.length > 0, `${a.key} has no params`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} has no output`);
    assertEquals(typeof a.execute, "function", `${a.key} has no execute hook`);
  }
});

Deno.test("index: every perform action declares idempotent honestly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  // The three that mint a new server-side resource are the non-idempotent ones.
  const nonIdempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key);
  assertEquals(nonIdempotent, ["create-playlist", "add-playlist-item", "reply-to-comment"]);
});

Deno.test("index: every action that calls a part-taking endpoint requires part", () => {
  // The methods with no `part` are exactly the deletes and videos.rate.
  const partless = new Set([
    "delete-video",
    "rate-video",
    "delete-playlist",
    "remove-playlist-item",
    // comments.insert fixes part=snippet internally — the API leaves no choice.
    "reply-to-comment",
  ]);
  for (const a of app.actions) {
    const part = a.params!.find((p) => p.key === "part");
    if (partless.has(a.key)) {
      assertEquals(part, undefined, `${a.key} should not expose part`);
      continue;
    }
    assert(part, `${a.key} does not expose part`);
    assertEquals(part.required, true, `${a.key} does not require part`);
    assertEquals(part.type, "multiselect", `${a.key}'s part is not a multiselect`);
    assert(part.default, `${a.key}'s part has no default`);
    assert(Array.isArray(part.options), `${a.key}'s part has no options`);
  }
});

Deno.test("index: every part default is drawn from that resource's documented values", () => {
  const allParts = new Set<string>(Object.values(PARTS).flatMap((p) => [...p] as string[]));
  for (const a of app.actions) {
    const part = a.params!.find((p) => p.key === "part");
    if (!part) continue;
    const values = new Set((part.options as Array<{ value: string }>).map((o) => o.value));
    for (const d of normalizePart(part.default as string).split(",")) {
      assert(allParts.has(d), `${a.key} defaults part to unknown value ${d}`);
      assert(values.has(d), `${a.key} defaults part to ${d}, which is not in its own options`);
    }
  }
});

Deno.test("index: exports oauth2 and api-key, each with test and sign hooks", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2", "api-key"]);
  assertEquals(app.auth.map((a) => a.type), ["oauth2", "apiKey"]);
  for (const a of app.auth) {
    assertEquals(typeof a.test, "function", `${a.key} has no test hook`);
    assertEquals(typeof a.sign, "function", `${a.key} has no sign hook`);
  }
  // Only the API key method prompts for anything.
  assertEquals(app.auth[0].fields, undefined);
  assertEquals(app.auth[1].fields!.length, 1);
});

Deno.test("index: exports the service and quota health checks", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
  for (const h of app.healthChecks) {
    assert(h.unavailable, `${h.key} should be a declared absence`);
    assertEquals(h.severity, "informational", `${h.key} must not pin the verdict at unknown`);
  }
});

Deno.test("index: no action names a credential parameter", () => {
  // Credentials are the sign hook's business only; an action that collected one
  // would be a sandbox violation.
  const banned = /^(api_?key|token|access_?token|secret|authorization|bearer)$/i;
  for (const a of app.actions) {
    for (const p of a.params!) {
      assert(!banned.test(p.key), `${a.key} exposes a credential parameter ${p.key}`);
    }
  }
});

Deno.test("index: every action states its quota cost in its description", () => {
  // Quota is the operative constraint on this API, so it belongs in the surface
  // a user reads, not only in the README.
  for (const a of app.actions) {
    assert(
      /quota unit/i.test(a.description!),
      `${a.key} does not state its quota cost`,
    );
  }
});
