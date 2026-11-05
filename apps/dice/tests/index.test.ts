import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import app from "../index.ts";

test("entry exports ten unique operations, auth and required health coverage", () => {
  assert.equal(app.actions.length, 10);
  assert.equal(new Set(app.actions.map((a) => a.key)).size, 10);
  assert.deepEqual(app.auth.map((a) => a.key), ["api-token"]);
  assert.deepEqual(app.healthChecks.map((h) => h.key), ["api", "service", "quota"]);
  for (const action of app.actions) {
    assert.equal(typeof action.execute, "function");
    assert.notEqual(action.requiresAuth, false);
  }
});
test("manifest grants only the partner API and includes a real SVG", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.w6w.id, "io.w6w.dice");
  assert.deepEqual(pkg.w6w.network.allow, ["partners-endpoint.dice.fm"]);
  assert.match(readFileSync(new URL("../assets/icon.svg", import.meta.url), "utf8"), /<svg/);
});
