// Zero-dependency static server for the demo app.
// Serves examples/demo-app/index.html on PORT (default 3000).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const server = createServer(async (req, res) => {
  try {
    const html = await readFile(join(here, "index.html"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (e) {
    res.writeHead(500);
    res.end("error: " + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`demo-app listening on http://localhost:${PORT}`);
});
