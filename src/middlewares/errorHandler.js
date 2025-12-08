module.exports = function (err, req, res, next) {
  console.error(err);
  const payload = { error: "Server error" };
  if (process.env.NODE_ENV !== "production") payload.details = err.message;
  res.status(500).json(payload);
};
