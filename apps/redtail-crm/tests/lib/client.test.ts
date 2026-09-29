import { assert, assertEquals, assertRejects } from "@std/assert";
import { API_URL, compact, errorMessage, RedtailClient, unset } from "../../lib/client.ts";
import { mockCtx, UNAUTHORIZED_401 } from "../_helpers.ts";

Deno.test("API_URL: is the fixed host, not a per-pod subdomain", () => {
  assertEquals(API_URL, "https://crm.redtailtechnology.com/api/public/v1");
});

Deno.test("errorMessage: reads the vendor's {message} envelope", () => {
  assertEquals(errorMessage('{"message":"nope"}'), "nope");
});

Deno.test("errorMessage: falls back to raw text for a non-JSON or non-matching body", () => {
  assertEquals(errorMessage("plain text"), "plain text");
  assertEquals(errorMessage('{"other":"x"}'), '{"other":"x"}');
  assertEquals(errorMessage(""), "");
});

Deno.test("compact: drops only undefined keys", () => {
  assertEquals(compact({ a: 1, b: undefined, c: 0, d: "", e: null }), {
    a: 1,
    c: 0,
    d: "",
    e: null,
  });
});

Deno.test("unset: blank string becomes undefined, everything else passes through", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
  assertEquals(unset(undefined), undefined);
});

Deno.test("RedtailClient.request: builds the URL under API_URL and skips empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new RedtailClient(ctx).request("/contacts", {
    query: { page: 1, empty: "", missing: undefined, nil: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://crm.redtailtechnology.com/api/public/v1/contacts",
  );
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.has("empty"), false);
  assertEquals(url.searchParams.has("missing"), false);
  assertEquals(url.searchParams.has("nil"), false);
});

Deno.test("RedtailClient.request: merges extra headers, skipping blank/undefined values", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new RedtailClient(ctx).request("/contacts", {
    headers: { pagesize: 10, include: undefined, empty: "" },
  });
  assertEquals(calls[0].headers["pagesize"], "10");
  assertEquals(calls[0].headers["include"], undefined);
  assertEquals(calls[0].headers["empty"], undefined);
});

Deno.test("RedtailClient.request: never sets Authorization itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new RedtailClient(ctx).request("/contacts");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("RedtailClient.request: extracts meta from the parsed body", async () => {
  const { ctx } = mockCtx([{
    body: { contacts: [{ id: 1 }], meta: { total_records: 1, total_pages: 1 } },
  }]);
  const res = await new RedtailClient(ctx).request<{ contacts: unknown[] }>("/contacts");
  assertEquals(res.meta, { total_records: 1, total_pages: 1 });
  assertEquals(res.status, 200);
});

Deno.test("RedtailClient.request: a 204 No Content parses to no data and no meta", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const res = await new RedtailClient(ctx).request("/opportunities/1", { method: "DELETE" });
  assertEquals(res.data, undefined);
  assertEquals(res.meta, undefined);
  assertEquals(res.status, 204);
});

Deno.test("RedtailClient.request: a non-ok response throws with the vendor's message", async () => {
  const { ctx } = mockCtx([UNAUTHORIZED_401]);
  await assertRejects(
    () => new RedtailClient(ctx).request("/contacts"),
    Error,
    "Authorization header missing",
  );
});

Deno.test("RedtailClient.request: a POST sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true, id: 1 } }]);
  await new RedtailClient(ctx).request("/contacts", {
    method: "POST",
    body: { first_name: "A" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(calls[0].body!.includes('"first_name":"A"'));
});
