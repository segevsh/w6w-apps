import { assert, assertEquals, assertRejects } from "@std/assert";
import contractWithdraw from "../../actions/contract-withdraw.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contract-withdraw: calls POST /api/contracts/c1/withdraw with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "withdrawn" } }]);
  const out = await contractWithdraw.execute({ contractId: "c1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/withdraw");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(out.status === "withdrawn", JSON.stringify(out));
});

Deno.test("contract-withdraw: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(contractWithdraw.execute({ contractId: "c1" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});

Deno.test("contract-withdraw: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "withdrawn" } }]);
  await contractWithdraw.execute({ ...({ contractId: "c1" }), contractId: "a/../b" } as never, ctx);
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});
