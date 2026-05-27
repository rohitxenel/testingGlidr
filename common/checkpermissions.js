module.exports.checkpermission = (...requiredPermissions) => {
  return (req, res, next) => {
    const admin = req.admin;

    if (!admin) {
      return res.error(403, "Access denied: Admin not found");
    }

    // Bypass all checks if admin is SUPERADMIN
    if (admin.type === "SUPERADMIN") {
      return next();
    }

    // If type is ADMIN, check for role and permissions
    if (admin.type === "ADMIN") {
      if (!admin.role) {
        return res.error(403, "Access denied: No role assigned");
      }

      const userPermissions = admin.role.permissions || [];

      const hasPermission = requiredPermissions.every((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        return res.error(403, "Access denied: Insufficient permissions");
      }

      return next();
    }

    // For any other admin type, deny access
    return res.error(403, "Access denied: Unauthorized admin type");
  };
};



module.exports.superAdminpermissions = () => {
  return (req, res, next) => {
    const admin = req.admin;

    if (!admin || admin.type !== "SUPERADMIN") {
      return res.error(403, "Access denied: Only SUPERADMIN can access this route");
    }

    next();
  };
};


