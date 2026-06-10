export interface CallState {
  status: "idle" | "calling" | "incoming" | "connecting" | "connected";
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerUsername: string;
  isVideo: boolean;
  conversationId: string;
}

export interface CallContextType {
  initiateCall: (
    targetUserId: string,
    targetName: string,
    targetAvatarUrl?: string,
    targetUsername?: string,
    isVideo?: boolean,
    conversationId?: string
  ) => void;
  activeCall: CallState | null;
  declineCall: () => void;
  acceptCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  isMuted: boolean;
  isCamOff: boolean;
}

// Configuration with Google STUN + OpenRelay/Custom TURN servers for reliable media transfer
const customIceServers: RTCIceServer[] = [];

if (
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_TURN_URL &&
  process.env.NEXT_PUBLIC_TURN_USERNAME &&
  process.env.NEXT_PUBLIC_TURN_CREDENTIAL
) {
  const urls = process.env.NEXT_PUBLIC_TURN_URL.split(",").map((url) => url.trim());
  customIceServers.push({
    urls,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME,
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  });
}

export const baseIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const iceConfiguration: RTCConfiguration = {
  iceServers: baseIceServers,
};

// Fetch dynamic TURN credentials from Metered.ca API
export async function fetchDynamicIceServers(): Promise<RTCConfiguration> {
  const stunServers = baseIceServers;

  try {
    const apiKey = process.env.NEXT_PUBLIC_METERED_API_KEY;
    if (!apiKey) {
      console.warn("NEXT_PUBLIC_METERED_API_KEY not configured, using STUN only");
      return { iceServers: stunServers };
    }

    const response = await fetch(`https://chatpractise.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const turnServers: RTCIceServer[] = await response.json();
    return {
      iceServers: [...stunServers, ...turnServers],
    };
  } catch (err) {
    console.warn("Failed to fetch TURN credentials, using STUN only:", err);
    return { iceServers: stunServers };
  }
}
