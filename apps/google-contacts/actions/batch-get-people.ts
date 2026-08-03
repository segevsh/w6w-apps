import type { ActionDefinition } from "@w6w/types";
import {
  DEFAULT_PERSON_FIELDS,
  fieldOptions,
  GoogleContactsClient,
  PERSON_FIELDS,
  personName,
  requiredFieldMask,
  stringList,
} from "../lib/client.ts";

interface Input {
  resourceNames: string | string[];
  personFields?: string | string[];
  sources?: string | string[];
}

/** Google's documented ceiling for `resourceNames[]` on `people.batchGet`. */
const MAX_RESOURCE_NAMES = 200;

/**
 * `people.batchGet` — read up to 200 people in one request.
 * GET /v1/people:batchGet
 *
 * `resourceNames` is a **repeated** query parameter
 * (`?resourceNames=people/a&resourceNames=people/b`), not a comma-joined one.
 */
const batchGetPeople: ActionDefinition<Input> = {
  key: "batch-get-people",
  type: "read",
  resource: "person",
  title: "Batch Get People",
  description: "Read up to 200 contacts or profiles in a single request.",
  params: [
    {
      key: "resourceNames",
      label: "Resource Names",
      type: "text",
      required: true,
      placeholder: "people/c123, people/c456",
      hint: "Up to 200, comma- or newline-separated. A bare id is accepted and prefixed for you.",
    },
    {
      key: "personFields",
      label: "Person Fields",
      type: "multiselect",
      required: true,
      default: DEFAULT_PERSON_FIELDS.split(","),
      options: fieldOptions(PERSON_FIELDS),
      hint: "Required by Google. Applied to every person in the batch.",
    },
    {
      key: "sources",
      label: "Sources",
      type: "multiselect",
      options: [
        { value: "READ_SOURCE_TYPE_CONTACT", label: "Contact" },
        { value: "READ_SOURCE_TYPE_PROFILE", label: "Profile" },
      ],
      hint: "Defaults to both contact and profile sources.",
    },
  ],
  output: [
    { key: "responses", type: "array", label: "Responses (PersonResponse[])" },
  ],

  execute(input, ctx) {
    const names = stringList(input.resourceNames).map((n) => personName(n));
    if (names.length === 0) {
      throw new Error("`resourceNames` is required — give at least one `people/{person_id}`.");
    }
    if (names.length > MAX_RESOURCE_NAMES) {
      throw new Error(
        `people.batchGet accepts at most ${MAX_RESOURCE_NAMES} resource names; got ${names.length}. Split the batch.`,
      );
    }
    const client = new GoogleContactsClient(ctx);
    return client.request("/people:batchGet", {
      query: {
        resourceNames: names,
        personFields: requiredFieldMask(input.personFields),
        sources: stringList(input.sources),
      },
    });
  },
};

export default batchGetPeople;
