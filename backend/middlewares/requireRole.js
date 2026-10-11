function requireRole(role) {
  return function roleGuard(req, res, next) {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `A ${role} account is required to use this feature.` })
    }
    return next()
  }
}

module.exports = requireRole
