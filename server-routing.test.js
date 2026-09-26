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
    const html = await page.text();
    const pageModules = [
      "/redesign/dist/pages-home-tasks.js",
      "/redesign/dist/pages-rest.js",
      "/redesign/dist/wiki-tools.js",
      "/redesign/dist/pages-library.js",
      "/redesign/dist/pages-projects.js",
      "/redesign/dist/pages-notes.js",
      "/redesign/dist/pages-profile-dialogs.js",
      "/redesign/dist/pages-profile.js",
      "/redesign/dist/wiki-blocks.js",
      "/redesign/dist/app.js",
    ];
    const positions = pageModules.map(module => html.indexOf(`src="${module}"`));
    assert.ok(positions.every(position => position >= 0));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));

    for (const module of pageModules) {
      const response = await fetch(`${base}${module}`);
      assert.equal(response.status, 200, module);
    }
    console.log("server routing test passed");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
