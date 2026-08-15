import { assertEquals } from "@std/assert";
import labelCreate from "../../actions/label-create.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("label-create: POSTs displayName and color", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 201,
      body: envelope({ labelId: "l2", displayName: "Campaigns", color: "#FFFFFF" }),
    }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await labelCreate.execute(
    { displayName: "Campaigns", color: "#FFFFFF" },
    ctx,
  ) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/labels");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Campaigns", color: "#FFFFFF" });
  assertEquals(out, { labelId: "l2", displayName: "Campaigns", color: "#FFFFFF" });
});

Deno.test("label-create: omits color when not given, letting Zoho's own default apply", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 201,
      body: envelope({ labelId: "l3", displayName: "Follow up", color: "#ffd700" }),
    }],
    usConnection(),
  );
  await labelCreate.execute({ displayName: "Follow up" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Follow up" });
});

Deno.test("label-create: is not idempotent", () => {
  assertEquals(labelCreate.idempotent, false);
});
