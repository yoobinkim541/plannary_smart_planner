const assert = require("node:assert/strict");
const app = require("./server");

(async () => {
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    const shortRoute = await fetch(`${base}/redesign`, { redirect: "manual" });
    assert.equal(shortRoute.status, 302);
    assert.equal(shortRoute.headers.get("location"), "/redesign/");

    const page = await fetch(`${base}/redesign/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type") || "", /text\/html/);
    assert.match(await page.text(), /\/redesign\/dist\/app\.js/);

    const bundle = await fetch(`${base}/redesign/dist/app.js`);
    assert.equal(bundle.status, 200);
    console.log("server routing test passed");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
