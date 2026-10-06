import { assert, assertEquals, assertRejects } from "@std/assert";
import contractContentUpdate from "../../actions/contract-content-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contract-content-update: calls POST /api/contracts/c1/content with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated", data: { markdown: "b" } } }]);
  const out = await contractContentUpdate.execute(
    {
      contractId: "c1",
      dryRun: true,
      edits: [{ find_markdown: "a", replace_with_markdown: "b" }],
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/content");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    dry_run: "yes",
    edits: [{ find_markdown: "a", replace_with_markdown: "b" }],
  });
  assert(out.status === "updated" && out.markdown === "b", JSON.stringify(out));
});

Deno.test("contract-content-update: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        contractContentUpdate.execute(
          {
            contractId: "c1",
            dryRun: true,
            edits: [{ find_markdown: "a", replace_with_markdown: "b" }],
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

Deno.test("contract-content-update: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated", data: { markdown: "b" } } }]);
  await contractContentUpdate.execute(
    {
      ...({
        contractId: "c1",
        dryRun: true,
        edits: [{ find_markdown: "a", replace_with_markdown: "b" }],
      }),
      contractId: "a/../b",
    } as never,
    ctx,
  );
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});
