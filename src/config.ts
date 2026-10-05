export default {
  loading: {
    buttons: true,
    commands: true,
    setCommands: true,
  },
  paths: {
    buttons: "buttons",
    commands: "commands",
  },
  logging: {
    buttonLoad: true,
    commandLoad: true,
    buttonUse: true,
    commandUse: true,
  },
  api: {
    baseUrl: "https://Epicauth.cc/api/seller",
    timeout: 5000,
  },
  database: {
    url: process.env.DATABASE_URL ?? "file:./prisma/epicauth.db",
  },
  conversation: {
    timeoutMs: 5 * 60 * 1000,
  },
}