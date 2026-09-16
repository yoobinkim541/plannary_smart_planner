const assert = require("assert");
const cheerio = require("cheerio");
const {
  loginSeoultech,
  parseCoursePageItems,
  parseDate,
  parseKoreanDate,
} = require("./_seoultech");

const response = (status, body, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get(name) { return headers[name.toLowerCase()] || null; } },
  async text() { return body; },
});

async function run() {
  assert.strictEqual(parseDate("제출 기한: 2026년 09월 22일"), "2026-09-22");
  assert.match(parseKoreanDate("9월 22일"), /^\d{4}-09-22$/);

  const html = `
    <table>
      <tr><th>과제명</th><th>마감</th></tr>
      <tr>
        <td><a href="/ilos/st/course/reportView.acl?KJKEY=DESIGN101">인터랙션 과제 1</a></td>
        <td>2026년 09월 22일 오후 11:30</td>
      </tr>
    </table>`;
  const items = parseCoursePageItems(
    cheerio.load(html),
    "https://eclass.seoultech.ac.kr/ilos/st/course/reportList_form.acl?KJKEY=DESIGN101",
    "인터랙션 디자인",
  );
  assert.strictEqual(items.length, 1);
  assert.deepStrictEqual(items[0], {
    externalId: "assignment:인터랙션 디자인:인터랙션 과제 1:2026-09-22",
    type: "assignment",
    title: "인터랙션 과제 1",
    courseTitle: "인터랙션 디자인",
    dueDate: "2026-09-22",
    dueTime: "23:30",
    ddayText: null,
    url: "https://eclass.seoultech.ac.kr/ilos/st/course/reportView.acl?KJKEY=DESIGN101",
  });

  const originalFetch = global.fetch;
  const loginForm = '<form action="/ilos/lo/login.acl"><input name="_csrf" value="token"><input name="usr_id"><input name="usr_pwd"></form>';
  let calls = 0;
  global.fetch = async (_url, options = {}) => {
    calls += 1;
    if (!options.method) return response(200, loginForm);
    if (options.method === "POST") return response(302, "", { location: "/ilos/main/main_form.acl" });
    return response(200, loginForm);
  };
  await assert.rejects(
    () => loginSeoultech({ baseUrl: "https://eclass.seoultech.ac.kr", username: "student", password: "secret" }),
    /E-class login failed/,
  );
  assert.strictEqual(calls, 3);
  global.fetch = originalFetch;

  console.log("e-class parser test passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
