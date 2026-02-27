const LS_ACCESS = "tm_access";
const LS_REFRESH = "tm_refresh";
const LS_USER = "tm_user";

export const authStorage = {
  getAccess: () => localStorage.getItem(LS_ACCESS),
  getRefresh: () => localStorage.getItem(LS_REFRESH),

  setAccess: (v: string) => {
    localStorage.setItem(LS_ACCESS, v);
    // ✅ same-tab notify
    window.dispatchEvent(new CustomEvent("tm_access_updated", { detail: v }));
  },

 setRefresh: (v: string) => {
  localStorage.setItem(LS_REFRESH, v);
  window.dispatchEvent(new CustomEvent("tm_refresh_updated", { detail: v }));
},

  getUserRaw: () => localStorage.getItem(LS_USER),
  setUser: (u: unknown) => localStorage.setItem(LS_USER, JSON.stringify(u)),

//   clearAll: () => {
//     localStorage.removeItem(LS_ACCESS);
//     localStorage.removeItem(LS_REFRESH);
//     localStorage.removeItem(LS_USER);
//     // optional notify
//     window.dispatchEvent(new CustomEvent("tm_access_updated", { detail: "" }));
//   },

clearAll: () => {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_USER);
  window.dispatchEvent(new CustomEvent("tm_access_updated", { detail: null }));
},
};

