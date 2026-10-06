import { assert, assertEquals, assertRejects } from "@std/assert";
import contractPlaceholdersUpdate from "../../actions/contract-placeholders-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contract-placeholders-update: calls POST /api/contracts/c1/placeholder_fields with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated" } }]);
  const out = await contractPlaceholdersUpdate.execute(
    {
      contractId: "c1",
      placeholderFields: JSON.stringify([{ placeholder_key: "k", replace_with_text: "v" }]),
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/placeholder_fields");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    placeholder_fields: [{ placeholder_key: "k", replace_with_text: "v" }],
  });
  assert(out.status === "updated", JSON.stringify(out));
});

Deno.test("contract-placeholders-update: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        contractPlaceholdersUpdate.execute(
          {
            contractId: "c1",
            placeholderFields: JSON.stringify([{ placeholder_key: "k", replace_with_text: "v" }]),
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

Deno.test("contract-placeholders-update: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated" } }]);
  await contractPlaceholdersUpdate.execute(
    {
      ...({
        contractId: "c1",
        placeholderFields: JSON.stringify([{ placeholder_key: "k", replace_with_text: "v" }]),
      }),
      contractId: "a/../b",
    } as never,
    ctx,
  );
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});
