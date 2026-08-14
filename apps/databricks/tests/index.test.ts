import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 8 actions with unique keys", () => {
  assertEquals(app.actions.length, 8);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.slice().sort(), [
    "catalog-create",
    "catalog-delete",
    "catalog-get",
    "catalog-list",
    "sql-statement-execute",
    "sql-statement-get",
    "table-get",
    "table-list",
  ]);
});

Deno.test("index: exports the bearer-token auth method", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["bearer-token"]);
});

Deno.test("index: exports 2 health checks with unique keys", () => {
  const checks = app.healthChecks ?? [];
  assertEquals(checks.length, 2);
  assertEquals(checks.map((c) => c.key).sort(), ["service", "workspace"]);
});

Deno.test("index: every action has a kebab-case key and a valid type", () => {
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), true, `bad key: ${action.key}`);
    assertEquals(validTypes.has(action.type), true, `bad type on ${action.key}`);
    assert(action.title.length > 0, `${action.key} has no title`);
    assert((action.description ?? "").length > 0, `${action.key} has no description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} missing idempotent flag`);
    }
  }
});

Deno.test("index: every action declares its outputs", () => {
  for (const action of app.actions) {
    const output = action.output;
    assert(Array.isArray(output) && output.length > 0, `${action.key} declares no output`);
  }
});

/**
 * A workspace is a per-customer deployment, so the host is per-Connection — but
 * it is always under one of Databricks' three cloud domains. Allowlisting those
 * suffixes is narrower than the bare `*` the self-hosted apps in this pack need,
 * and it is what keeps a mistyped workspace URL from reaching an arbitrary host.
 */
Deno.test("index: egress is scoped to Databricks' three cloud domains", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network?: { allow?: string[] }; appearance: { icon: unknown } } };

  assertEquals(manifest.w6w.id, "io.w6w.databricks");
  assertEquals(manifest.w6w.network?.allow?.slice().sort(), [
    "*.azuredatabricks.net",
    "*.cloud.databricks.com",
    "*.gcp.databricks.com",
  ]);
  assert(!manifest.w6w.network?.allow?.includes("*"), "egress must not widen to every host");
  assert(manifest.w6w.appearance.icon, "the app declares no icon");
});

/**
 * Jobs and Clusters were deliberately left out: n8n's own Databricks node does
 * not implement them either, and their request shapes could not be verified —
 * so nothing was invented for them. This pins that decision.
 */
Deno.test("index: covers SQL and Unity Catalog only — no invented Jobs/Clusters", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals([...resources].sort(), ["catalog", "sql-statement", "table"]);
});
