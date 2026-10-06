/**
 * Zeplin — projects, screens, notes, components, colors, text styles, design tokens and styleguides
 * over the REST API at `api.zeplin.dev/v1`. See `README.md` and `lib/client.ts` for what was
 * verified.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import createProjectColor from "./actions/create-project-color.ts";
import createScreenComment from "./actions/create-screen-comment.ts";
import createScreenNote from "./actions/create-screen-note.ts";
import deleteScreenNote from "./actions/delete-screen-note.ts";
import getCurrentUser from "./actions/get-current-user.ts";
import getLatestScreenVersion from "./actions/get-latest-screen-version.ts";
import getProject from "./actions/get-project.ts";
import getProjectComponent from "./actions/get-project-component.ts";
import getProjectDesignTokens from "./actions/get-project-design-tokens.ts";
import getScreen from "./actions/get-screen.ts";
import getStyleguide from "./actions/get-styleguide.ts";
import listOrganizationProjects from "./actions/list-organization-projects.ts";
import listOrganizations from "./actions/list-organizations.ts";
import listProjectColors from "./actions/list-project-colors.ts";
import listProjectComponents from "./actions/list-project-components.ts";
import listProjectMembers from "./actions/list-project-members.ts";
import listProjectTextStyles from "./actions/list-project-text-styles.ts";
import listProjects from "./actions/list-projects.ts";
import listScreenNotes from "./actions/list-screen-notes.ts";
import listScreenSections from "./actions/list-screen-sections.ts";
import listScreenVersions from "./actions/list-screen-versions.ts";
import listScreens from "./actions/list-screens.ts";
import listStyleguideColors from "./actions/list-styleguide-colors.ts";
import listStyleguideComponents from "./actions/list-styleguide-components.ts";
import listStyleguides from "./actions/list-styleguides.ts";
import updateProject from "./actions/update-project.ts";
import updateScreen from "./actions/update-screen.ts";
import updateScreenNote from "./actions/update-screen-note.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    createProjectColor,
    createScreenComment,
    createScreenNote,
    deleteScreenNote,
    getCurrentUser,
    getLatestScreenVersion,
    getProject,
    getProjectComponent,
    getProjectDesignTokens,
    getScreen,
    getStyleguide,
    listOrganizationProjects,
    listOrganizations,
    listProjectColors,
    listProjectComponents,
    listProjectMembers,
    listProjectTextStyles,
    listProjects,
    listScreenNotes,
    listScreenSections,
    listScreenVersions,
    listScreens,
    listStyleguideColors,
    listStyleguideComponents,
    listStyleguides,
    updateProject,
    updateScreen,
    updateScreenNote,
  ],
  auth: [personalAccessToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
