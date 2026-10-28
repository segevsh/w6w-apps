import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/clear-range.ts";

Deno.test("clear-range: POSTs to range(address='…')/clear", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    address: "A2:D100",
  }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/range(address='A2:D100')/clear",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { status: 204 });
});

Deno.test("clear-range: defaults to clearing contents, not formatting", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "A1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { applyTo: "Contents" });
});

Deno.test("clear-range: passes the documented applyTo values through", async () => {
  for (const applyTo of ["All", "Formats", "Contents"]) {
    const { ctx, calls } = mockCtx([{ status: 204 }]);
    await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "A1", applyTo }, ctx);
    assertEquals(JSON.parse(calls[0].body!), { applyTo });
  }
});

Deno.test("clear-range: accepts the 200 the reference's prose describes as well as its 204", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "A1" }, ctx);
  assertEquals(out, { status: 200 });
});

Deno.test("clear-range: forwards the session header", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    address: "A1",
    sessionId: "s1",
  }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});
