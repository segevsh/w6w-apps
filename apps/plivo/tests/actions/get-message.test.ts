import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

Deno.test("get-message: GETs Message/m-1/ with the trailing slash", async () => {
  const body = { api_id: "a1" };
  const { ctx, calls } = mockCtx([{ body }], CONN);
  const out = await action.execute!({ messageUuid: "m-1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, BASE + "Message/m-1/");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, body);
});

Deno.test("get-message: a vendor error surfaces status and body", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "not found" }], CONN);
  await assertRejects(
    async () => await action.execute!({ messageUuid: "m-1" }, ctx),
    Error,
    "Plivo 404",
  );
});

Deno.test("get-message: a missing connection Auth ID is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ messageUuid: "m-1" }, ctx),
    Error,
    "Auth ID missing",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-message: a blank UUID is refused rather than hitting the collection URL", async () => {
  const { ctx, calls } = mockCtx([], CONN);
  await assertRejects(
    async () => await action.execute!({ messageUuid: "  " }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
