import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 20;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.map((a) => a.key), ["secret-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(typeof a.description === "string" && a.description.length > 0, `${a.key}: description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; money movers are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (
    const key of [
      "transaction-initialize",
      "transfer-initiate",
      "refund-create",
      "subscription-create",
      "plan-create",
      "customer-create",
      "transfer-recipient-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: reads are reads and every write is a perform", () => {
  const performs = app.actions.filter((a) => a.type === "perform").map((a) => a.key).sort();
  assertEquals(performs, [
    "customer-create",
    "customer-update",
    "plan-create",
    "refund-create",
    "subscription-create",
    "transaction-initialize",
    "transfer-initiate",
    "transfer-recipient-create",
  ]);
});

Deno.test("index: every param has a key and a label; none is credential-shaped", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: param without key/label`);
      assert(!/token|apikey|secret/i.test(p.key), `${a.key}/${p.key}`);
    }
  }
});

Deno.test("index: the manifest allows only the API host and the status host", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.paystack.co", "status.paystack.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.paystack");
});

Deno.test("index: the icon is the vendor's PNG, present and non-empty", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(Array.from(bytes.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
  assert(bytes.length > 1000);
});
