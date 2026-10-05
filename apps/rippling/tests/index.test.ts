import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: 44 actions with unique kebab-case keys, each with an execute hook", () => {
  assertEquals(app.actions.length, 44);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(a.key), a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
  }
});

Deno.test("index: every perform declares idempotent explicitly; every non-perform is read/search", () => {
  const perform = app.actions.filter((a) => a.type === "perform");
  assertEquals(perform.length, 12);
  for (const a of perform) assertEquals(typeof a.idempotent, "boolean", a.key);
  // only creates are non-idempotent
  assertEquals(
    perform.filter((a) => a.idempotent === false).map((a) => a.key).sort(),
    [
      "custom-object-record-create",
      "department-create",
      "leave-request-create",
      "team-create",
      "work-location-create",
    ],
  );
});

Deno.test("index: no action hard-codes a credential", async () => {
  const dir = new URL("../actions/", import.meta.url);
  for await (const f of Deno.readDir(dir)) {
    const src = await Deno.readTextFile(new URL(f.name, dir));
    assert(!/authorization/i.test(src), `${f.name} mentions authorization`);
  }
});

Deno.test("index: one bearer auth method and two health checks (service live, quota declared absent)", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-token"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
  assertEquals(typeof app.healthChecks[0].check, "function");
  assertEquals(app.healthChecks[1].severity, "informational");
});

Deno.test("index: manifest names the single host the actions call, and only the API host", () => {
  assertEquals(pkg.w6w.id, "io.w6w.rippling");
  assertEquals(pkg.w6w.network.allow, ["rest.ripplingapis.com"]);
  assertEquals(pkg.w6w.categories, ["hr", "productivity"]);
  assertEquals(pkg.w6w.appearance.icon.svg, "./assets/icon.svg");
});
