import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import listConnections from "./actions/list-connections.ts";
import getPerson from "./actions/get-person.ts";
import batchGetPeople from "./actions/batch-get-people.ts";
import searchContacts from "./actions/search-contacts.ts";
import listOtherContacts from "./actions/list-other-contacts.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import listContactGroups from "./actions/list-contact-groups.ts";
import getContactGroup from "./actions/get-contact-group.ts";
import createContactGroup from "./actions/create-contact-group.ts";
import updateContactGroup from "./actions/update-contact-group.ts";
import deleteContactGroup from "./actions/delete-contact-group.ts";
import modifyContactGroupMembers from "./actions/modify-contact-group-members.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listConnections,
    getPerson,
    batchGetPeople,
    searchContacts,
    listOtherContacts,
    createContact,
    updateContact,
    deleteContact,
    listContactGroups,
    getContactGroup,
    createContactGroup,
    updateContactGroup,
    deleteContactGroup,
    modifyContactGroupMembers,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
