// minikit.config.ts
export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: ""
  },
  miniapp: {
    version: "1",
    name: "Base Check-In",
    subtitle: "Daily streak tracker on Base",
    description: "Check in once a day on-chain and keep your streak alive.",
    iconUrl: "https://checkin-base.vercel.app/favicon.ico",
    splashImageUrl: "https://checkin-base.vercel.app/og.png",
    splashBackgroundColor: "#000000",
    homeUrl: "https://checkin-base.vercel.app/",
    primaryCategory: "social",
    tags: ["base", "checkin", "onchain", "streak"]
  },
} as const;
