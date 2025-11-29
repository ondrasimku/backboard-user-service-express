import { Router } from 'express';
import container from '../config/container';
import { TYPES } from '../types/di.types';
import { RoleController } from '../controllers/roleController';
import { PermissionController } from '../controllers/permissionController';
import { authenticateToken, requirePermissions } from '../middlewares/auth';

const router = Router();
const roleController = container.get<RoleController>(TYPES.RoleController);
const permissionController = container.get<PermissionController>(TYPES.PermissionController);

// All admin routes require authentication
router.use(authenticateToken);

router.get('/permissions', requirePermissions(['permissions:manage']), permissionController.getAllPermissions);
router.get('/permissions/:id', requirePermissions(['permissions:manage']), permissionController.getPermissionById);

router.get('/roles', requirePermissions(['roles:manage']), roleController.getAllRoles);
router.get('/roles/:id', requirePermissions(['roles:manage']), roleController.getRoleById);
router.post('/roles', requirePermissions(['roles:manage']), roleController.createRole);
router.patch('/roles/:id', requirePermissions(['roles:manage']), roleController.updateRole);
router.delete('/roles/:id', requirePermissions(['roles:manage']), roleController.deleteRole);

router.post('/roles/:id/permissions', requirePermissions(['roles:manage']), roleController.addPermissionToRole);
router.delete('/roles/:id/permissions/:permissionId', requirePermissions(['roles:manage']), roleController.removePermissionFromRole);

router.get('/users/:userId/roles', requirePermissions(['users:manage']), roleController.getUserRoles);
router.post('/users/:userId/roles', requirePermissions(['users:manage']), roleController.assignRoleToUser);
router.delete('/users/:userId/roles/:roleId', requirePermissions(['users:manage']), roleController.removeRoleFromUser);

export default router;

