import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-styleguide.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-styleguide: GETs /styleguides/sg1 and returns the vendor object", async () => {
  const doc = { id: "x", name: "N" };
  const { ctx, calls } = mockCtx([{ body: doc }]);
  assertEquals(await action.execute({ styleguideId: "sg1", linkedProject: "p1" }, ctx), doc);
  const u = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(u.origin + u.pathname, "https://api.zeplin.dev/v1/styleguides/sg1");
  assertEquals(u.searchParams.get("linked_project"), "p1");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-styleguide: a 404 is thrown with the vendor message and a membership hint", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(
    async () => await action.execute({ styleguideId: "sg1", linkedProject: "p1" }, ctx),
    Error,
    "Not Found",
  );
});

Deno.test("get-styleguide: a missing styleguideId is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute(
        { ...{ styleguideId: "sg1", linkedProject: "p1" }, styleguideId: " " },
        ctx,
      ),
    Error,
    "is required",
  );
  assertEquals(calls.length, 0);
});
