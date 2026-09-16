const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

class EventTargetMock {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) || []) listener(event);
  }
}

function createBridgeHarness() {
  const window = new EventTargetMock();
  window.Planary = {
    USER: { name: "Fallback", initials: "F" },
    getPushPermission: () => "denied",
    requestPushPermission: async () => false,
  };
  const writes = [];
  const fetchCalls = [];
  let authListener;
  const auth = {
    currentUser: null,
    onAuthStateChanged(listener) {
      authListener = listener;
    },
    async signOut() {},
  };
  const makeDoc = (name, id) => ({
    id,
    data: () => ({}),
    async set(payload) { writes.push({ name, id, payload }); },
    async update(payload) {
      if (name === "users") {
        const error = new Error("missing document");
        error.code = "not-found";
        throw error;
      }
      writes.push({ name, id, payload });
    },
    async get() { return { exists: false, data: () => ({}) }; },
    onSnapshot() { return () => {}; },
    collection() { return makeCollection(name); },
  });
  const makeCollection = (name) => ({
    doc(id = "generated") { return makeDoc(name, id); },
    add: async (payload) => { writes.push({ name, id: "added", payload }); return { id: "added" }; },
    where() { return this; },
    orderBy() { return this; },
    limit() { return this; },
    onSnapshot() { return () => {}; },
  });
  const db = { collection: makeCollection };
  const firebase = {
    auth: () => auth,
    firestore: () => db,
    firestore: Object.assign(() => db, {
      FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP", arrayUnion: (...values) => values },
    }),
    messaging: undefined,
  };
  const context = {
    window,
    firebase,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    console,
    URL,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Promise,
    fetch: async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        async json() { return { connected: true, status: "ok", todoCount: 0, examCount: 0 }; },
      };
    },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(fs.readFileSync("redesign/src/firebase-bridge.jsx", "utf8"), context);
  return {
    window,
    auth,
    writes,
    fetchCalls,
    signIn(user) {
      auth.currentUser = user;
      authListener(user);
    },
    emitAuth(user) {
      auth.currentUser = user;
      authListener(user);
    },
  };
}

function makeUser() {
  return {
    uid: "user-1",
    email: "user@example.com",
    displayName: "Auth User",
    photoURL: "https://example.com/avatar.png",
    metadata: {},
    async updateProfile(patch) {
      this.displayName = patch.displayName;
      this.photoURL = patch.photoURL;
    },
    async getIdToken() { return "token"; },
  };
}

async function run() {
  const harness = createBridgeHarness();
  harness.window.dispatchEvent(new CustomEvent("planary:update-profile", {
    detail: { name: "Initial User" },
  }));
  let connectionResult;
  harness.window.dispatchEvent(new CustomEvent("planary:eclass-connect", {
    detail: {
      url: "https://eclass.seoultech.ac.kr",
      id: "student-1",
      password: "password",
      onResult: (result) => { connectionResult = result; },
    },
  }));
  harness.window.dispatchEvent(new CustomEvent("planary:create-task", {
    detail: { title: "First task", done: false, priority: "med" },
  }));
  harness.window.dispatchEvent(new CustomEvent("planary:create-note", {
    detail: { id: "note-1", text: "First note", x: 720, y: 320 },
  }));
  harness.window.dispatchEvent(new CustomEvent("planary:save-notif-prefs", {
    detail: { email: false },
  }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(connectionResult, undefined, "e-Class connection should wait for auth readiness");
  assert.strictEqual(harness.writes.some(write => write.name === "todos" || write.name === "notes"), false, "writes should wait for auth readiness");

  const user = makeUser();
  harness.signIn(user);
  await new Promise(resolve => setTimeout(resolve, 0));

  const profileWrite = harness.writes.find(write => write.name === "users" && write.id === user.uid && write.payload.displayName);
  assert(profileWrite, "profile update should be flushed after auth becomes available");
  assert.strictEqual(profileWrite.payload.displayName, "Initial User");
  assert.strictEqual(profileWrite.payload.photoURL, "https://example.com/avatar.png");
  assert.strictEqual(connectionResult.ok, true);
  assert.strictEqual(harness.fetchCalls.length, 2, "connection and initial sync should both run after auth");
  assert.strictEqual(harness.fetchCalls[0].url, "/api/eclass/connection");
  assert.strictEqual(harness.fetchCalls[1].url, "/api/eclass/sync");
  const taskWrite = harness.writes.find(write => write.name === "todos");
  const noteWrite = harness.writes.find(write => write.name === "notes");
  assert(taskWrite, "task created before auth should be persisted after auth");
  assert.strictEqual(taskWrite.payload.uid, user.uid);
  assert(noteWrite, "note created before auth should be persisted after auth");
  assert.strictEqual(noteWrite.payload.x, 720);
  assert.strictEqual(noteWrite.payload.y, 320);
  const notifWrite = harness.writes.find(write => write.name === "users" && write.payload.notifPrefs);
  assert(notifWrite, "notification preferences changed before auth should be persisted after auth");
  assert.strictEqual(notifWrite.payload.notifPrefs.email, false);

  const raceHarness = createBridgeHarness();
  raceHarness.emitAuth(null);
  const raceUser = makeUser();
  raceHarness.auth.currentUser = raceUser;
  let raceResult;
  raceHarness.window.dispatchEvent(new CustomEvent("planary:eclass-connect", {
    detail: {
      url: "https://eclass.seoultech.ac.kr",
      id: "student-1",
      password: "password",
      onResult: (result) => { raceResult = result; },
    },
  }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(raceResult, undefined, "e-Class must wait for the auth observer after a signup race");
  raceHarness.signIn(raceUser);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(raceResult.ok, true, "e-Class connection should continue after auth observer catches up");

  console.log("profile bridge test passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
