import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/frame-create.ts";

Deno.test("frame-create: creates the container other items get parented into", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "f1" } }], { display: {} });
  await action.execute!({ boardId: "b1", title: "Sprint 12", width: 800, height: 600 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/frames");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data, { title: "Sprint 12" });
  assertEquals(body.geometry, { width: 800, height: 600 });
  // Frames take no parent of their own.
  assertEquals(body.parent, undefined);
});
