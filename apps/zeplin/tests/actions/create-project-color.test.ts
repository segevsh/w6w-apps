import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-project-color.ts";
import { mockCtx } from "../_helpers.ts";

const base = { projectId: "p1", name: "Brand", r: 10, g: 20, b: 30, a: 0.5 };

Deno.test("create-project-color: POSTs the color and returns the created id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "col1" } }]);
  assertEquals(await action.execute({ ...base, sourceId: "S1" }, ctx), { id: "col1" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/projects/p1/colors");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Brand",
    source_id: "S1",
    r: 10,
    g: 20,
    b: 30,
    a: 0.5,
  });
});

Deno.test("create-project-color: alpha defaults to 1; zero channels are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "col2" } }]);
  await action.execute({ projectId: "p1", name: "Black", r: 0, g: 0, b: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Black", r: 0, g: 0, b: 0, a: 1 });
});

Deno.test("create-project-color: out-of-range channels, long names and missing values are refused", async () => {
  const { ctx, calls } = mockCtx();
  for (
    const [patch, msg] of [
      [{ r: 256 }, "Red must be an integer"],
      [{ g: 1.5 }, "Green must be an integer"],
      [{ b: undefined }, "Blue is required"],
      [{ a: 2 }, "Alpha must be"],
      [{ name: "x".repeat(101) }, "at most 100"],
      [{ name: " " }, "Name is required"],
    ] as const
  ) {
    await assertRejects(async () => await action.execute({ ...base, ...patch }, ctx), Error, msg);
  }
  assertEquals(calls.length, 0);
});
