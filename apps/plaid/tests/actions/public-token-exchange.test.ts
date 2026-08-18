import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/public-token-exchange.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("public-token-exchange: exchanges the token", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { access_token: "access-sandbox-1", item_id: "item1" },
  }], conn);
  const out = await action.execute!({ publicToken: "public-sandbox-1" }, ctx) as {
    item_id: string;
  };
  assertEquals(out.item_id, "item1");
  assertEquals(new URL(calls[0].url).pathname, "/item/public_token/exchange");
});

/** The response is the most sensitive thing this app produces. */
Deno.test("public-token-exchange: never logs the token it received or returned", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { access_token: "access-sandbox-1", item_id: "item1" },
  }], conn);
  await action.execute!({ publicToken: "public-sandbox-1" }, ctx);
  const logged = JSON.stringify(logs);
  assert(!logged.includes("access-sandbox-1"), logged);
  assert(!logged.includes("public-sandbox-1"), logged);
});

Deno.test("public-token-exchange: labels the output as a long-lived secret", () => {
  const field = (action.output as Array<{ key: string; label: string }>)
    .find((o) => o.key === "access_token")!;
  assert(/secret/i.test(field.label), field.label);
});

Deno.test("public-token-exchange: a missing public token is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "publicToken");
});
