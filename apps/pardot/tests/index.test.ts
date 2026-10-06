import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 25;

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.map((a) => a.key), ["oauth2", "oauth2-sandbox", "access-token"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action declares type, description, params, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(Array.isArray(a.params) && Array.isArray(a.output), a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (
    const key of [
      "prospect-create",
      "list-create",
      "list-membership-create",
      "tag-create",
      "prospect-add-tag",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)!.idempotent, false, key);
  }
  assertEquals(app.actions.find((a) => a.key === "prospect-upsert")!.idempotent, true);
});

Deno.test("index: every query action pages by token and offers no offset", () => {
  const queries = app.actions.filter((a) => a.type === "search");
  assertEquals(queries.length, 13);
  for (const a of queries) {
    const keys = a.params!.map((p) => p.key);
    assert(keys.includes("nextPageToken"), a.key);
    assert(keys.includes("fields"), a.key);
    assert(!keys.includes("offset"), `${a.key}: offset is deprecated and capped at 2000`);
  }
});

Deno.test("index: no action source touches credentials, global fetch or the business unit header", async () => {
  const dir = new URL("../actions/", import.meta.url);
  for await (const f of Deno.readDir(dir)) {
    const src = await Deno.readTextFile(new URL(f.name, dir));
    assert(!/authorization|business-unit|[^.]\bfetch\(/i.test(src), `${f.name} touches auth/fetch`);
  }
});

Deno.test("index: manifest allows exactly the two Account Engagement hosts", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["pi.pardot.com", "pi.demo.pardot.com"]);
});
