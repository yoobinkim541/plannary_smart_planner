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
    async update(payload) { writes.push({ name, id, payload }); },
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
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(connectionResult, undefined, "e-Class connection should wait for auth readiness");

  const user = {
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
  harness.signIn(user);
  await new Promise(resolve => setTimeout(resolve, 0));

  const profileWrite = harness.writes.find(write => write.name === "users" && write.id === user.uid);
  assert(profileWrite, "profile update should be flushed after auth becomes available");
  assert.strictEqual(profileWrite.payload.displayName, "Initial User");
  assert.strictEqual(profileWrite.payload.photoURL, "https://example.com/avatar.png");
  assert.strictEqual(connectionResult.ok, true);
  assert.strictEqual(harness.fetchCalls.length, 2, "connection and initial sync should both run after auth");
  assert.strictEqual(harness.fetchCalls[0].url, "/api/eclass/connection");
  assert.strictEqual(harness.fetchCalls[1].url, "/api/eclass/sync");

  console.log("profile bridge test passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
