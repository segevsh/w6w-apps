import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-person.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("enrich-person: posts snake_case data and flags to /enrich-person", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      error: false,
      free_enrichment: false,
      person: { person_id: "p1" },
      company: { name: "X" },
    },
  }]);
  const out = await exec(action, {
    firstName: "Eva",
    lastName: "Kiegler",
    companyWebsite: "intercom.com",
    onlyVerifiedEmail: true,
    enrichMobile: false,
  }, ctx);
  assertEquals(calls[0].url, "https://api.prospeo.io/enrich-person");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {
    only_verified_email: true,
    enrich_mobile: false,
    data: { first_name: "Eva", last_name: "Kiegler", company_website: "intercom.com" },
  });
  assertEquals(out.matched, true);
  assertEquals(out.person, { person_id: "p1" });
  assertEquals(out.free_enrichment, false);
});

Deno.test("enrich-person: NO_MATCH (HTTP 400) is a normal unmatched result", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: true, error_code: "NO_MATCH" } }]);
  assertEquals(await exec(action, { email: "a@b.co" }, ctx), {
    matched: false,
    error_code: "NO_MATCH",
  });
});

Deno.test("enrich-person: other errors throw and empty input never calls the API", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { error: true, error_code: "INSUFFICIENT_CREDITS" },
  }]);
  await assertRejects(() => exec(action, { email: "a@b.co" }, ctx), Error, "INSUFFICIENT_CREDITS");
  await assertRejects(() => exec(action, {}, ctx), Error, "identifying");
  assertEquals(calls.length, 1);
});
