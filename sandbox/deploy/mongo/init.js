db.getSiblingDB("phish_out").createUser({
  user: "phish_app",
  pwd: process.env.PHISH_MONGO_APP_PASSWORD,
  roles: [{ role: "readWrite", db: "phish_out" }],
});
