module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "cafes",
        "reviews",
        "auth",
        "admin",
        "db",
        "map",
        "ui",
        "api",
        "config",
        "deps",
      ],
    ],
  },
};
