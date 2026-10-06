import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_KEYS = [
  "image-create-html",
  "image-create-url",
  "image-create-template",
  "image-get",
  "image-list",
  "image-delete",
  "template-create",
  "template-version-create",
  "template-list",
  "template-versions-list",
  "template-delete",
  "usage-get",
];

Deno.test("index: exports the 12 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.map((a) => a.key), ACTION_KEYS);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].type, "basic");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** Creation spends image credits and the vendor takes no idempotency key. */
Deno.test("index: credit-spending and id-minting actions are never marked idempotent", () => {
  for (
    const key of [
      "image-create-html",
      "image-create-url",
      "image-create-template",
      "template-create",
      "template-version-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: the manifest allows exactly hcti.io and points at the vendor icon", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["hcti.io"]);
  assertEquals(pkg.w6w.id, "io.w6w.htmlcsstoimage");
  assertEquals(pkg.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: actions never put an Authorization header in a request", async () => {
  for (const f of Deno.readDirSync(new URL("../actions", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization/i.test(src.replace(/\/\*\*[\s\S]*?\*\//g, "")), f.name);
  }
});
