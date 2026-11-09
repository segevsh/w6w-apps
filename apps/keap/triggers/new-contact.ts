import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

/**
 * New contact — polls the existing `contact-list` action (`GET /rest/v2/contacts`), newest first
 * by `create_time`, and emits each contact it has not seen. The first check only records what
 * exists.
 *
 * Why a poll and not a REST hook: Keap's hook verification is a handshake in which KEAP picks the
 * secret (`X-Hook-Secret`), so there is nothing the subscription could have stored beforehand to
 * authenticate later deliveries against; see the README.
 */
export default pollFromListAction<Record<string, never>>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each new Keap contact, newest check first.",
  action: contactList as unknown as ActionDefinition,
  input: () => ({ orderBy: "create_time desc", pageSize: 50 }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "given_name", type: "string", label: "First name" },
    { key: "family_name", type: "string", label: "Last name" },
    { key: "email_addresses", type: "array", label: "Email addresses" },
    { key: "create_time", type: "string", label: "Created at" },
    { key: "update_time", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "1234",
    given_name: "Ada",
    family_name: "Lovelace",
    email_addresses: [{ email: "ada@example.com", field: "EMAIL1" }],
    create_time: "2026-11-09T12:00:00.000Z",
    update_time: "2026-11-09T12:00:00.000Z",
  },
});
