import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-session.ts";

Deno.test("create-session: POSTs createSession under the item-id form", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sess-1", persistChanges: true } }]);
  const out = await action.execute({ itemId: "ITEM1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/ITEM1/workbook/createSession");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { sessionId: "sess-1", persistChanges: true });
});

Deno.test("create-session: POSTs createSession under the path form", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sess-2" } }]);
  await action.execute({ itemPath: "Reports/Q3.xlsx" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Reports/Q3.xlsx:/workbook/createSession",
  );
});

Deno.test("create-session: defaults to a persistent session", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "s" } }]);
  await action.execute({ itemId: "ITEM1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { persistChanges: true });
});

Deno.test("create-session: sends persistChanges false for a throwaway session", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "s", persistChanges: false } }]);
  const out = await action.execute({ itemId: "ITEM1", persistChanges: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { persistChanges: false });
  assertEquals(out.persistChanges, false);
});

Deno.test("create-session: never sends a session header — it is creating one", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "s" } }]);
  await action.execute({ itemId: "ITEM1" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], undefined);
});

Deno.test("create-session: refuses an unaddressed workbook before touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "must be addressed");
  assertEquals(calls.length, 0);
});

Deno.test("create-session: refuses both addressing forms at once", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "A", itemPath: "b.xlsx" }, ctx),
    Error,
    "not both",
  );
});
