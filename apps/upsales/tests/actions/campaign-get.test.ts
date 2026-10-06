import { assertEquals, assertRejects } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("campaign-get: GETs /projects/{id} and returns the record", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7, name: "X" }) }]);
  const out = await campaignGet.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/projects/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: { id: 7, name: "X" } });
});

Deno.test("campaign-get: a non-JSON 200 (proxy page) is refused", async () => {
  const { ctx } = mockCtx([{
    headers: { "content-type": "text/html" },
    body: "<html>login</html>",
  }]);
  await assertRejects(async () => await campaignGet.execute({ id: 7 }, ctx), Error, "non-JSON");
});

Deno.test("campaign-get: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await campaignGet.execute({ id: 7 }, ctx), Error, "401");
});

Deno.test("campaign-get: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await campaignGet.execute({ id: 7 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
