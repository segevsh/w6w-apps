import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-create.ts";

Deno.test("table-create: sends rows, columns and the page id", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ createTable: { objectId: "t1" } }] } }]);
  await action.execute({ presentationId: "p1", pageObjectId: "g1", rows: 3, columns: 4 }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      createTable: { rows: 3, columns: 4, elementProperties: { pageObjectId: "g1" } },
    }],
  });
});

Deno.test("table-create: leaves size and transform out when unset, so Google auto-sizes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", pageObjectId: "g1", rows: 1, columns: 1 }, ctx);
  const props = JSON.parse(calls[0].body!).requests[0].createTable.elementProperties;
  assertEquals(Object.keys(props), ["pageObjectId"]);
});

Deno.test("table-create: an explicit objectId is forwarded for later cell writes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", pageObjectId: "g1", rows: 2, columns: 2, objectId: "grid" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].createTable.objectId, "grid");
});
