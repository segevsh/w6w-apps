import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/folder-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("folder-create: sends POST /folders with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "f1", "name": "Marketing" } }]);
  const out = await action.execute!({ "name": "Marketing", "accessLevel": "read" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/folders");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Marketing",
    "accessLevel": "read",
  });
  assertEquals(out, { "id": "f1", "name": "Marketing" });
});

Deno.test("folder-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "f1", "name": "Marketing" } }]);
  await action.execute!({ "name": "Marketing", "accessLevel": "read" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("folder-create: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "name": "Marketing", "accessLevel": "read" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("folder-create: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
