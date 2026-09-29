import { assertEquals } from "@std/assert";
import listingApprove from "../../actions/listing-approve.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("listing-approve: POST /listings/approve with just the id, not idempotent", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: { id: "l1", type: "listing", attributes: { state: "published" } } },
    },
  ]);
  await listingApprove.execute({ id: "l1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/listings/approve");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { id: "l1" });
  assertEquals(listingApprove.idempotent, false);
});

Deno.test("listing-approve: a repeat call against an already-published listing surfaces the 409 conflict", async () => {
  const { ctx } = mockCtx([
    { status: 409, body: errorBody([{ code: "listing-invalid-state", title: "Invalid state" }]) },
  ]);
  let threw = false;
  try {
    await listingApprove.execute({ id: "l1" }, ctx);
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("listing-invalid-state"), true);
  }
  assertEquals(threw, true);
});
