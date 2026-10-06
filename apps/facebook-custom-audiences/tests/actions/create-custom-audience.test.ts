import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-custom-audience.ts";

const form = (body: string | null) => new URLSearchParams(body ?? "");

Deno.test("create-custom-audience: POSTs subtype=CUSTOM with the file source", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "900" } }]);
  const out = await action.execute({
    adAccountId: "12",
    name: "Buyers",
    description: "People who bought",
    customerFileSource: "USER_PROVIDED_ONLY",
    retentionDays: 30,
  }, ctx);
  assertEquals(out, { id: "900" });
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/act_12/customaudiences");
  const f = form(calls[0].body);
  assertEquals(f.get("subtype"), "CUSTOM");
  assertEquals(f.get("name"), "Buyers");
  assertEquals(f.get("customer_file_source"), "USER_PROVIDED_ONLY");
  assertEquals(f.get("retention_days"), "30");
  assertEquals(f.has("opt_out_link"), false);
});

Deno.test("create-custom-audience: refuses a blank name before any call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ adAccountId: "1", name: " ", customerFileSource: "X" }, ctx),
      ),
    Error,
    "Name",
  );
  assertEquals(calls.length, 0);
});
