import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connector-create.ts";

Deno.test("connector-create: sends both endpoints, which Miro requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }], { display: {} });
  await action.execute!({
    boardId: "b1",
    startItemId: "i1",
    endItemId: "i2",
    shape: "curved",
    caption: "then",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/connectors");
  assertEquals(JSON.parse(calls[0].body!), {
    startItem: { id: "i1" },
    endItem: { id: "i2" },
    shape: "curved",
    captions: [{ content: "then" }],
  });
});

Deno.test("connector-create: both ends are required", async () => {
  const noStart = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", endItemId: "i2" }, noStart.ctx),
    Error,
    "`startItemId`",
  );
  const noEnd = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", startItemId: "i1" }, noEnd.ctx),
    Error,
    "`endItemId`",
  );
  assertEquals(noStart.calls.length + noEnd.calls.length, 0);
});
