import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audience-export-create.ts";

const display = { propertyId: "123" };

/** Starts a long-running job; it does not return the users. */
Deno.test("audience-export-create: posts the export and returns Google's Operation", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { name: "properties/123/audienceExports/9", done: false },
  }], { display });
  const result = await action.execute!({
    audience: "properties/123/audiences/7",
    dimensions: "deviceId",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123/audienceExports");
  assertEquals(JSON.parse(calls[0].body!), {
    audience: "properties/123/audiences/7",
    dimensions: [{ name: "deviceId" }],
  });
  assertEquals((result as Record<string, unknown>).done, false);
});

Deno.test("audience-export-create: audience and dimensions are both required", async () => {
  const noAudience = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ dimensions: "deviceId" }, noAudience.ctx),
    Error,
    "`audience`",
  );
  const noDims = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ audience: "properties/1/audiences/2" }, noDims.ctx),
    Error,
    "`dimensions`",
  );
  assertEquals(noAudience.calls.length + noDims.calls.length, 0);
});
