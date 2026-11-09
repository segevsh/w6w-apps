import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { loadApp } from "@w6w/runtime";

const APP_DIR = new URL("../../", import.meta.url).pathname;

test("runtime: new-message loads as a poll trigger", async () => {
  const app = await loadApp(APP_DIR);
  const trigger = app.triggers.get("new-message");
  assertEquals(trigger?.trigger.type, "poll");
  assertEquals([...(trigger?.hooks ?? [])], ["poll"]);
});
