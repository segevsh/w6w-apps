import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listUsers from "./actions/list-users.ts";
import getUser from "./actions/get-user.ts";
import createUser from "./actions/create-user.ts";
import updateUser from "./actions/update-user.ts";
import deleteUser from "./actions/delete-user.ts";
import resetUserPassword from "./actions/reset-user-password.ts";
import listUserMemberships from "./actions/list-user-memberships.ts";
import listGroups from "./actions/list-groups.ts";
import getGroup from "./actions/get-group.ts";
import createGroup from "./actions/create-group.ts";
import updateGroup from "./actions/update-group.ts";
import deleteGroup from "./actions/delete-group.ts";
import listGroupMembers from "./actions/list-group-members.ts";
import addGroupMember from "./actions/add-group-member.ts";
import removeGroupMember from "./actions/remove-group-member.ts";
import listGroupOwners from "./actions/list-group-owners.ts";
import addGroupOwner from "./actions/add-group-owner.ts";
import removeGroupOwner from "./actions/remove-group-owner.ts";
import listDirectoryRoles from "./actions/list-directory-roles.ts";
import listDirectoryRoleMembers from "./actions/list-directory-role-members.ts";
import listApplications from "./actions/list-applications.ts";
import getApplication from "./actions/get-application.ts";
import listServicePrincipals from "./actions/list-service-principals.ts";
import getServicePrincipal from "./actions/get-service-principal.ts";
import getOrganization from "./actions/get-organization.ts";
import getDirectoryObject from "./actions/get-directory-object.ts";
import listDeletedItems from "./actions/list-deleted-items.ts";
import restoreDeletedItem from "./actions/restore-deleted-item.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    listUserMemberships,
    listGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    listGroupMembers,
    addGroupMember,
    removeGroupMember,
    listGroupOwners,
    addGroupOwner,
    removeGroupOwner,
    listDirectoryRoles,
    listDirectoryRoleMembers,
    listApplications,
    getApplication,
    listServicePrincipals,
    getServicePrincipal,
    getOrganization,
    getDirectoryObject,
    listDeletedItems,
    restoreDeletedItem,
  ],
  auth: [oauth2],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
