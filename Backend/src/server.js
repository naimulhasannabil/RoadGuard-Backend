const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic health route to verify server boots correctly
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
