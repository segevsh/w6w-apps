import { assertEquals, assertRejects } from "@std/assert";
import legalHoldGet from "../../actions/legal-hold-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("legal-hold-get: GET one hold", async () => {
  const hold = { id: "lgh_x", released_at: null };
  const { ctx, calls } = mockCtx([{ body: hold }]);
  assertEquals(await legalHoldGet.execute({ holdId: "lgh_x" }, ctx), hold);
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds/lgh_x");
});

Deno.test("legal-hold-get: 404 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "none" } }]);
  await assertRejects(
    async () => await legalHoldGet.execute({ holdId: "lgh_x" }, ctx),
    Error,
    "404",
  );
});
