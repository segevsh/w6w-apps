import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-update.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

test("application-update: PUTs /application/{id} with name always present", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 3, name: "Backup v2" } }], conn);
  await action.execute!({ id: 3, name: "Backup v2", defaultPriority: 2 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/application/3");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Backup v2");
  assertEquals(body.defaultPriority, 2);
});

test("application-update: requires name — Gotify's PUT has no partial form", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ id: 3, name: "" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
