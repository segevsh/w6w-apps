import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customers-get.ts";

const sample = { id: 12, object: "customer", email: "ada@example.com" };

Deno.test("customers-get: reads /customers/12 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!(
    { id: 12, expand: "provider,family", fields: "id,email" },
    ctx,
  ) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/customers/12");
  assertEquals(url.searchParams.get("expand"), "provider,family");
  assertEquals(url.searchParams.get("fields"), "id,email");
  assertEquals(result.id, 12);
  assertEquals(result.object, "customer");
});

Deno.test("customers-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 12 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

Deno.test("customers-get: the id is required and numeric", () => {
  const id = action.params!.find((p) => p.key === "id")!;
  assertEquals(id.required, true);
  assertEquals(id.type, "number");
});
