import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-webhook.ts";
import { WEBHOOK_ACTIONS } from "../../lib/triggers.ts";

test("create-webhook: POSTs wrapped-free body to org webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({
    organizationId: "o 1",
    endpointUrl: "https://x.example/hook",
    actions: ["order.placed", "event.created"],
    eventId: "55",
    extra: { foo: "bar" },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/o%201/webhooks/");
  assertEquals(JSON.parse(calls[0].body!), {
    endpoint_url: "https://x.example/hook",
    actions: "order.placed,event.created",
    event_id: "55",
    foo: "bar",
  });
});

test("create-webhook: minimal body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ organizationId: "1", endpointUrl: "https://x.example" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { endpoint_url: "https://x.example" });
});

test("create-webhook: select all sends every supported action as CSV, not a wildcard", async () => {
  const param = action.params!.find((p) => p.key === "actions")!;
  assertEquals(param.type, "multiselect");
  assertEquals(param.ui, "checkboxes");
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({
    organizationId: "1",
    endpointUrl: "https://x.example",
    actions: [...WEBHOOK_ACTIONS],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).actions, WEBHOOK_ACTIONS.join(","));
});

test("create-webhook: clearing actions omits the parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { organizationId: "1", endpointUrl: "https://x.example", actions: [] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { endpoint_url: "https://x.example" });
});
