import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import teamCreate from "../../actions/team-create.ts";

Deno.test("team-create: POSTs /teams/ mapping parentId to parent_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "t1", name: "SRE" } }]);
  const out = await teamCreate.execute({ name: "SRE", parentId: "t0" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/teams/");
  assertEquals(JSON.parse(calls[0].body!), { name: "SRE", parent_id: "t0" });
  assertEquals(out.id, "t1");
});

Deno.test("team-create: requires a name and is not idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => teamCreate.execute({}, ctx)),
    Error,
    "name is required",
  );
  assertEquals(calls.length, 0);
  assertEquals(teamCreate.idempotent, false);
});
