import { assert, assertEquals } from "@std/assert";
import groupUpdate from "../../actions/group-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-update: POST /api/v3/groups/update with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await groupUpdate.execute({ "groupId": 100, "name": "sample name" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/groups/update");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "name": "sample name" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("group-update: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await groupUpdate.execute({ "groupId": 100, "name": "sample name" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("group-update: is declared idempotent", () => {
  assertEquals(groupUpdate.idempotent, true);
});

Deno.test("group-update: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await groupUpdate.execute({ "groupId": 100, "name": "sample name" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("group-update: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await groupUpdate.execute({ "groupId": 100, "name": "sample name" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
