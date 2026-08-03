import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: default-exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 14);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: action keys are unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const k of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), `\`${k}\` is not kebab-case`);
  }
});

Deno.test("index: exposes the expected action set", () => {
  assertEquals(
    app.actions.map((a) => a.key).sort(),
    [
      "create-ad-group",
      "create-campaign",
      "create-campaign-budget",
      "get-campaign",
      "get-customer",
      "list-accessible-customers",
      "list-ad-groups",
      "list-ads",
      "list-campaigns",
      "list-customer-clients",
      "list-keywords",
      "performance-report",
      "search",
      "update-campaign",
    ].sort(),
  );
});

Deno.test("index: every action declares a type, title and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(a.title, `${a.key}: missing title`);
    assert(a.description, `${a.key}: missing description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: missing output`);
  }
});

Deno.test("index: every `perform` action declares idempotency honestly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.length, 4);
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: missing idempotent`);
  }
  // Creates mint a new resource each call; the update sets named fields to
  // given values, so replaying it lands in the same state.
  assertEquals(
    performs.filter((a) => a.idempotent).map((a) => a.key),
    ["update-campaign"],
  );
});

/**
 * The developer token is the whole reason this app could get credential
 * handling wrong: it is a *header*, so it is easy to reach for as an action
 * param. It must not be one — no action may ask for it, and no param may be
 * marked secret, because actions never receive credentials at all.
 */
Deno.test("index: no action asks for a credential as a param", () => {
  const forbidden =
    /^(developer|access|refresh|bearer)?_?token$|secret|password|credential|apiKey/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !forbidden.test(p.key),
        `${a.key}: param \`${p.key}\` looks like a credential — those belong in auth`,
      );
      assert(
        p.type !== "secret" && !p.secret,
        `${a.key}: param \`${p.key}\` is secret — actions never receive credentials`,
      );
    }
  }
});

Deno.test("index: only the auth method declares the developer token", () => {
  const fields = app.auth?.[0].fields ?? [];
  const developerToken = fields.find((f) => f.key === "developerToken");
  assert(developerToken, "auth is missing the developerToken field");
  assertEquals(developerToken.type, "secret");
  assertEquals(developerToken.required, true);
});
