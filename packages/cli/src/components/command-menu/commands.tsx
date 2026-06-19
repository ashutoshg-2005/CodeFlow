import type { Command } from "./types";


export const  COMMANDS: Command[] = [
  {
    name: "new",
    description: "Create a new conversation",
    value: "/new"
    
  },
  {
    name: "agents",
    description: "Switch agent",
    value: "/agents"
  },
  {
    name: "models",
    description: "Select a model",
    value: "/models"
  },
  {
    name: "sessions",
    description: "Browse sessions",
    value: "/sessions"
  },
  {
    name: "theme",
    description: "Change theme",
    value: "/theme"
  },
  {
    name: "logout",
    description: "Logout of the current session",
    value: "/logout"
  },
  {
    name: "login",
    description: "Login to your account",
    value: "/login"
  },
  {
    name: "upgrade",
    description: "Upgrade your account",
    value: "/upgrade"
  },
  {
    name: "usage",
    description: "View usage statistics",
    value: "/usage"
  },
  {
    name: "exit",
    description: "Exit the application",
    value: "/exit",
    action: (ctx) => {
      ctx.exit();
    },
  },
]