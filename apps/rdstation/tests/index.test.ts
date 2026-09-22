import { assert, assertEquals } from "@std/assert";

import app from "../index.ts";

const ACTION_KEYS = [
  "list-contacts",
  "get-contact",
  "create-contact",
  "update-contact",
  "list-organizations",
  "create-organization",
  "list-deals",
  "create-deal",
  "list-deal-pipelines",
  "list-users",
];

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    categories: string[];
    network: { allow: string[] };
    appearance: {
      icon: { svg?: string; url?: string; alt: string };
      darkMode?: { icon?: { svg?: string; alt?: string } };
    };
    entry: string;
  };
};

Deno.test("index: exports the ten CRM v1 actions, one auth method and one health check", () => {
  assertEquals(app.actions.map((a) => a.key).sort(), [...ACTION_KEYS].sort());
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.length, 1);
  assertEquals(app.healthChecks?.[0].key, "service");
});

Deno.test("index: every action has a unique kebab-case key, a description and an execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");

  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), `not kebab-case: ${action.key}`);
    assert(["read", "search", "perform"].includes(action.type), `${action.key}: bad type`);
    assert(
      typeof action.description === "string" && action.description.length > 0,
      `${action.key}: no description`,
    );
    assertEquals(typeof action.execute, "function", `${action.key}: no execute`);
    assert(Array.isArray(action.output), `${action.key}: no output`);
    assert((action.params ?? []).length > 0, `${action.key}: no params`);
  }
});

Deno.test("index: every perform action declares idempotency, and only the updates are safe to retry", () => {
  for (const action of app.actions) {
    if (action.type !== "perform") continue;
    assertEquals(typeof action.idempotent, "boolean", `${action.key}: no idempotent flag`);
  }
  const idempotent = (key: string) => app.actions.find((a) => a.key === key)?.idempotent;
  assertEquals(idempotent("create-contact"), false);
  assertEquals(idempotent("create-organization"), false);
  assertEquals(idempotent("create-deal"), false);
  assertEquals(idempotent("update-contact"), true);
});

Deno.test("index: every action requires the Connection, so nothing is invoked unauthenticated", () => {
  for (const action of app.actions) {
    assertEquals(action.requiresAuth, undefined, `${action.key}: opts out of auth`);
  }
});

Deno.test("index: the Auth method is a query-string apiKey with a secret field and a probe", () => {
  const method = app.auth![0];
  assertEquals(method.type, "apiKey");
  assertEquals(method.apiKey, { in: "query", name: "token" });
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
  assertEquals(method.fields?.[0].type, "secret");
});

Deno.test("index: the health surface is the service feed plus the derived auth check", () => {
  const check = app.healthChecks![0];
  assertEquals(check.kind, "service");
  assertEquals(check.severity, "informational");
  assertEquals(check.feed?.url, "https://status.rdstation.com/history.rss");
  assertEquals(typeof check.check, "function");
  assertEquals(check.unavailable, undefined);
});

Deno.test("index: the manifest declares the CRM id, one crm category and one allowed host", () => {
  assertEquals(manifest.w6w.id, "io.w6w.rdstation");
  assertEquals(manifest.w6w.displayName, "RD Station CRM");
  assertEquals(manifest.w6w.categories, ["crm"]);
  assertEquals(manifest.w6w.network.allow, ["crm.rdstation.com"]);
  assertEquals(manifest.w6w.entry, "./index.ts");
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(typeof manifest.w6w.appearance.icon.alt, "string");
});

Deno.test("index: the declared icon is a real file next to the manifest", async () => {
  const icon = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(icon.trimStart().startsWith("<svg"), "icon is not an SVG document");
  assert(icon.includes('viewBox="0 0 370 64"'), "icon is not the vendor's developer-portal mark");
});

/**
 * The vendor's lockup is a single dark-navy ink (`#002233`) — perfect on the
 * light tile, invisible on the host's dark one. RD Station's own CDN publishes
 * a matching white-ink variant of the identical artwork right alongside the
 * light one (verified: same 10 paths, same `viewBox`, only the fill differs),
 * so this app ships that vendor file verbatim as `assets/icon.dark.svg` rather
 * than a locally re-inked copy; this pins that it is still declared and present.
 */
Deno.test("index: a white-on-dark variant of the same artwork is declared and present", async () => {
  const ref = manifest.w6w.appearance.darkMode?.icon?.svg;
  assertEquals(ref, "./assets/icon.dark.svg");
  assertEquals(manifest.w6w.appearance.darkMode?.icon?.alt, manifest.w6w.appearance.icon.alt);

  const dark = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  assert(dark.includes('viewBox="0 0 370 64"'), "the dark variant is not the same artwork");
  // Hex casing is not semantic in SVG — this app ships the vendor's own dark
  // asset verbatim (`fill="#FFFFFF"`, uppercase), not a locally re-inked copy.
  assert(/fill="#ffffff"/i.test(dark), "the dark variant is not re-inked");
  assert(!/#002233/i.test(dark), "the dark variant still carries the invisible ink");
});

Deno.test("index: the status feed host is NOT in network.allow (the feed host is implicit)", () => {
  assert(!manifest.w6w.network.allow.includes("status.rdstation.com"));
  assertEquals(manifest.w6w.network.allow.length, 1);
});
