import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track.ts";

Deno.test("track: posts name + data to /customers/:id/events", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { personId: "u1", eventName: "purchase", data: { price: "23.45" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/customers/u1/events");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "purchase", data: { price: "23.45" } });
  assertEquals(result, { success: true });
});

Deno.test("track: omits data when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ personId: "u1", eventName: "updated" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "updated" });
});

Deno.test("track: eventType maps to the `type` field (e.g. page views)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ personId: "u1", eventName: "/home", eventType: "page" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "/home", type: "page" });
});

Deno.test("track: rejects a blank personId or eventName", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ personId: "", eventName: "e" }, ctx),
    Error,
    "`personId` is required",
  );
  await assertRejects(
    async () => await action.execute!({ personId: "u1", eventName: "" }, ctx),
    Error,
    "`eventName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track: uses the eu host when the connection's region is eu", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute!({ personId: "u1", eventName: "e" }, ctx);
  assertEquals(calls[0].url, "https://track-eu.customer.io/api/v1/customers/u1/events");
});
