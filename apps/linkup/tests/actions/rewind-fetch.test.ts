import { assertRejects } from "@std/assert";
import rewindFetch from "../../actions/rewind-fetch.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("rewind-fetch: a 404 is an error naming the exact-URL rule's endpoint", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "NOT_FOUND", message: "no page" } },
  }]);
  await assertRejects(
    async () => await rewindFetch.execute({ url: "https://e.com", asOf: "2025-06-30" }, ctx),
    Error,
    "Linkup 404 for POST /v1/rewind/fetch",
  );
  await assertRejects(
    async () => await rewindFetch.execute({ url: "u", asOf: "x" }, ctx),
    Error,
    "YYYY-MM-DD",
  );
});
