import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/calendar-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("calendar-get: GETs the record by id with no body", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "c1",
      status: "connected",
      oauth_refresh_token: "RT-SECRET",
      oauth_client_secret: "CS-SECRET",
      oauth_client_id: "cid",
    },
  }]);
  const out = await action.execute!({ id: "c1" }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v2/calendars/c1/");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "c1", status: "connected", oauth_client_id: "cid" });
  assertEquals(JSON.stringify(out).includes("SECRET"), false);
});

Deno.test("calendar-get: percent-encodes the id and reports a 404 by code", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: { detail: "Not found.", code: "not_found" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "a/b" }, ctx),
    Error,
    "HTTP 404 — Not found. (not_found)",
  );
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v2/calendars/a%2Fb/");
});
