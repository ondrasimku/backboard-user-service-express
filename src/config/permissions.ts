export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_INVITE: 'users:invite',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  FILES_READ: 'files:read',
  FILES_UPLOAD: 'files:upload',
  FILES_DELETE: 'files:delete',

  PROJECTS_READ: 'projects:read',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',

  PIPELINES_EXECUTE: 'pipelines:execute',

  PERMISSIONS_MANAGE: 'permissions:manage',
  ROLES_MANAGE: 'roles:manage',
  USERS_MANAGE: 'users:manage',
} as const;

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.USERS_READ]: 'Read user information',
  [PERMISSIONS.USERS_INVITE]: 'Invite new users to the organization',
  [PERMISSIONS.USERS_UPDATE]: 'Update user information',
  [PERMISSIONS.USERS_DELETE]: 'Delete users',
  [PERMISSIONS.FILES_READ]: 'Read and download files',
  [PERMISSIONS.FILES_UPLOAD]: 'Upload files',
  [PERMISSIONS.FILES_DELETE]: 'Delete files',
  [PERMISSIONS.PROJECTS_READ]: 'Read project information',
  [PERMISSIONS.PROJECTS_CREATE]: 'Create new projects',
  [PERMISSIONS.PROJECTS_UPDATE]: 'Update project information',
  [PERMISSIONS.PROJECTS_DELETE]: 'Delete projects',
  [PERMISSIONS.PIPELINES_EXECUTE]: 'Execute pipelines',
  [PERMISSIONS.PERMISSIONS_MANAGE]: 'Manage permissions and permission assignments',
  [PERMISSIONS.ROLES_MANAGE]: 'Manage roles and role assignments',
  [PERMISSIONS.USERS_MANAGE]: 'Manage all user-related operations',
};

