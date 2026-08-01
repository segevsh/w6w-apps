import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/incident-get-many.ts";

Deno.test("incident-get-many: GETs /table/incident with pagination params", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: [] } }]);
  await action.execute({ limit: 25, offset: 50 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.service-now.com/api/now/table/incident?sysparm_limit=25&sysparm_offset=50",
  );
});

Deno.test("incident-get-many: forwards an encoded query", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: [] } }]);
  await action.execute({ query: "active=true^priority=1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sysparm_query"), "active=true^priority=1");
});
