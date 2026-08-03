import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-contacts.ts";

Deno.test("list-contacts: GETs /contact/ with paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ limit: 10 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contact/");
  assertEquals(new URL(calls[0].url).searchParams.get("_limit"), "10");
});

Deno.test("list-contacts: narrows to a lead when lead_id is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ leadId: "lead_1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("lead_id"), "lead_1");
});

Deno.test("list-contacts: omits lead_id entirely when not given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("lead_id"), false);
});
