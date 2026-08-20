import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-upsert.ts";

Deno.test("contact-upsert: minimal PUT /marketing/contacts with email only", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { job_id: "j-1" } }]);
  const result = await action.execute!({ email: "a@x.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/contacts");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { contacts: [{ email: "a@x.com" }] });
  assertEquals(result, { job_id: "j-1" });
});

Deno.test("contact-upsert: maps additionalFields to snake_case contact fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await action.execute!(
    {
      email: "a@x.com",
      additionalFields: {
        firstName: "Alice",
        lastName: "Smith",
        city: "NYC",
        country: "US",
        postalCode: "10001",
        stateProvinceRegion: "NY",
        addressUi: { address1: "1 Main St", address2: "Apt 2" },
        alternateEmails: "alt1@x.com, alt2@x.com",
        listIds: ["list-a", "list-b"],
        customFields: { fieldId: "cf1", fieldValue: "hello" },
      },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.list_ids, ["list-a", "list-b"]);
  assertEquals(body.contacts[0].first_name, "Alice");
  assertEquals(body.contacts[0].last_name, "Smith");
  assertEquals(body.contacts[0].city, "NYC");
  assertEquals(body.contacts[0].country, "US");
  assertEquals(body.contacts[0].postal_code, "10001");
  assertEquals(body.contacts[0].state_province_region, "NY");
  assertEquals(body.contacts[0].address_line_1, "1 Main St");
  assertEquals(body.contacts[0].address_line_2, "Apt 2");
  assertEquals(body.contacts[0].alternate_emails, ["alt1@x.com", "alt2@x.com"]);
  assertEquals(body.contacts[0].custom_fields, { cf1: "hello" });
});

Deno.test("contact-upsert: missing email rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ email: "" }, ctx),
    Error,
    "`email`",
  );
});

// ── Flattened optional fields ──────────────────────────────────────────────
// The optional contact fields used to sit inside an `additionalFields` group,
// which the studio renders as a raw JSON editor — so none of them were
// reachable as form fields. The test above still covers the old shape as the
// deprecated fallback; these cover the flat one.

Deno.test("contact-upsert: maps flat params to snake_case contact fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await action.execute!(
    {
      email: "a@x.com",
      firstName: "Alice",
      lastName: "Smith",
      city: "NYC",
      country: "US",
      postalCode: "10001",
      stateProvinceRegion: "NY",
      address1: "1 Main St",
      address2: "Apt 2",
      alternateEmails: "alt1@x.com, alt2@x.com",
      customFields: { cf1: "hello" },
      listIds: ["l1", "l2"],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.contacts[0], {
    email: "a@x.com",
    address_line_1: "1 Main St",
    address_line_2: "Apt 2",
    city: "NYC",
    country: "US",
    first_name: "Alice",
    last_name: "Smith",
    postal_code: "10001",
    state_province_region: "NY",
    alternate_emails: ["alt1@x.com", "alt2@x.com"],
    custom_fields: { cf1: "hello" },
  });
  assertEquals(body.list_ids, ["l1", "l2"]);
});

Deno.test("contact-upsert: a flat field wins over the deprecated group", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await action.execute!(
    {
      email: "a@x.com",
      firstName: "New",
      additionalFields: { firstName: "Old", lastName: "Kept" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.contacts[0].first_name, "New");
  assertEquals(body.contacts[0].last_name, "Kept");
});

Deno.test("contact-upsert: an empty declared default does not shadow the fallback", async () => {
  // `listIds`/`customFields` default to `[]`/`{}`. A blank default must defer to
  // the deprecated group, not shadow it.
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await action.execute!(
    {
      email: "a@x.com",
      listIds: [],
      customFields: {},
      additionalFields: { listIds: ["l9"], customFields: { fieldId: "cf1", fieldValue: "v" } },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.list_ids, ["l9"]);
  assertEquals(body.contacts[0].custom_fields, { cf1: "v" });
});

Deno.test("contact-upsert: custom fields accept a map, JSON text, or the old pair row", async () => {
  for (
    const customFields of [
      { cf1: "hello" },
      '{"cf1":"hello"}',
      { fieldId: "cf1", fieldValue: "hello" },
      [{ fieldId: "cf1", fieldValue: "hello" }],
    ]
  ) {
    const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
    await action.execute!({ email: "a@x.com", customFields }, ctx);
    const body = JSON.parse(calls[0].body ?? "");
    assertEquals(body.contacts[0].custom_fields, { cf1: "hello" });
  }
});

Deno.test("contact-upsert: invalid custom-field JSON rejects before the request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ email: "a@x.com", customFields: "{nope" }, ctx),
    Error,
    "`customFields` is not valid JSON.",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-upsert: no param is buried in a `group` the studio renders as JSON", () => {
  const walk = (list: typeof action.params): string[] =>
    (list ?? []).flatMap((p) => [
      ...(p.type === "group" ? [p.key] : []),
      ...walk(p.children),
    ]);
  assertEquals(walk(action.params), []);
});
