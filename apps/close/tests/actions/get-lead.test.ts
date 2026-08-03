import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-lead.ts";

Deno.test("get-lead: is a read action requiring a lead id", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.find((p) => p.key === "leadId")?.required, true);
});

Deno.test("get-lead: GETs /lead/{id}/ keeping the trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "lead_1" } }]);
  await action.execute({ leadId: "lead_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/lead/lead_1/");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-lead: passes _fields through when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", fields: "_all" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("_fields"), "_all");
});

Deno.test("get-lead: url-encodes the id rather than splicing it raw", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead 1/x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/lead/lead%201%2Fx/");
});

Deno.test("get-lead: surfaces a 404 as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "not found" } }]);
  await assertRejects(
    async () => await action.execute({ leadId: "lead_x" }, ctx),
    Error,
    "Close 404",
  );
});
