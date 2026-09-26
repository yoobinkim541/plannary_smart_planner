const assert = require("assert");
const fs = require("fs");

const rules = fs.readFileSync(require.resolve("../firestore.rules"), "utf8");
const noteRule = rules.slice(rules.indexOf("function validNote()"), rules.indexOf("function validProject()"));
const noteColors = ["yellow", "blue", "green", "pink", "purple", "orange", "mint"];

for (const color of noteColors) {
  assert(noteRule.includes(`'${color}'`), `note color ${color} must be accepted by Firestore rules`);
}

console.log("firestore contract test passed");
