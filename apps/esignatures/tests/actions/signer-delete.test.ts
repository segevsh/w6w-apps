import { assert, assertEquals, assertRejects } from "@std/assert";
import signerDelete from "../../actions/signer-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signer-delete: calls POST /api/contracts/c1/signers/s1/delete with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "queued" } }]);
  const out = await signerDelete.execute(
    { contractId: "c1", signerId: "s1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/signers/s1/delete");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(out.status === "queued", JSON.stringify(out));
});

Deno.test("signer-delete: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(signerDelete.execute({ contractId: "c1", signerId: "s1" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});

Deno.test("signer-delete: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "queued" } }]);
  await signerDelete.execute(
    { ...({ contractId: "c1", signerId: "s1" }), contractId: "a/../b" } as never,
    ctx,
  );
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});
