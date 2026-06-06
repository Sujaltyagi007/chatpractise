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

export const iceConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(customIceServers.length > 0
      ? customIceServers
      : [
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ]),
  ],
};
