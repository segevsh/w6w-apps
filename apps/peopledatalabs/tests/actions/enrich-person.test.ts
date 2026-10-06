import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-person.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("enrich-person: GETs /v5/person/enrich with only the set inputs", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: 200, likelihood: 8, data: { id: "x" } } }]);
  const out = await action.execute!(
    {
      email: "a@b.com",
      company: "acme",
      min_likelihood: 6,
      titlecase: true,
      include_if_matched: false,
      first_name: "",
    } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.peopledatalabs.com");
  assertEquals(url.pathname, "/v5/person/enrich");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    email: "a@b.com",
    company: "acme",
    min_likelihood: "6",
    titlecase: "true",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out, { found: true, status: 200, likelihood: 8, data: { id: "x" } });
});

Deno.test("enrich-person: a 404 is a no-match result, not an error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: 404, error: { type: ["not_found"], message: "No records were found" } },
  }]);
  const out = await action.execute!({ email: "nobody@x.com" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.found, false);
  assertEquals(out.status, 404);
});

Deno.test("enrich-person: the vendor `matched` list is kept, and sandbox switches host", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: 200, data: {}, matched: ["email"] } }]);
  const out = await action.execute!({ email: "a@b.com", sandbox: true } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).origin, "https://sandbox.api.peopledatalabs.com");
  assertEquals(out.matched, ["email"]);
  assertEquals(out.found, true);
});

Deno.test("enrich-person: other errors throw with the vendor type and message", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { status: 402, error: { type: ["payment_required"], message: "Account limit reached" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ email: "a@b.com" } as never, ctx),
    Error,
    "HTTP 402 — payment_required: Account limit reached",
  );
});
