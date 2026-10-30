import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: declares two auth methods, 26 actions and two health checks", () => {
  assertEquals(app.auth?.map((a) => a.key), ["oauth2", "access-token"]);
  assertEquals(app.actions.length, 26);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

test("index: every action key is unique and has title, type, execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assertEquals(typeof a.title, "string");
    assertEquals(typeof a.type, "string");
    assertEquals(typeof a.execute, "function");
  }
});

test("index: non-idempotent performs are flagged", () => {
  const flagged = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(flagged, [
    "create-carousel-container",
    "create-comment",
    "create-media-container",
    "publish-container",
    "reply-to-comment",
    "reply-to-mention",
  ]);
});
