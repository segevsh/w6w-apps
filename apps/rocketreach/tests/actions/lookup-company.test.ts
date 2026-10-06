import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/lookup-company.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("lookup-company: GETs /company/lookup/ by domain and maps the company", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: 11,
      name: "RocketReach",
      domain: "rocketreach.co",
      num_employees: 150,
      industry: "Software",
      techstack: ["React"],
      address: { city: "Boston" },
    },
  }]);
  const out = await run(action, { domain: "rocketreach.co" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.rocketreach.co/api/v2/company/lookup/?domain=rocketreach.co",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals([out.id, out.numEmployees, out.techstack], [11, 150, ["React"]]);
  assertEquals(out.address.city, "Boston");
});

Deno.test("lookup-company: needs an identifier; a 404 throws", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, {}, none.ctx), Error, "Identify the company");
  assertEquals(none.calls.length, 0);
  const miss = mockCtx([{ status: 404, body: { detail: "Not found" } }]);
  await assertRejects(() => run(action, { name: "Nope" }, miss.ctx), Error, "nothing matched");
});
