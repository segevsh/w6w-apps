import { assertEquals, assertRejects } from "@std/assert";
import selfGet from "../../actions/self-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("self-get: GETs /self", async () => {
  const { ctx, calls } = mockCtx([{
    body: { errors: null, data: { id: 70896, name: "Api docs" } },
  }]);
  const out = await selfGet.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/self`);
  assertEquals(out, { data: { id: 70896, name: "Api docs" } });
});

Deno.test("self-get: an `errors` envelope is treated as a failure", async () => {
  const { ctx } = mockCtx([{ body: { errors: { key: "Nope", msg: "bad" }, data: null } }]);
  await assertRejects(async () => await selfGet.execute({}, ctx), Error, "Nope");
});

Deno.test("self-get: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await selfGet.execute({}, ctx), Error, "401");
});

Deno.test("self-get: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(async () => await selfGet.execute({}, ctx), Error, "ThrottleLimit");
});
