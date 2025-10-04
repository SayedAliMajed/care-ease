module.exports = function passUserToView(req, res, next) {
  res.locals.user = req.session?.user || null;
  next();
};
