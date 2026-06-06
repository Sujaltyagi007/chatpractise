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

// Configuration with Google STUN + OpenRelay Free TURN servers for reliable media transfer
export const iceConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
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
  ],
};
