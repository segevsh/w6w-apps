import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-worksheet.ts";

Deno.test("add-worksheet: POSTs to the documented /worksheets/add path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "{S9}", name: "Q3" } }]);
  const out = await action.execute({ itemId: "ITEM1", name: "Q3" }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/add",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Q3" });
  assertEquals(out.name, "Q3");
});

Deno.test("add-worksheet: omits the name entirely when none is given", async () => {
  // Excel names the sheet itself; sending `{"name": null}` would be a different
  // request than sending `{}`.
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "{S9}", name: "Sheet2" } }]);
  await action.execute({ itemId: "ITEM1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("add-worksheet: treats a whitespace-only name as absent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ itemId: "ITEM1", name: "   " }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("add-worksheet: works under the path form and forwards the session", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ itemPath: "Q3.xlsx", name: "New", sessionId: "s1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Q3.xlsx:/workbook/worksheets/add",
  );
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("add-worksheet: is honestly non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
