import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-screen-note.ts";
import { mockCtx } from "../_helpers.ts";

const base = {
  projectId: "p1",
  screenId: "s1",
  content: " Hello ",
  color: "green",
  x: 0.5,
  y: 0.25,
};

Deno.test("create-screen-note: POSTs a point note and returns the created id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "n1" } }]);
  assertEquals(await action.execute(base, ctx), { id: "n1" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/projects/p1/screens/s1/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    content: "Hello",
    position: { x: 0.5, y: 0.25 },
    color: "green",
  });
  assertEquals(action.idempotent, false);
});

Deno.test("create-screen-note: an area note carries both start values", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "n2" } }]);
  await action.execute({ ...base, xStart: 0.1, yStart: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).position, { x: 0.5, y: 0.25, x_start: 0.1, y_start: 0 });
});

Deno.test("create-screen-note: bad coordinates, colors, half an area and empty content are refused", async () => {
  const { ctx, calls } = mockCtx();
  for (
    const [patch, msg] of [
      [{ x: 1.5 }, "between 0 and 1"],
      [{ y: undefined }, "Y is required"],
      [{ color: "red" }, "Color must be one of"],
      [{ xStart: 0.1 }, "both area start"],
      [{ content: "  " }, "Comment is required"],
    ] as const
  ) {
    await assertRejects(async () => await action.execute({ ...base, ...patch }, ctx), Error, msg);
  }
  assertEquals(calls.length, 0);
});
