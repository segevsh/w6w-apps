import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import filesList from "../../actions/files-list.ts";

Deno.test("files-list: filters by filename", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": [] } }]);
  const out = await filesList.execute!({ "filename": ".pdf" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/files?filename=.pdf");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("files-list: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await filesList.execute!({ "filename": ".pdf" } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
