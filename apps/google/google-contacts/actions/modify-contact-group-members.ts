import type { ActionDefinition } from "@w6w/types";
import {
  contactGroupResource,
  GoogleContactsClient,
  personName,
  stringList,
} from "../lib/client.ts";

interface Input {
  resourceName: string;
  resourceNamesToAdd?: string | string[];
  resourceNamesToRemove?: string | string[];
}

/** Google's documented ceiling on adds + removes in a single modify call. */
const MAX_MEMBERS = 1000;

/**
 * `contactGroups.members.modify` — add or remove contacts from a group.
 * POST /v1/{resourceName=contactGroups/*}/members:modify
 *
 * Two constraints worth knowing before wiring this up:
 *   - adds + removes together must be ≤ 1000;
 *   - only `contactGroups/myContacts` and `contactGroups/starred` accept
 *     *additions* among the system groups; the other system groups are
 *     deprecated and support removal only.
 *
 * The response is not an error object: it reports what it could not do, in
 * `notFoundResourceNames` and `canNotRemoveLastContactGroupResourceNames`
 * (Google refuses to strip a contact of its last group). Check them — a 200
 * here does not mean every name landed.
 *
 * `idempotent: true` — membership is a set, so re-adding or re-removing the
 * same people lands on the same state.
 */
const modifyContactGroupMembers: ActionDefinition<Input> = {
  key: "modify-contact-group-members",
  type: "perform",
  resource: "contact-group",
  title: "Modify Contact Group Members",
  description: "Add contacts to, or remove contacts from, a contact group.",
  idempotent: true,
  params: [
    {
      key: "resourceName",
      label: "Contact Group",
      type: "string",
      required: true,
      placeholder: "contactGroups/myContacts",
      hint:
        "Among system groups only `myContacts` and `starred` accept additions; the rest allow removal only.",
    },
    {
      key: "resourceNamesToAdd",
      label: "Contacts to Add",
      type: "text",
      placeholder: "people/c123, people/c456",
      hint: "Comma- or newline-separated. A bare id is accepted and prefixed for you.",
    },
    {
      key: "resourceNamesToRemove",
      label: "Contacts to Remove",
      type: "text",
      hint: "Comma- or newline-separated. Adds + removes together must be at most 1000.",
    },
  ],
  output: [
    { key: "notFoundResourceNames", type: "array", label: "Contacts that were not found" },
    {
      key: "canNotRemoveLastContactGroupResourceNames",
      type: "array",
      label: "Contacts that cannot lose their last group",
    },
  ],

  execute(input, ctx) {
    const toAdd = stringList(input.resourceNamesToAdd).map((n) => personName(n));
    const toRemove = stringList(input.resourceNamesToRemove).map((n) => personName(n));
    if (toAdd.length === 0 && toRemove.length === 0) {
      throw new Error(
        "Give at least one contact in `resourceNamesToAdd` or `resourceNamesToRemove`.",
      );
    }
    if (toAdd.length + toRemove.length > MAX_MEMBERS) {
      throw new Error(
        `contactGroups.members.modify accepts at most ${MAX_MEMBERS} resource names across add and remove; got ${
          toAdd.length + toRemove.length
        }.`,
      );
    }

    const client = new GoogleContactsClient(ctx);
    return client.request(`/${contactGroupResource(input.resourceName)}/members:modify`, {
      method: "POST",
      body: {
        resourceNamesToAdd: toAdd.length > 0 ? toAdd : undefined,
        resourceNamesToRemove: toRemove.length > 0 ? toRemove : undefined,
      },
    });
  },
};

export default modifyContactGroupMembers;
