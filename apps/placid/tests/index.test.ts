import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 26 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 26);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique kebab-case with type, description, execute, output", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; creates and renders are not retry-safe", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const k of ["image-create", "pdf-create", "pdf-merge", "video-create", "template-create"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, false, k);
  }
  for (const k of ["image-delete", "pdf-delete", "video-delete", "template-update"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, true, k);
  }
});

Deno.test("index: the only auth method is a bearer token with a secret field", () => {
  const auth = app.auth[0];
  assertEquals(auth.key, "bearer-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.[0].type, "secret");
});

Deno.test("index: actions never mention an Authorization header", async () => {
  for await (const e of Deno.readDir(new URL("../actions/", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${e.name}`, import.meta.url));
    assert(!/authorization/i.test(src), `${e.name} touches authorization`);
    assert(!/[^.]\bfetch\(/.test(src.replaceAll("ctx.fetch(", "")), `${e.name} uses global fetch`);
  }
});
