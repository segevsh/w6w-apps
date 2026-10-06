import { assert, assertEquals, assertRejects } from "@std/assert";
import contractSendDraft from "../../actions/contract-send-draft.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contract-send-draft: calls POST /api/contracts/c1/send_draft with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "queued" } }]);
  const out = await contractSendDraft.execute({ contractId: "c1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/send_draft");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(out.status === "queued", JSON.stringify(out));
});

Deno.test("contract-send-draft: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(contractSendDraft.execute({ contractId: "c1" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});

Deno.test("contract-send-draft: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "queued" } }]);
  await contractSendDraft.execute(
    { ...({ contractId: "c1" }), contractId: "a/../b" } as never,
    ctx,
  );
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});
