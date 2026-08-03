import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-campaigns.ts";

Deno.test("list-campaigns: GETs /api/campaigns with page/limit defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], links: {}, meta: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/campaigns");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("list-campaigns: does NOT invent a status filter — MailerLite defaults to `ready`", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("filter[status]"));
  assert(!params.has("filter[type]"));
});

Deno.test("list-campaigns: forwards the status and type filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ status: "sent", type: "regular" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter[status]"), "sent");
  assertEquals(params.get("filter[type]"), "regular");
});

Deno.test("list-campaigns: the type options match the documented list-filter vocabulary", () => {
  const options = action.params!.find((p) => p.key === "type")!.options as Array<
    { value: string }
  >;
  assertEquals(options.map((o) => o.value), ["regular", "ab", "resend", "rss"]);
});
