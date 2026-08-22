import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transformation-create.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("transformation-create: names the definition in the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "created" } }], conn);
  await action.execute!({ name: "product_thumb", transformation: "w_400,c_fill" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/transformations/product_thumb");
  assertEquals(new URLSearchParams(calls[0].body!).get("transformation"), "w_400,c_fill");
});

Deno.test("transformation-create: both the name and the definition are required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ transformation: "w_1" }, ctx),
    Error,
    "name",
  );
  await assertRejects(
    async () => await action.execute!({ name: "x" }, ctx),
    Error,
    "transformation",
  );
  assertEquals(calls.length, 0);
});
