import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-group-get.ts";

const display = { display: { region: "us" } };

Deno.test("user-group-get: reads one group on the V2 base", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { id: "g1", name: "Engineering" } }],
    display,
  );
  const result = await action.execute!({ groupId: "g1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://console.jumpcloud.com/api/v2/usergroups/g1");
  assertEquals(result.name, "Engineering");
});

/** A memberQuery means the group computes its own membership. */
Deno.test("user-group-get: the output explains what memberQuery implies", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "memberQuery")!.label.includes("DYNAMIC"));
});

Deno.test("user-group-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`groupId`");
  assertEquals(calls.length, 0);
});
