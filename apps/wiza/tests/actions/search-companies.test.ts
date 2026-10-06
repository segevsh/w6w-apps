import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-companies.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const filters = { company_industry: ["Computer Software"] };

Deno.test("search-companies: a new search posts filters and size, and returns the page token", async () => {
  const data = {
    total: 50,
    companies: [{ id: "c1", name: "Acme" }],
    next_page_token: "tok",
    credits: { api_credits: { total: 0.5 } },
  };
  const { ctx, calls } = mockCtx([{ body: { status: { code: 200 }, data } }]);
  const out = await exec(action, { filters, size: 1 }, ctx);
  assertEquals(calls[0].url, "https://wiza.co/api/accounts/search");
  assertEquals(bodyOf(calls[0]), { filters, size: 1 });
  assertEquals(out, {
    total: 50,
    companies: data.companies,
    next_page_token: "tok",
    credits: data.credits,
  });
});

Deno.test("search-companies: the next page sends only page_token and size", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { total: 50, companies: [] } } }]);
  const out = await exec(action, { pageToken: "tok", size: 10 }, ctx);
  assertEquals(bodyOf(calls[0]), { page_token: "tok", size: 10 });
  assertEquals(out.next_page_token, null);
});

Deno.test("search-companies: filters and a token together, neither, or size 0 with a token are refused", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { filters, pageToken: "t" }, none.ctx), Error, "not both");
  await assertRejects(() => exec(action, {}, none.ctx), Error, "not both");
  await assertRejects(
    () => exec(action, { pageToken: "t", size: 0 }, none.ctx),
    Error,
    "at least 1",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("search-companies: insufficient credits (400) and rate limit (429) fail with the message", async () => {
  const a = mockCtx([{
    status: 400,
    body: { status: { code: 400, message: "Insufficient API credits" } },
  }]);
  await assertRejects(() => exec(action, { filters }, a.ctx), Error, "Insufficient API credits");
  const b = mockCtx([{ status: 429, body: { status: { code: 429, message: "Rate limit" } } }]);
  await assertRejects(() => exec(action, { filters }, b.ctx), Error, "429");
});
