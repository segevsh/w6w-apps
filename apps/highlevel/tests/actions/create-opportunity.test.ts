import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/create-opportunity.ts";

Deno.test("create-opportunity: POSTs /opportunities/ with locationId and defaults status to open", async () => {
  const { ctx, calls } = mockHighLevelCtx([
    { status: 201, body: { opportunity: { id: "o1" } } },
  ], "loc-1");
  await action.execute!({ pipelineId: "p1", name: "New deal", contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/opportunities/");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.locationId, "loc-1");
  assertEquals(body.pipelineId, "p1");
  assertEquals(body.name, "New deal");
  assertEquals(body.status, "open");
});
