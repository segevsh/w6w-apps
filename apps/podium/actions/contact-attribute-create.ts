import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient } from "../lib/client.ts";

interface Input {
  label: string;
  dataType: string;
  ownerResourceType: string;
  isEncrypted?: boolean;
}

const contactAttributeCreate: ActionDefinition<Input> = {
  key: "contact-attribute-create",
  type: "perform",
  resource: "contact-attribute",
  title: "Create Contact Attribute",
  description:
    "Create an application- or organization-level attribute definition that contacts can carry. Requires scope `write_contacts`.",
  idempotent: false,
  params: [{
    key: "label",
    label: "Label",
    type: "string",
    required: true,
  }, {
    key: "dataType",
    label: "Data type",
    type: "select",
    required: true,
    options: [{
      value: "ADDRESS",
      label: "ADDRESS",
    }, {
      value: "BOOLEAN",
      label: "BOOLEAN",
    }, {
      value: "DATETIME",
      label: "DATETIME",
    }, {
      value: "FLOAT",
      label: "FLOAT",
    }, {
      value: "INTEGER",
      label: "INTEGER",
    }, {
      value: "STRING",
      label: "STRING",
    }, {
      value: "UUID",
      label: "UUID",
    }, {
      value: "SINGLE_SELECT",
      label: "SINGLE_SELECT",
    }, {
      value: "MULTI_SELECT",
      label: "MULTI_SELECT",
    }],
  }, {
    key: "ownerResourceType",
    label: "Owner",
    type: "select",
    required: true,
    hint:
      "PRODUCT scopes the attribute to this application; ORGANIZATION to the whole organization.",
    options: [{
      value: "PRODUCT",
      label: "PRODUCT",
    }, {
      value: "ORGANIZATION",
      label: "ORGANIZATION",
    }],
  }, {
    key: "isEncrypted",
    label: "Encrypted",
    type: "boolean",
  }],
  output: [{
    key: "createdAt",
    type: "string",
    label: "Time at which the resource was created. Date time is in Coordinated Un",
  }, {
    key: "dataType",
    type: "string",
    label: "The data type of the attribute value",
  }, {
    key: "isEncrypted",
    type: "boolean",
    label: "If the attribute is encrypted it cannot be used as a filter. Attribute",
  }, {
    key: "label",
    type: "string",
    label: "The human-readable name of the attribute, as shown in Podium. Renaming",
  }, {
    key: "options",
    type: "array",
    label: "The options a contact may be given for a `SINGLE_SELECT` or `MULTI_SEL",
  }, {
    key: "ownerResource",
    type: "object",
    label: "The resource that owns the attribute",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for attribute",
  }, {
    key: "updatedAt",
    type: "string",
    label: "Time at which the resource was updated. Date time is in Coordinated Un",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one("/contact_attributes", {
      method: "POST",
      body: compact({
        label: input.label,
        dataType: input.dataType,
        ownerResourceType: input.ownerResourceType,
        isEncrypted: input.isEncrypted,
      }),
    });
  },
};

export default contactAttributeCreate;
