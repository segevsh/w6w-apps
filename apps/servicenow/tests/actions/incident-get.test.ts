import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/incident-get.ts";

Deno.test("incident-get: GETs /table/incident/{sysId}", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: { sys_id: "abc" } } }]);
  const out = await action.execute({ sysId: "abc" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/incident/abc");
  assertEquals(out, { result: { sys_id: "abc" } });
});

Deno.test("incident-get: encodes the sys_id and forwards field/display options", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute({ sysId: "a/b", fields: "number,state", displayValue: "true" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.service-now.com/api/now/table/incident/a%2Fb?sysparm_fields=number%2Cstate&sysparm_display_value=true",
  );
});
