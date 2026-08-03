import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-worksheet.ts";

Deno.test("update-worksheet: PATCHes the worksheet addressed by name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "{S1}", name: "Renamed" } }]);
  const out = await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", name: "Renamed" }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1",
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
  assertEquals(out.name, "Renamed");
});

Deno.test("update-worksheet: URL-encodes a brace-wrapped worksheet id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemId: "ITEM1",
    worksheet: "{75A18F35-34AA-4F44-97CC-FDC3C05D9F40}",
    position: 3,
  }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/%7B75A18F35-34AA-4F44-97CC-FDC3C05D9F40%7D",
  );
});

Deno.test("update-worksheet: sends only the properties actually set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", position: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { position: 0 });
});

Deno.test("update-worksheet: can hide a sheet outright", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", visibility: "VeryHidden" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { visibility: "VeryHidden" });
});

Deno.test("update-worksheet: refuses an empty PATCH rather than sending one", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "ITEM1", worksheet: "Sheet1" }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-worksheet: converges on an end state, so it is idempotent", () => {
  assertEquals(action.idempotent, true);
});
