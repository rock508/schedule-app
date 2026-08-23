const express = require("express");

const app = express();
const port = process.env.PORT || 5500;

app.use(express.static(__dirname));

app.listen(port, () => {
  console.log(`Calendar app: http://localhost:${port}`);
});
