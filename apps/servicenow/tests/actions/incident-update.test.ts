import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/incident-update.ts";

Deno.test("incident-update: PATCHes /table/incident/{sysId} with only the set fields", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute({ sysId: "abc", shortDescription: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/incident/abc");
  assertEquals(JSON.parse(calls[0].body!), { short_description: "Renamed" });
});

Deno.test("incident-update: merges additionalFields into the body", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute({ sysId: "abc", additionalFields: { state: "6" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).state, "6");
});
