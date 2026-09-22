import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /api/phones` — "Get all phones".
 *
 * The numbers on the account, each as `{number, name}`. This is the endpoint to
 * call before a send: `POST /api/messages` and `POST /api/campaigns` both take
 * an `accountPhone`, and leaving it blank silently uses the *primary* number —
 * which is the wrong choice for any account that runs more than one sender.
 *
 * ## The vendor's page parameters are mislabelled here
 *
 * On this one endpoint the document describes `page` as "The number of phone
 * numbers returned with each request" and `size` as "The size of the page" —
 * the first description is the second's, copied from the neighbours. The
 * schemas are unambiguous (`page`: `minimum: 0`; `size`: `maximum: 500`), and
 * those are what this action sends. Both are forwarded verbatim; nothing is
 * reinterpreted.
 */
interface Input {
  page?: number;
  size?: number;
}

const phoneList: ActionDefinition<Input> = {
  key: "phone-list",
  type: "read",
  resource: "phone",
  title: "List Phones",
  description: "List the sending phone numbers on the account.",
  params: paginationParams(),
  output: [
    { key: "content", type: "array", label: "Phone numbers ({number, name})" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/phones", {
      query: { page: input.page, size: input.size },
    });
  },
};

export default phoneList;
