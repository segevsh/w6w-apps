import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sandbox-item-create.ts";

Deno.test("sandbox-item-create: creates an Item with no browser", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { public_token: "public-sandbox-1" } }], {
    display: { environment: "sandbox" },
  });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/sandbox/public_token/create");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.institution_id, "ins_109508");
  assertEquals(sent.initial_products, ["transactions"]);
});

/** In production this route does not exist, and the reason is the design. */
Deno.test("sandbox-item-create: refuses on a production connection, with the reason", async () => {
  const { ctx, calls } = mockCtx([], { display: { environment: "production" } });
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/sandbox/.test(String(err)), String(err));
  assert(/by design/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});
