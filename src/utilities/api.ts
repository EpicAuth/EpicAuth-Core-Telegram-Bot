import axios from "axios";
import config from "../config";
import logger from "./logger";

export type Result<T> = { ok: true; message?: string, data: T } | { ok: false; message: string };

export type SetSeller = { message: string; };
export type AppDetails = { appdetails: { name: string; ownerid: string; secret: string; version: string } };
export type AppStats = {
  unused: number; used: number; paused: number; banned: number; totalkeys: number;
  webhooks: number; files: number; vars: number; resellers: number;
  managers: number; totalaccs: number;
};
export type LicenseInfo = {
  status: string; level: string; duration: string; createdby: string;
  creationdate: string; usedby?: string; usedon?: string; note?: string;
};
export type Channel = { name: string; delay: number };
export type Mute = { user: string; time: string };
export type Session = { id: string; credential?: string; ip: string; expiry?: string };
export type LogRecord = { id: string; logdata: string; credential?: string; pcuser?: string };
export type FileRecord = { id: number; url: string };
export type Tier = { name: string; level: number };
export type Variable = { varid: string; authed: number; msg: string };
export type Webhook = { webid: string; short_baselink: string; authed: number };
export type LoaderButton = { text: string; value: string };
export type BlacklistEntry = { type: string; data: string; reason: string };

type Empty = Record<string, never>;

const http = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: { "Content-Type": "application/json" },
  validateStatus: () => true,
});

async function request<T>(
  sellerKey: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Result<T>> {
  try {
    const { data } = await http.get("", {
      params: { sellerkey: sellerKey, type: action, ...params },
    });

    if (!data || data.success !== true) {
      return { ok: false, message: data?.message ?? "The seller API rejected the request." };
    }

    return { ok: true, message: data.message, data: data as T };
  } catch (error) {
    logger.error(`Seller API call "${action}" failed: ${error}`);
    return { ok: false, message: "The seller API is unreachable. Please try again shortly." };
  }
}

export const seller = {
  appDetails: (key: string) => request<AppDetails>(key, "appdetails"),
  setSeller: (key: string) => request<SetSeller>(key, "setseller"),
  appSettings: (key: string) => request<Record<string, any>>(key, "getsettings"),
  appStats: (key: string) => request<AppStats>(key, "stats"),
  pauseApp: (key: string) => request<Empty>(key, "pauseapp"),
  resumeApp: (key: string) => request<Empty>(key, "unpauseapp"),
  addHash: (key: string, hash: string) => request<Empty>(key, "addhash", { hash }),
  resetHash: (key: string) => request<Empty>(key, "resethash"),

  generateLicense: (key: string, expiry: number, mask: string, character: number) =>
    request<{ key: string }>(key, "add", { expiry, mask, character, format: "JSON" }),
  fetchLicenses: (key: string) => request<{ keys: unknown[] }>(key, "fetchallkeys"),
  licenseInfo: (key: string, license: string) => request<LicenseInfo>(key, "info", { key: license }),
  licenseExists: (key: string, license: string) => request<Empty>(key, "verify", { key: license }),
  deleteLicense: (key: string, license: string, banUser: boolean) =>
    request<Empty>(key, "del", { key: license, userToo: banUser }),
  deleteAllLicenses: (key: string) => request<Empty>(key, "delalllicenses"),
  deleteUnusedLicenses: (key: string) => request<Empty>(key, "delunusedlicenses"),
  deleteUsedLicenses: (key: string) => request<Empty>(key, "delusedlicenses"),
  assignLicense: (key: string, license: string, username: string) =>
    request<Empty>(key, "assignkey", { key: license, user: username }),
  activateLicense: (key: string, license: string, username: string, password: string) =>
    request<Empty>(key, "activate", { key: license, user: username, pass: password }),
  extendUnusedLicenses: (key: string, seconds: number) => request<Empty>(key, "addtime", { time: seconds }),
  banLicense: (key: string, license: string, reason: string, banUser: boolean) =>
    request<Empty>(key, "ban", { key: license, reason, userToo: banUser }),
  unbanLicense: (key: string, license: string) => request<Empty>(key, "unban", { key: license }),
  setLicenseNote: (key: string, license: string, note: string) =>
    request<Empty>(key, "setnote", { key: license, note }),

  fetchUsers: (key: string) => request<{ users: string[] }>(key, "fetchallusers"),
  fetchUsernames: (key: string) => request<{ usernames: string[] }>(key, "fetchallusernames"),
  userData: (key: string, username: string) => request<Record<string, any>>(key, "getuserdata", { user: username }),
  licenseOfUser: (key: string, username: string) => request<{ key: string }>(key, "getkeyfromuser", { user: username }),
  verifyUser: (key: string, username: string) => request<Empty>(key, "verifyuser", { user: username }),
  createUser: (key: string, username: string, password: string, expiration: number) =>
    request<Empty>(key, "adduser", { user: username, pass: password, expiration }),
  deleteUser: (key: string, username: string) => request<Empty>(key, "deluser", { user: username }),
  deleteAllUsers: (key: string) => request<Empty>(key, "delallusers"),
  deleteExpiredUsers: (key: string) => request<Empty>(key, "delexpusers"),
  banUser: (key: string, username: string, reason: string) =>
    request<Empty>(key, "banuser", { user: username, reason }),
  unbanUser: (key: string, username: string) => request<Empty>(key, "unbanuser", { user: username }),
  pauseUser: (key: string, username: string) => request<Empty>(key, "pauseuser", { username }),
  resumeUser: (key: string, username: string) => request<Empty>(key, "unpauseuser", { username }),
  resetUserHwid: (key: string, username: string) => request<Empty>(key, "resetuser", { user: username }),
  resetAllUserHwids: (key: string) => request<Empty>(key, "resetalluser"),
  addUserHwid: (key: string, username: string, hwid: string) =>
    request<Empty>(key, "addhwiduser", { user: username, hwid }),
  setHwidCooldown: (key: string, username: string, cooldown: number) =>
    request<Empty>(key, "sethwidcool", { user: username, cooldown }),

  fetchUserVariables: (key: string) => request<{ vars: unknown[] }>(key, "fetchalluservars"),
  userVariable: (key: string, username: string, variable: string) =>
    request<{ data: string }>(key, "getuservardata", { user: username, var: variable }),
  setUserVariable: (key: string, username: string, variable: string, data: string) =>
    request<Empty>(key, "setvar", { user: username, var: variable, data }),
  deleteUserVariable: (key: string, username: string, variable: string) =>
    request<Empty>(key, "deluservar", { user: username, var: variable }),
  deleteUserVariableEverywhere: (key: string, variable: string) =>
    request<Empty>(key, "massUserVarDelete", { var: variable }),

  fetchTiers: (key: string) => request<{ subs: Tier[] }>(key, "fetchallsubs"),
  createTier: (key: string, name: string, level: number) => request<Empty>(key, "addsub", { name, level }),
  editTier: (key: string, name: string, level: number) => request<Empty>(key, "editsub", { name, level }),
  deleteTier: (key: string, name: string) => request<Empty>(key, "delappsub", { name }),
  pauseTier: (key: string, name: string) => request<Empty>(key, "pausesub", { subscription: name }),
  resumeTier: (key: string, name: string) => request<Empty>(key, "unpausesub", { subscription: name }),
  countTierUsers: (key: string, name: string) => request<{ count: number }>(key, "countsubs", { name }),
  grantTier: (key: string, username: string, tier: string) => request<Empty>(key, "extend", { user: username, sub: tier }),
  revokeTier: (key: string, username: string, tier: string) => request<Empty>(key, "delsub", { user: username, sub: tier }),

  fetchVariables: (key: string) => request<{ vars: Variable[] }>(key, "fetchallvars"),
  createVariable: (key: string, name: string, data: string, authed: number) =>
    request<Empty>(key, "addvar", { name, data, authed }),
  editVariable: (key: string, id: string, data: string) => request<Empty>(key, "editvar", { varid: id, data }),
  deleteVariable: (key: string, name: string) => request<Empty>(key, "delvar", { name }),
  deleteAllVariables: (key: string) => request<Empty>(key, "delallvars"),

  fetchWebhooks: (key: string) => request<{ webhooks: Webhook[] }>(key, "fetchallwebhooks"),
  createWebhook: (key: string, url: string, authed: number, userAgent?: string) =>
    request<Empty>(key, "addwebhook", { baseurl: url, authed, ...(userAgent ? { ua: userAgent } : {}) }),
  deleteWebhook: (key: string, id: string) => request<Empty>(key, "delwebhook", { webid: id }),
  deleteAllWebhooks: (key: string) => request<Empty>(key, "delallwebhooks"),

  fetchLoaderButtons: (key: string) => request<{ buttons: LoaderButton[] }>(key, "fetchallbuttons"),
  createLoaderButton: (key: string, text: string, value: string) =>
    request<Empty>(key, "addbutton", { text, value }),
  deleteLoaderButton: (key: string, value: string) => request<Empty>(key, "delbutton", { value }),
  deleteAllLoaderButtons: (key: string) => request<Empty>(key, "delAllButtons"),

  createWhitelistEntry: (key: string, ip: string, reason?: string) =>
    request<Empty>(key, "addWhite", { ip, ...(reason ? { reason } : {}) }),
  deleteAllWhitelistEntries: (key: string) => request<Empty>(key, "delAllWhites"),

  fetchBlacklists: (key: string) => request<{ blacklists: BlacklistEntry[] }>(key, "fetchallblacks"),
  createBlacklistEntry: (key: string, kind: string, data: string, reason: string) =>
    request<Empty>(key, "black", { type: kind, data, reason }),
  deleteBlacklistEntry: (key: string, kind: string, data: string) =>
    request<Empty>(key, "delblack", { blacktype: kind, data }),
  deleteAllBlacklistEntries: (key: string) => request<Empty>(key, "delblacks"),

  fetchFiles: (key: string) => request<{ files: FileRecord[] }>(key, "fetchallfiles"),
  createFile: (key: string, url: string, authed: number) => request<Empty>(key, "upload", { url, authed }),
  editFile: (key: string, id: number, changes: { url?: string; authed?: number }) =>
    request<Empty>(key, "editfile", { id, ...changes }),
  deleteFile: (key: string, id: number) => request<Empty>(key, "delfile", { fileid: id }),
  deleteAllFiles: (key: string) => request<Empty>(key, "delallfiles"),

  fetchChannels: (key: string) => request<{ chats: Channel[] }>(key, "fetchallchats"),
  createChannel: (key: string, name: string, delay: number) => request<Empty>(key, "addchannel", { name, delay }),
  editChannelDelay: (key: string, name: string, delay: number) => request<Empty>(key, "editchan", { name, delay }),
  clearChannel: (key: string, name: string) => request<Empty>(key, "clearchannel", { name }),
  deleteChannel: (key: string, name: string) => request<Empty>(key, "delchannel", { name }),
  fetchMutes: (key: string) => request<{ mutes: Mute[] }>(key, "fetchallmutes"),
  muteUser: (key: string, username: string, seconds: number) =>
    request<Empty>(key, "muteuser", { user: username, time: seconds }),
  unmuteUser: (key: string, username: string) => request<Empty>(key, "unmuteuser", { user: username }),

  fetchSessions: (key: string) => request<{ sessions: Session[] }>(key, "fetchallsessions"),
  killSession: (key: string, sessionId: string) => request<Empty>(key, "kill", { sessid: sessionId }),
  killAllSessions: (key: string) => request<Empty>(key, "killall"),

  fetchLogs: (key: string) => request<{ logs: LogRecord[] }>(key, "fetchalllogs"),
  deleteAllLogs: (key: string) => request<Empty>(key, "dellogs"),
};