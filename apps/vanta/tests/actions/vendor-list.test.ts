import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/vendor-list.ts";

Deno.test("vendor-list: reads the inventory", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "v1", name: "Acme Cloud" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/vendors");
  assertEquals(result.count, 1);
});

/** Status is what turns an inventory into a review queue. */
Deno.test("vendor-list: the status filter is sent as repeated keys", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ statuses: "IN_REVIEW, APPROVED" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("statusMatchesAny"),
    ["IN_REVIEW", "APPROVED"],
  );
});

/** How a workflow checks for a duplicate before creating one. */
Deno.test("vendor-list: the name filter reaches the wire", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ name: "acme" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("name"), "acme");
});

Deno.test("vendor-list: says why the status filter matters", () => {
  assert(/review queue/.test(action.description!), action.description);
});
