import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-worksheet.ts";

Deno.test("delete-worksheet: DELETEs the worksheet and reports 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ itemId: "ITEM1", worksheet: "Sheet1" }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("delete-worksheet: encodes a brace-wrapped id in the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute(
    { itemPath: "Q3.xlsx", worksheet: "{00000000-0001-0000-0000-000000000000}" },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Q3.xlsx:/workbook/worksheets/%7B00000000-0001-0000-0000-000000000000%7D",
  );
});

Deno.test("delete-worksheet: logs a warning, because there is no undo", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1" }, ctx);
  assert(logs.some((l) => l.level === "warn"), "a destructive action should say so");
});

Deno.test("delete-worksheet: forwards the session header", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", sessionId: "s1" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("delete-worksheet: refuses an empty worksheet identifier", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "ITEM1", worksheet: "  " }, ctx),
    Error,
    "empty",
  );
  assertEquals(calls.length, 0);
});
