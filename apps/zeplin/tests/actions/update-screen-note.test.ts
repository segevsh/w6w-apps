import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-screen-note.ts";
import { mockCtx } from "../_helpers.ts";

const base = { projectId: "p1", screenId: "s1", noteId: "n1" };

Deno.test("update-screen-note: PATCHes status, color and position", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute(
    { ...base, status: "resolved", color: "peach", x: 0.2, y: 0.3 },
    ctx,
  );
  assertEquals(out, { updated: true });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/projects/p1/screens/s1/notes/n1");
  assertEquals(JSON.parse(calls[0].body!), {
    status: "resolved",
    color: "peach",
    position: { x: 0.2, y: 0.3 },
  });
});

Deno.test("update-screen-note: nothing set, a bad status, a half position and a bad color are refused", async () => {
  const { ctx, calls } = mockCtx();
  for (
    const [patch, msg] of [
      [{}, "Set a status"],
      [{ status: "closed" }, "open or resolved"],
      [{ x: 0.1 }, "both X and Y"],
      [{ color: "red" }, "Color must be one of"],
    ] as const
  ) {
    await assertRejects(async () => await action.execute({ ...base, ...patch }, ctx), Error, msg);
  }
  assertEquals(calls.length, 0);
});

Deno.test("update-screen-note: a 404 is thrown with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Note not found" } }]);
  await assertRejects(
    async () => await action.execute({ ...base, status: "open" }, ctx),
    Error,
    "Note not found",
  );
});
