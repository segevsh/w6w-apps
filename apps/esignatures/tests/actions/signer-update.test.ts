import { assert, assertEquals, assertRejects } from "@std/assert";
import signerUpdate from "../../actions/signer-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signer-update: calls POST /api/contracts/c1/signers/s1 with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated" } }]);
  const out = await signerUpdate.execute(
    {
      contractId: "c1",
      signerId: "s1",
      email: "n@x.com",
      multiFactorAuthentications: ["photo_id"],
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/signers/s1");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    email: "n@x.com",
    multi_factor_authentications: ["photo_id"],
  });
  assert(out.status === "updated", JSON.stringify(out));
});

Deno.test("signer-update: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        signerUpdate.execute(
          {
            contractId: "c1",
            signerId: "s1",
            email: "n@x.com",
            multiFactorAuthentications: ["photo_id"],
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});

Deno.test("signer-update: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated" } }]);
  await signerUpdate.execute(
    {
      ...({
        contractId: "c1",
        signerId: "s1",
        email: "n@x.com",
        multiFactorAuthentications: ["photo_id"],
      }),
      contractId: "a/../b",
    } as never,
    ctx,
  );
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});
