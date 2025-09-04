const passport = require("passport");
const response = require("./../app/responses");
module.exports = (role = []) => {
  return (req, res, next) => {
    passport.authenticate(
      "jwt",
      { session: false },
      function (err, user, info) {
        console.log(user, role);

        if (err) {
          return response.error(res, err);
        }
        if (!user) {
          return response.unAuthorize(res, info);
        }
        if (role.indexOf(user.type) == -1) {
          return response.unAuthorize(res, { message: "Invalid token" });
        }
        req.user = user;
        next();
      }
    )(req, res, next);
  };
};
