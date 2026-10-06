import { assertEquals, assertRejects } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import get from "../../actions/deal-get.ts";

const B = "https://acme.salesmate.io/apis/deal/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("deal-get: GETs /deal/v4/:id and unwraps Data", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 3 })]);
  assertEquals(await get.execute({ dealId: 3 }, ctx), { id: 3 });
  assertEquals(calls[0].url, `${B}/3`);
  assertEquals(calls[0].method, "GET");
});

Deno.test("deal-get: an ObjectNotFound failure body rejects", async () => {
  const { ctx } = mockSalesmateCtx([{
    status: 404,
    body: {
      Status: "failure",
      Error: { Code: "4005", Name: "ObjectNotFound", Message: "Object not found" },
    },
  }]);
  await assertRejects(async () => await get.execute({ dealId: 3 }, ctx), Error, "Object not found");
});
