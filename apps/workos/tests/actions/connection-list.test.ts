import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-list.ts";

const page = (data: unknown[], after: string | null = null) => ({
  status: 200,
  body: { data, list_metadata: { after } },
});

/**
 * A `draft` connection is a setup somebody started in the Admin Portal and
 * never finished — invisible until one of their staff cannot log in.
 */
Deno.test("connection-list: can be narrowed to the setups nobody finished", async () => {
  const { ctx } = mockCtx([
    page([{ id: "conn_1", state: "active" }, { id: "conn_2", state: "draft" }]),
  ]);
  const result = await action.execute!({ pendingOnly: true }, ctx) as {
    connections: Array<{ id: string }>;
    count: number;
  };
  assertEquals(result.count, 1);
  assertEquals(result.connections[0].id, "conn_2");
});

Deno.test("connection-list: unfiltered, it returns everything", async () => {
  const { ctx, calls } = mockCtx([
    page([{ id: "conn_1", state: "active" }, { id: "conn_2", state: "draft" }]),
  ]);
  const result = await action.execute!({ organizationId: "org_1" }, ctx) as { count: number };
  assertEquals(result.count, 2);
  assertEquals(new URL(calls[0].url).searchParams.get("organization_id"), "org_1");
});

Deno.test("connection-list: the provider type reaches the wire", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ connectionType: "OktaSAML" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("connection_type"), "OktaSAML");
});
