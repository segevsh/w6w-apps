import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/close-session.ts";

Deno.test("close-session: POSTs closeSession with the required session header", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ itemId: "ITEM1", sessionId: "sess-1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/ITEM1/workbook/closeSession");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["workbook-session-id"], "sess-1");
  assertEquals(out, { status: 204 });
});

Deno.test("close-session: works under the path addressing form", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ itemPath: "Reports/Q3.xlsx", sessionId: "s" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Reports/Q3.xlsx:/workbook/closeSession",
  );
});

Deno.test("close-session: sends no body — the endpoint takes none", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ itemId: "ITEM1", sessionId: "s" }, ctx);
  assertEquals(calls[0].body, null);
});

Deno.test("close-session: refuses a blank session id without calling the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "ITEM1", sessionId: "   " }, ctx),
    Error,
    "session ID is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("close-session: declares the session id required, unlike every other action", () => {
  const param = action.params?.find((p) => p.key === "sessionId");
  assertEquals(param?.required, true);
});
