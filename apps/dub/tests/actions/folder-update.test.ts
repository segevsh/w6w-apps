import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/folder-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("folder-update: sends PATCH /folders/f1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "f1", "name": "Sales" } }]);
  const out = await action.execute!({ "folderId": "f1", "name": "Sales" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/folders/f1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "name": "Sales" });
  assertEquals(out, { "id": "f1", "name": "Sales" });
});

Deno.test("folder-update: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "f1", "name": "Sales" } }]);
  await action.execute!({ "folderId": "f1", "name": "Sales" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("folder-update: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "folderId": "f1", "name": "Sales" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("folder-update: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
