import { assert, assertEquals, assertRejects } from "@std/assert";
import contractContentGet from "../../actions/contract-content-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contract-content-get: calls GET /api/contracts/c1/content with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { contract_id: "c1", markdown: "# Terms" } } }]);
  const out = await contractContentGet.execute({ contractId: "c1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/content");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(out.markdown === "# Terms", JSON.stringify(out));
});

Deno.test("contract-content-get: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(contractContentGet.execute({ contractId: "c1" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});

Deno.test("contract-content-get: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { contract_id: "c1", markdown: "# Terms" } } }]);
  await contractContentGet.execute(
    { ...({ contractId: "c1" }), contractId: "a/../b" } as never,
    ctx,
  );
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});
