/* db.js — tiny wrapper around IndexedDB (the free, built-in, offline browser database) */
const DB = (() => {
  let db;
 
  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("expense-tracker", 1);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        d.createObjectStore("users", { keyPath: "username" });
        ["expenses", "goals", "recurring"].forEach(name => {
          const st = d.createObjectStore(name, { keyPath: "id", autoIncrement: true });
          st.createIndex("user", "user");
        });
        d.createObjectStore("budgets", { keyPath: "user" });
      };
      req.onsuccess = () => { db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }
 
  const store = (name, mode) => db.transaction(name, mode).objectStore(name);
  const wrap = rq => new Promise((resolve, reject) => {
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
 
  return {
    open,
    get:    (s, key)  => wrap(store(s, "readonly").get(key)),
    put:    (s, val)  => wrap(store(s, "readwrite").put(val)),
    add:    (s, val)  => wrap(store(s, "readwrite").add(val)),
    del:    (s, key)  => wrap(store(s, "readwrite").delete(key)),
    byUser: (s, user) => wrap(store(s, "readonly").index("user").getAll(user))
  };
})();
