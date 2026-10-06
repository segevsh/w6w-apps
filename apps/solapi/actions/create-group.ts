import type { ActionDefinition } from "@w6w/types";
import { compact, groupResult, parseJsonParam, SolapiClient } from "../lib/client.ts";

/**
 * Create Message Group — Create an empty message group (state PENDING). The first step of the group flow: add messages, then send or schedule it. Use it to assemble up to 1,000,000 messages across several calls.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  strict?: boolean;
  allowDuplicates?: boolean;
  customFields?: unknown;
}

const createGroup: ActionDefinition<Input> = {
  key: "create-group",
  type: "perform",
  resource: "group",
  title: "Create Message Group",
  description:
    "Create an empty message group (state PENDING). The first step of the group flow: add messages, then send or schedule it. Use it to assemble up to 1,000,000 messages across several calls.",
  idempotent: false,
  params: [
    {
      "key": "strict",
      "label": "Strict validation",
      "type": "boolean",
      "hint":
        "Default false: SOLAPI silently strips invalid characters and derives a missing LMS/MMS subject from the text. true rejects such messages instead.",
    },
    {
      "key": "allowDuplicates",
      "label": "Allow duplicate recipients",
      "type": "boolean",
      "hint": "Default false: a recipient number repeated inside the same batch is dropped.",
    },
    {
      "key": "customFields",
      "label": "Custom fields",
      "type": "json",
      "hint":
        "Metadata for your own bookkeeping: up to 10 string pairs, key 30 chars, value 100 chars.",
    },
  ],
  output: [
    {
      "key": "groupId",
      "type": "string",
      "label": "Group ID",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Group status",
    },
    {
      "key": "scheduledDate",
      "type": "string",
      "label": "Scheduled send time, null when not scheduled",
    },
    {
      "key": "count",
      "type": "object",
      "label": "Group counters",
    },
    {
      "key": "group",
      "type": "object",
      "label": "The whole group object",
    },
  ],

  async execute(input, ctx) {
    return groupResult(
      await new SolapiClient(ctx).json("/messages/v4/groups", {
        method: "POST",
        body: compact({
          strict: input.strict,
          allowDuplicates: input.allowDuplicates,
          customFields: parseJsonParam(input.customFields, "customFields"),
        }),
      }),
    );
  },
};

export default createGroup;
