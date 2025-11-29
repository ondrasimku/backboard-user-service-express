export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
}

export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignPermissionToRoleDto {
  permissionId: string;
}

export interface AssignRoleToUserDto {
  roleId: string;
}

