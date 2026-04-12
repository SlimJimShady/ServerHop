import { getCache } from "@vercel/functions";

const cache = getCache();
const CACHE_KEY = "coin-match-state";

const defaultState = {
  round: {
    title: "Coin Match",
    status: "idle",
    durationSeconds: 60,
    startedAt: null,
    endsAt: null,
    winner: null,
    timeRemaining: 60
  },
  connection: {
    status: "disconnected",
    uniqueId: "",
    roomId: null,
    viewerCount: null,
    message: "Waiting for local bridge sync.",
    error: null,
    connectedAt: null
  },
  totals: {
    participants: 0,
    coins: 0
  },
  participants: [],
  recentEvents: [],
  lastGift: null,
  lanIps: [],
  lanOverlayUrl: null,
  lanTransparentOverlayUrl: null,
  publicOverlayUrl: null,
  publicTransparentOverlayUrl: null,
  overlayUrl: null,
  transparentOverlayUrl: null,
  controlUrl: null,
  updatedAt: null
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function GET() {
  const state = (await cache.get(CACHE_KEY)) || defaultState;
  return json(state);
}

export async function POST(request) {
  const syncSecret = process.env.SYNC_SECRET;
  const incomingSecret = request.headers.get("x-sync-secret");

  if (syncSecret && incomingSecret !== syncSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const incomingState = await request.json();
  const nextState = {
    ...defaultState,
    ...incomingState,
    updatedAt: Date.now()
  };

  await cache.set(CACHE_KEY, nextState, {
    name: "Coin Match State",
    ttl: 60 * 60 * 12
  });
  return json({ ok: true, updatedAt: nextState.updatedAt });
}
