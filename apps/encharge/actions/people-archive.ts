import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";
import { peopleParam, peopleQuery, personRefParams, personRefs } from "../lib/people.ts";
import type { PersonRefInput } from "../lib/people.ts";

/**
 * Archive or Delete People — `DELETE /v1/people?people[0][email]=…&force=`. Verified against the
 * OpenAPI document (`ArchivePeople`), fetched 2026-10-06: archiving is "the preferred method";
 * `force=true` deletes the person's data (GDPR erasure) and cannot be undone.
 */
interface Input extends PersonRefInput {
  force?: boolean;
}

const peopleArchive: ActionDefinition<Input> = {
  key: "people-archive",
  type: "perform",
  resource: "people",
  title: "Archive or Delete People",
  description: "Archive one or more people. Turn on `Permanently delete` to erase the person's " +
    "data instead (GDPR erasure) — that cannot be undone.",
  idempotent: true,
  params: [
    ...personRefParams,
    peopleParam,
    {
      key: "force",
      label: "Permanently delete",
      type: "boolean",
      default: false,
      hint: "Sends force=true: deletes the person and all their data rather than archiving.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Encharge accepted the request" }],

  async execute(input, ctx) {
    const query = peopleQuery(personRefs(input));
    if (input.force === true) query.push(["force", "true"]);
    return await new EnchargeClient(ctx).request("DELETE", "/people", { query });
  },
};

export default peopleArchive;
