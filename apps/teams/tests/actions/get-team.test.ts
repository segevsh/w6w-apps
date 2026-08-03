import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-team.ts";

Deno.test("get-team: GETs /teams/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", displayName: "Contoso" } }]);
  const out = await action.execute({ teamId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/teams/t1");
  assertEquals(out.displayName, "Contoso");
});

Deno.test("get-team: maps $select and $expand to comma-separated lists", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    teamId: "t1",
    select: ["id", " displayName ", ""],
    expand: ["members"],
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$select"), "id,displayName");
  assertEquals(q.get("$expand"), "members");
});

Deno.test("get-team: omits the OData params entirely when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ teamId: "t1" }, ctx);
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("get-team: is a read action, so it declares no idempotency", () => {
  assertEquals(action.type, "read");
  assertEquals(action.idempotent, undefined);
});
