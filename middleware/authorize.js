const permissions = require('../controllers/permissions');


function authorize(model, action) {
  return (req, res, next) => {
    const role = req.session.user?.role;
    if (!role || !permissions[role]) {
      return res.status(403).send('Forbidden');
    }
    if (!permissions[role][model] || !permissions[role][model].includes(action)) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}

module.exports = authorize;
