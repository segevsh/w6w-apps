import { assertEquals } from "@std/assert";
import action from "../../actions/form-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("form-list: unwraps forms, sends the versioned Accept and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { forms: [{ id: 1, title: "A" }] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.moonclerk.com/forms");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.accept, "application/vnd.moonclerk+json;version=1");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { forms: [{ id: 1, title: "A" }] });
});

Deno.test("form-list: a full page reports the next offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { forms: [{ id: 1 }, { id: 2 }] } }]);
  const out = await action.execute!({ count: 2, offset: 4 }, ctx);
  assertEquals(calls[0].url, "https://api.moonclerk.com/forms?count=2&offset=4");
  assertEquals(out, { forms: [{ id: 1 }, { id: 2 }], nextOffset: 6 });
});

Deno.test("form-list: a short page has no next offset", async () => {
  const { ctx } = mockCtx([{ body: { forms: [{ id: 1 }] } }]);
  const out = await action.execute!({ count: 2 }, ctx) as Record<string, unknown>;
  assertEquals("nextOffset" in out, false);
});

Deno.test("form-list: default page size 10 drives nextOffset when count is unset", async () => {
  const forms = Array.from({ length: 10 }, (_, i) => ({ id: i }));
  const { ctx } = mockCtx([{ body: { forms } }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(out.nextOffset, 10);
});

Deno.test("form-list: a rejected key surfaces the vendor text, not the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "HTTP Token: Access denied.\n",
  }]);
  let msg = "";
  try {
    await action.execute!({}, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("rejected"), true);
});
