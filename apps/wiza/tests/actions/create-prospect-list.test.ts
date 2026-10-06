import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-prospect-list.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const listBody = {
  status: { code: 200 },
  type: "list",
  data: { id: 4, name: "P", status: "queued" },
};
const filters = { job_title: [{ v: "cto", s: "i" }] };

Deno.test("create-prospect-list: posts list settings and filters side by side", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody }]);
  const out = await exec(action, { name: "P", maxProfiles: 10, filters }, ctx);
  assertEquals(calls[0].url, "https://wiza.co/api/prospects/create_prospect_list");
  assertEquals(bodyOf(calls[0]), {
    list: { name: "P", max_profiles: 10, enrichment_level: "partial" },
    filters,
  });
  assertEquals(out, listBody.data);
});

Deno.test("create-prospect-list: email options, duplicates and callback map to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody }]);
  await exec(action, {
    name: "P",
    maxProfiles: 5,
    filters: JSON.stringify(filters),
    enrichmentLevel: "full",
    acceptWork: true,
    acceptPersonal: false,
    acceptGeneric: false,
    skipDuplicates: true,
    callbackUrl: "https://example.com/h",
  }, ctx);
  assertEquals(bodyOf(calls[0]).list, {
    name: "P",
    max_profiles: 5,
    enrichment_level: "full",
    email_options: { accept_work: true, accept_personal: false, accept_generic: false },
    skip_duplicates: true,
    callback_url: "https://example.com/h",
  });
});

Deno.test("create-prospect-list: bad maxProfiles, non-object filters and no email type are refused locally", async () => {
  const none = mockCtx();
  await assertRejects(
    () => exec(action, { name: "P", maxProfiles: 0, filters }, none.ctx),
    Error,
    "positive integer",
  );
  await assertRejects(
    () => exec(action, { name: "P", maxProfiles: 1, filters: "[]" }, none.ctx),
    Error,
    "must be an object",
  );
  await assertRejects(
    () =>
      exec(
        action,
        { name: "P", maxProfiles: 1, filters, acceptWork: false, acceptPersonal: false },
        none.ctx,
      ),
    Error,
    "work or personal",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("create-prospect-list: a 400 invalid-request surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      status: { code: 400, message: "Please add a valid payment method to start this scan." },
    },
  }]);
  await assertRejects(
    () => exec(action, { name: "P", maxProfiles: 1, filters }, ctx),
    Error,
    "payment method",
  );
});
