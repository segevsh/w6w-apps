import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import listWebhooks from "../../actions/list-webhooks.ts";

Deno.test("list-webhooks: GET /v1/webhooks, paginated", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: {}, data: [] } }]);
  await listWebhooks.execute({ page: 1, perPage: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/webhooks");
  assertEquals(url.searchParams.get("per_page"), "20");
});
