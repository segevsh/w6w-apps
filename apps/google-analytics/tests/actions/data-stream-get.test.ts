import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-stream-get.ts";

const display = { propertyId: "123" };

Deno.test("data-stream-get: returns the stream carrying the measurement ID", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { name: "properties/123/dataStreams/1", webStreamData: { measurementId: "G-ABC123" } },
  }], { display });
  const result = await action.execute!({ dataStreamId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123/dataStreams/1");
  assertEquals(
    (result as Record<string, Record<string, unknown>>).webStreamData.measurementId,
    "G-ABC123",
  );
});

Deno.test("data-stream-get: a blank stream id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`dataStreamId`");
  assertEquals(calls.length, 0);
});
