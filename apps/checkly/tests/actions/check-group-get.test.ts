import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-group-get.ts";

Deno.test("check-group-get: reads one group by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, locations: ["eu-west-1"] } }]);
  const result = await action.execute!({ groupId: "1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/check-groups/1");
  assertEquals(result.locations, ["eu-west-1"]);
});

/** A group's settings override its members'. */
Deno.test("check-group-get: the output says the group's locations win", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "locations")!.label.includes("override"));
});

Deno.test("check-group-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`groupId`");
  assertEquals(calls.length, 0);
});
