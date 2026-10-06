import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_KEYS = [
  "render-url",
  "render-html",
  "render-markdown",
  "render-link-create",
  "content-extract",
  "artifact-create",
  "batch-create",
  "batch-get",
  "job-get",
  "account-get",
  "watch-create",
  "watch-test",
  "watch-list",
  "watch-get",
  "watch-runs-list",
  "watch-run",
  "watch-update",
  "watch-delete",
];

Deno.test("index: exports the 18 actions, one bearer auth method and two health checks", () => {
  assertEquals(app.actions.map((a) => a.key), ACTION_KEYS);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].type, "bearer");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: action keys are unique kebab-case with type, description, output, execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; credit-spending ones are false", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (
    const key of [
      "render-url",
      "render-html",
      "render-markdown",
      "artifact-create",
      "batch-create",
      "watch-create",
      "watch-run",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: manifest allows exactly api.rendex.dev and points at the icon", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.rendex.dev"]);
  assertEquals(pkg.w6w.id, "io.w6w.rendex");
  assertEquals(pkg.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: actions never put an Authorization header in a request", async () => {
  for (const f of Deno.readDirSync(new URL("../actions", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization/i.test(src.replace(/\/\*\*[\s\S]*?\*\//g, "")), f.name);
  }
});
