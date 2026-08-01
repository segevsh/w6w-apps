import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { postbinRequest } from "../../lib/client.ts";

Deno.test("postbinRequest: GETs against the postb.in base URL and returns the parsed JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await postbinRequest<{ ok: boolean }>(ctx, "/api/bin/abc");
  assertEquals(calls[0].url, "https://www.postb.in/api/bin/abc");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.ok, true);
});

Deno.test("postbinRequest: sends the given method", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { binId: "x" } }]);
  await postbinRequest(ctx, "/api/bin", { method: "POST" });
  assertEquals(calls[0].method, "POST");
});

Deno.test("postbinRequest: throws with the vendor's msg field on a non-OK response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { msg: "Bin Does Not Exist" } }]);
  await assertRejects(
    () => postbinRequest(ctx, "/api/bin/missing"),
    Error,
    "Bin Does Not Exist",
  );
});

Deno.test("postbinRequest: throws with the HTTP status when the error body isn't JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "internal error", headers: {} }]);
  await assertRejects(() => postbinRequest(ctx, "/api/bin/x"), Error, "HTTP 500");
});
