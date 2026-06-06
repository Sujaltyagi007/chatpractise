"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/actions/chat";
import { toast } from "sonner";
import { TOAST } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

class CallSounds {
  private ctx: AudioContext | null = null;
  private ringbackInterval: any = null;
  private ringtoneInterval: any = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Play outgoing ringing sound (ring-ring)
  playRingback() {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    const playTone = () => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime + 1.8);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 2.0);
      osc2.stop(this.ctx.currentTime + 2.0);
    };

    playTone();
    this.ringbackInterval = setInterval(playTone, 4000);
  }

  // Play incoming ringtone (melodic alert)
  playRingtone() {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    const playTone = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const playBeep = (time: number, freq: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
        gain.gain.setValueAtTime(0.12, time + 0.25);
        gain.gain.linearRampToValueAtTime(0, time + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
      };

      playBeep(now, 850);
      playBeep(now + 0.35, 950);
    };

    playTone();
    this.ringtoneInterval = setInterval(playTone, 1800);
  }

  // Play hang-up descending beep
  playEndCall() {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.35);
  }

  stop() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

// ==========================================
// 2. TYPES & CONTEXT INTERFACES
// ==========================================
interface CallState {
  status: "idle" | "calling" | "incoming" | "connecting" | "connected";
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerUsername: string;
  isVideo: boolean;
  conversationId: string;
}

interface CallContextType {
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

const CallContext = createContext<CallContextType | undefined>(undefined);

// Free, stable public STUN servers provided by Google
const iceConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// ==========================================
// 3. MAIN PROVIDER COMPONENT
// ==========================================
export function CallProvider({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: {
    id: string;
    fullName: string | null;
    username: string;
    avatarUrl: string | null;
  };
}) {
  const currentUserId = currentUser.id;

  // UI States
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // HTML5 MediaStreams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // WebRTC & Signaling References (Prevents dynamic/unnecessary re-renders)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const soundsRef = useRef<CallSounds | null>(null);
  const activeCallRef = useRef<CallState | null>(null);
  activeCallRef.current = activeCall;

  // STABLE Signaling Channels (Fixes connection drops by maintaining active channels)
  const incomingChannelRef = useRef<any>(null); // Listening to own incoming calls
  const outgoingChannelRef = useRef<any>(null); // Listening & transmitting to the partner

  const supabase = useRef(createClient());

  // Initialize sounds class on mount
  useEffect(() => {
    soundsRef.current = new CallSounds();
    return () => {
      soundsRef.current?.stop();
    };
  }, []);

  // Set up the incoming signaling channel to listen for calls continuously
  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `call-lobby:${currentUserId}`;
    const channel = supabase.current
      .channel(channelName)
      .on("broadcast", { event: "signal" }, async (payload) => {
        const data = payload.payload;
        const call = activeCallRef.current;

        switch (data.type) {
          case "call-initiated":
            // 1. If user is already in a call, broadcast BUSY state
            if (call && call.status !== "idle") {
              const tempChannel = supabase.current.channel(`call-lobby:${data.callerId}`);
              tempChannel.subscribe((status) => {
                if (status === "SUBSCRIBED") {
                  tempChannel.send({
                    type: "broadcast",
                    event: "signal",
                    payload: {
                      type: "call-busy",
                      calleeId: currentUserId,
                      targetCallerId: data.callerId,
                    },
                  });
                  setTimeout(() => supabase.current.removeChannel(tempChannel), 1500);
                }
              });
              return;
            }

            // 2. Play ringtone sound
            soundsRef.current?.playRingtone();

            // 3. Set incoming call state
            setActiveCall({
              status: "incoming",
              partnerId: data.callerId,
              partnerName: data.callerName,
              partnerAvatar: data.callerAvatar,
              partnerUsername: data.callerUsername,
              isVideo: data.isVideo,
              conversationId: data.conversationId,
            });

            // 4. Save SDP offer details
            pendingOfferRef.current = {
              sdp: data.sdp,
              isVideo: data.isVideo,
            };
            break;

          case "call-accepted":
            if (call && call.status === "calling" && call.partnerId === data.calleeId) {
              soundsRef.current?.stop();
              setActiveCall((prev) => (prev ? { ...prev, status: "connecting" } : null));

              const pc = peerConnectionRef.current;
              if (pc) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                  
                  // Flush any queued candidates that arrived before SDP negotiation finished
                  while (iceQueueRef.current.length > 0) {
                    const candidate = iceQueueRef.current.shift();
                    if (candidate) {
                      await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                  }

                  setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
                } catch (e) {
                  console.error("Failed to apply remote SDP description:", e);
                  toast.error("RTC connection failed", { style: TOAST.ERROR });
                  cleanupCall();
                }
              }
            }
            break;

          case "call-declined":
            if (call && (call.status === "calling" || call.status === "connecting") && call.partnerId === data.calleeId) {
              toast.error("Call declined by user", { style: TOAST.ERROR });
              soundsRef.current?.playEndCall();
              cleanupCall();
            }
            break;

          case "call-busy":
            if (call && call.status === "calling" && data.targetCallerId === currentUserId) {
              toast.error("User is currently busy on another call", { style: TOAST.ERROR });
              soundsRef.current?.playEndCall();
              logCall(call.conversationId, "📞 Missed call (Busy)");
              cleanupCall();
            }
            break;

          case "ice-candidate":
            if (call && call.partnerId === data.senderId) {
              const pc = peerConnectionRef.current;
              if (pc) {
                if (pc.remoteDescription) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                  } catch (e) {
                    console.error("Error adding WebRTC candidate:", e);
                  }
                } else {
                  // Queue candidates if they arrive before setRemoteDescription executes
                  iceQueueRef.current.push(data.candidate);
                }
              }
            }
            break;

          case "call-ended":
            if (call && call.partnerId === data.senderId) {
              toast("Call ended", { style: TOAST.SUCCESS });
              soundsRef.current?.playEndCall();
              cleanupCall();
            }
            break;

          default:
            break;
        }
      })
      .subscribe();

    incomingChannelRef.current = channel;

    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [currentUserId]);

  const pendingOfferRef = useRef<{ sdp: RTCSessionDescriptionInit; isVideo: boolean } | null>(null);

  // Calling & Ringing timeouts (30-second call timeout)
  useEffect(() => {
    if (!activeCall) return;

    let timeoutId: NodeJS.Timeout | null = null;

    if (activeCall.status === "calling" || activeCall.status === "incoming") {
      timeoutId = setTimeout(() => {
        if (activeCall.status === "calling") {
          toast.error("No answer", { style: TOAST.ERROR });
          sendSignal({ type: "call-ended", senderId: currentUserId });
          logCall(activeCall.conversationId, activeCall.isVideo ? "📞 Missed video call" : "📞 Missed voice call");
        } else if (activeCall.status === "incoming") {
          toast("Missed call", { style: TOAST.SUCCESS });
          sendSignal({ type: "call-declined", calleeId: currentUserId });
          logCall(activeCall.conversationId, activeCall.isVideo ? "📞 Missed video call" : "📞 Missed voice call");
        }
        soundsRef.current?.playEndCall();
        cleanupCall();
      }, 30000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeCall, currentUserId]);

  // Callback refs to cleanly mount and bind HTML5 video tags dynamically
  const localVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      node.srcObject = localStream;
    }
  }, [localStream]);

  const remoteVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      node.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Log call activity as a message in the database chat history
  const logCall = useCallback(async (conversationId: string, content: string) => {
    try {
      await sendMessage(conversationId, content);
    } catch (e) {
      console.error("Failed to log call message in DB:", e);
    }
  }, []);

  // Transmit signals to the partner using a stable subscription channel
  const sendSignal = (payload: any) => {
    if (outgoingChannelRef.current) {
      outgoingChannelRef.current.send({
        type: "broadcast",
        event: "signal",
        payload,
      });
    }
  };

  // Close connections, release devices, and clean up state
  const cleanupCall = () => {
    soundsRef.current?.stop();

    // Close WebRTC Connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop and release hardware devices (Camera & Microphone)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Unsubscribe from partner's signaling channel
    if (outgoingChannelRef.current) {
      supabase.current.removeChannel(outgoingChannelRef.current);
      outgoingChannelRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIsMuted(false);
    setIsCamOff(false);
    iceQueueRef.current = [];
    pendingOfferRef.current = null;
  };

  // Initiate call to partner (Caller logic)
  const initiateCall = async (
    targetUserId: string,
    targetName: string,
    targetAvatarUrl?: string,
    targetUsername?: string,
    isVideo = false,
    conversationId = ""
  ) => {
    soundsRef.current?.playRingback();

    setActiveCall({
      status: "calling",
      partnerId: targetUserId,
      partnerName: targetName,
      partnerAvatar: targetAvatarUrl,
      partnerUsername: targetUsername || "unknown",
      isVideo,
      conversationId,
    });

    try {
      // 1. Capture local media devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo
          ? {
              width: { min: 640, ideal: 1920, max: 1920 },
              height: { min: 480, ideal: 1080, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
              facingMode: "user",
            }
          : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Establish stable outgoing channel to partner's lobby
      const partnerChannelName = `call-lobby:${targetUserId}`;
      const channel = supabase.current.channel(partnerChannelName);
      outgoingChannelRef.current = channel;

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // 3. Create peer connection once channel is open
          const pc = new RTCPeerConnection(iceConfiguration);
          peerConnectionRef.current = pc;

          // Add media tracks
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          // Transmit ICE candidates to partner
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: "broadcast",
                event: "signal",
                payload: {
                  type: "ice-candidate",
                  senderId: currentUserId,
                  candidate: event.candidate,
                },
              });
            }
          };

          // Receive remote video/audio track
          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              setRemoteStream(event.streams[0]);
            }
          };

          // Generate SDP offer and broadcast to partner
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          channel.send({
            type: "broadcast",
            event: "signal",
            payload: {
              type: "call-initiated",
              callerId: currentUserId,
              callerName: currentUser.fullName || currentUser.username,
              callerAvatar: currentUser.avatarUrl || "",
              callerUsername: currentUser.username,
              sdp: offer,
              isVideo,
              conversationId,
            },
          });
        }
      });

    } catch (err: any) {
      console.error("Call initiation failed:", err);
      if (err.name === "NotAllowedError") {
        toast.error("Camera/microphone permissions were denied.", { style: TOAST.ERROR });
      } else if (err.name === "NotFoundError") {
        toast.error("No hardware input devices found.", { style: TOAST.ERROR });
      } else {
        toast.error("Could not access devices.", { style: TOAST.ERROR });
      }
      cleanupCall();
    }
  };

  // Decline incoming call
  const declineCall = () => {
    if (activeCall) {
      logCall(activeCall.conversationId, "📞 Declined call");
    }

    // Open a temporary channel to send decline if outgoing is not set up yet
    const tempChannel = supabase.current.channel(`call-lobby:${activeCall?.partnerId}`);
    tempChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        tempChannel.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "call-declined",
            calleeId: currentUserId,
          },
        });
        setTimeout(() => supabase.current.removeChannel(tempChannel), 1500);
      }
    });

    soundsRef.current?.playEndCall();
    cleanupCall();
  };

  // Accept incoming call (Callee logic)
  const acceptCall = async () => {
    soundsRef.current?.stop();
    if (!pendingOfferRef.current || !activeCall) {
      cleanupCall();
      return;
    }

    setActiveCall((prev) => (prev ? { ...prev, status: "connecting" } : null));

    try {
      const { sdp, isVideo } = pendingOfferRef.current;

      // 1. Capture local devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo
          ? {
              width: { min: 640, ideal: 1920, max: 1920 },
              height: { min: 480, ideal: 1080, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
              facingMode: "user",
            }
          : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Establish stable outgoing channel to caller's lobby
      const partnerChannelName = `call-lobby:${activeCall.partnerId}`;
      const channel = supabase.current.channel(partnerChannelName);
      outgoingChannelRef.current = channel;

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // 3. Setup peer connection
          const pc = new RTCPeerConnection(iceConfiguration);
          peerConnectionRef.current = pc;

          // Add media tracks
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          // Transmit ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: "broadcast",
                event: "signal",
                payload: {
                  type: "ice-candidate",
                  senderId: currentUserId,
                  candidate: event.candidate,
                },
              });
            }
          };

          // Receive remote video/audio track
          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              setRemoteStream(event.streams[0]);
            }
          };

          // Apply received SDP Offer description
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Flush queued candidates
          while (iceQueueRef.current.length > 0) {
            const candidate = iceQueueRef.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }

          // Create SDP Answer and broadcast back
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: "broadcast",
            event: "signal",
            payload: {
              type: "call-accepted",
              calleeId: currentUserId,
              sdp: answer,
            },
          });

          setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
        }
      });

    } catch (err: any) {
      console.error("Accepting call failed:", err);
      if (err.name === "NotAllowedError") {
        toast.error("Could not access camera/microphone permissions.", { style: TOAST.ERROR });
      } else {
        toast.error("WebRTC connection failed.", { style: TOAST.ERROR });
      }
      declineCall();
    }
  };

  // Hang up call
  const endCall = () => {
    if (activeCall) {
      const text = activeCall.status === "connected" ? "📞 Call ended" : "📞 Cancelled call";
      logCall(activeCall.conversationId, text);
    }

    sendSignal({
      type: "call-ended",
      senderId: currentUserId,
    });
    soundsRef.current?.playEndCall();
    cleanupCall();
  };

  // Toggle microphone track mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle camera track on/off
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider
      value={{
        initiateCall,
        activeCall,
        declineCall,
        acceptCall,
        endCall,
        toggleMute,
        toggleCamera,
        isMuted,
        isCamOff,
      }}
    >
      {children}

      {/* Premium Glassmorphic Call UI Overlay */}
      {activeCall && activeCall.status !== "idle" && (
        <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          
          {/* Header Metadata */}
          <div className="absolute top-6 left-6 flex items-center gap-2 text-stone-400 text-xs tracking-wider uppercase font-semibold">
            {activeCall.isVideo ? (
              <Video className="h-4.5 w-4.5 text-blue-500" />
            ) : (
              <Phone className="h-4.5 w-4.5 text-green-500" />
            )}
            <span>{activeCall.isVideo ? "Video Call" : "Voice Call"}</span>
          </div>

          {/* Central Workspace */}
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg px-6">
            
            {/* Outgoing Ringing / Incoming Call / Connecting States */}
            {(activeCall.status === "calling" || activeCall.status === "incoming" || activeCall.status === "connecting") && (
              <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="relative mb-6">
                  {(activeCall.status === "calling" || activeCall.status === "incoming") && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-1000" />
                      <div className="absolute -inset-4 rounded-full bg-blue-500/10 animate-pulse duration-1500" />
                    </>
                  )}
                  <Avatar className="h-28 w-28 border-2 border-stone-850 shadow-2xl">
                    <AvatarImage src={activeCall.partnerAvatar ?? ""} />
                    <AvatarFallback className="bg-stone-900 text-stone-300 text-3xl font-semibold">
                      {activeCall.partnerName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{activeCall.partnerName}</h2>
                
                <p className="text-stone-400 text-sm font-medium flex items-center gap-1.5">
                  {activeCall.status === "calling" && "Calling..."}
                  {activeCall.status === "incoming" && "Incoming call..."}
                  {activeCall.status === "connecting" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      Connecting secure line...
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Video Streams Layout (CONNECTED VIDEO STATE) */}
            {activeCall.status === "connected" && activeCall.isVideo && (
              <div className="relative w-full h-[60vh] md:h-[65vh] rounded-3xl overflow-hidden bg-stone-950 border border-stone-800 shadow-2xl flex items-center justify-center">
                
                {/* Remote Stream Video */}
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-stone-500 text-sm">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Waiting for stream connection...</span>
                  </div>
                )}

                {/* Local Camera (PIP Container) */}
                {localStream && (
                  <div className="absolute top-4 right-4 w-32 md:w-40 aspect-video rounded-xl overflow-hidden bg-stone-900 border border-white/10 shadow-lg z-10">
                    {isCamOff ? (
                      <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-500">
                        <VideoOff className="h-5 w-5" />
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    )}
                  </div>
                )}

                {/* Partner Name Label */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 text-xs text-white">
                  {activeCall.partnerName}
                </div>
              </div>
            )}

            {/* Audio Stream Layout (CONNECTED AUDIO STATE) */}
            {activeCall.status === "connected" && !activeCall.isVideo && (
              <div className="flex flex-col items-center text-center py-10 animate-in zoom-in-95 duration-200">
                <div className="relative mb-6">
                  <div className="absolute -inset-3 rounded-full bg-green-500/10 animate-pulse duration-1000" />
                  <Avatar className="h-32 w-32 border-2 border-stone-850 shadow-2xl">
                    <AvatarImage src={activeCall.partnerAvatar ?? ""} />
                    <AvatarFallback className="bg-stone-900 text-stone-300 text-4xl font-semibold">
                      {activeCall.partnerName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{activeCall.partnerName}</h2>
                <p className="text-green-500 text-sm font-semibold tracking-wide uppercase">Active Call</p>
                
                {/* Audio elements to play remote audio track */}
                {remoteStream && (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="hidden"
                  />
                )}
                {localStream && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="hidden"
                  />
                )}
              </div>
            )}

          </div>

          {/* Action Control Panel */}
          <div className="pb-16 pt-6 w-full flex justify-center px-6">
            
            {/* Incoming Ringing Actions */}
            {activeCall.status === "incoming" ? (
              <div className="flex items-center gap-6 animate-in slide-in-from-bottom-6 duration-200">
                <button
                  onClick={declineCall}
                  className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Decline"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
                <button
                  onClick={acceptCall}
                  className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 glow-blue-hover transition-all cursor-pointer"
                  title="Accept"
                >
                  <Phone className="h-6 w-6" />
                </button>
              </div>
            ) : (
              
              /* Active Call Action Controls */
              <div className="flex items-center gap-5 bg-stone-900/80 backdrop-blur-md px-6 py-4 rounded-full border border-stone-800 shadow-xl max-w-md w-full justify-around animate-in slide-in-from-bottom-8 duration-200">
                
                {/* Mute Mic */}
                <button
                  onClick={toggleMute}
                  disabled={activeCall.status === "connecting"}
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isMuted
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                      : "bg-stone-800 text-stone-200 hover:bg-stone-750"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                {/* Camera Toggle */}
                {activeCall.isVideo && (
                  <button
                    onClick={toggleCamera}
                    disabled={activeCall.status === "connecting"}
                    className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isCamOff
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                        : "bg-stone-800 text-stone-200 hover:bg-stone-750"
                    }`}
                    title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    {isCamOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                )}

                {/* Hang Up */}
                <button
                  onClick={endCall}
                  className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Hang Up"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>

              </div>
            )}
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
