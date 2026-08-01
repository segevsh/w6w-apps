import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/incident-create.ts";

Deno.test("incident-create: POSTs /table/incident with the compacted body", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: { sys_id: "1" } } }]);
  await action.execute({ shortDescription: "Server down" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/incident");
  assertEquals(JSON.parse(calls[0].body!), { short_description: "Server down" });
});

Deno.test("incident-create: includes optional fields only when set", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute(
    {
      shortDescription: "Server down",
      urgency: "1",
      impact: "2",
      callerId: "sysid-caller",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    short_description: "Server down",
    urgency: "1",
    impact: "2",
    caller_id: "sysid-caller",
  });
});

Deno.test("incident-create: merges additionalFields into the body", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute(
    { shortDescription: "s", additionalFields: { state: "2", close_code: "Solved" } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.state, "2");
  assertEquals(body.close_code, "Solved");
});

Deno.test("incident-create: accepts additionalFields as a JSON string", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute(
    { shortDescription: "s", additionalFields: '{"state": "3"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).state, "3");
});
