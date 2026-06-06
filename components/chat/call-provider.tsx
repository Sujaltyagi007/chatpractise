"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/actions/chat";
import { useNotification } from "@/lib/hooks/use-notification";
import { CallSounds } from "./call-sounds";
import { CallState, CallContextType, fetchDynamicIceServers } from "./call-types";
import { CallOverlay } from "./call-overlay";

const CallContext = createContext<CallContextType | undefined>(undefined);

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
  const notification = useNotification();

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
  const isOutgoingSubscribed = useRef(false); // Guards against sending on an unsubscribed channel
  const iceConfigRef = useRef<RTCConfiguration | null>(null); // Cache dynamic TURN credentials

  const supabase = useRef(createClient());

  // Initialize sounds class on mount
  useEffect(() => {
    soundsRef.current = new CallSounds();

    // Auto-unlock/initialize AudioContext on first user interaction
    const unlockAudio = () => {
      soundsRef.current?.initCtx();
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      soundsRef.current?.destroy();
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
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
                  // "connected" status is now set by oniceconnectionstatechange when ICE actually establishes
                } catch (e) {
                  console.error("Failed to apply remote SDP description:", e);
                  notification.error("RTC connection failed");
                  cleanupCall();
                }
              }
            }
            break;

          case "call-declined":
            if (call && (call.status === "calling" || call.status === "connecting") && call.partnerId === data.calleeId) {
              notification.error("Call declined by user");
              soundsRef.current?.playEndCall();
              cleanupCall();
            }
            break;

          case "call-busy":
            if (call && call.status === "calling" && data.targetCallerId === currentUserId) {
              notification.error("User is currently busy on another call");
              soundsRef.current?.playEndCall();
              logCall(call.conversationId, "📞 Missed call (Busy)");
              cleanupCall();
            }
            break;

          case "ice-candidate":
            if (call && call.partnerId === data.senderId) {
              const pc = peerConnectionRef.current;
              if (pc && pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                  console.error("Error adding WebRTC candidate:", e);
                }
              } else {
                // Queue candidates if they arrive before setRemoteDescription executes
                // OR before the peer connection is even created (during the ringing phase)
                iceQueueRef.current.push(data.candidate);
              }
            }
            break;

          case "call-ended":
            if (call && call.partnerId === data.senderId) {
              notification.success("Call ended");
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
          notification.error("No answer");
          sendSignal({ type: "call-ended", senderId: currentUserId });
          logCall(activeCall.conversationId, activeCall.isVideo ? "📞 Missed video call" : "📞 Missed voice call");
        } else if (activeCall.status === "incoming") {
          notification.success("Missed call");
          // outgoingChannelRef is null for an unanswered call — use a temp channel to notify caller
          const partnerId = activeCall.partnerId;
          const tempCh = supabase.current.channel(`call-lobby:${partnerId}`);
          tempCh.subscribe((tempStatus) => {
            if (tempStatus === "SUBSCRIBED") {
              tempCh.send({
                type: "broadcast",
                event: "signal",
                payload: { type: "call-declined", calleeId: currentUserId },
              });
              setTimeout(() => supabase.current.removeChannel(tempCh), 1500);
            }
          });
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

  // Removed localVideoRef and remoteVideoRef as they are now handled internally by CallOverlay

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
    if (outgoingChannelRef.current && isOutgoingSubscribed.current) {
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
    isOutgoingSubscribed.current = false;

    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIsMuted(false);
    setIsCamOff(false);
    iceQueueRef.current = [];
    pendingOfferRef.current = null;
  };

  // Fetch and cache dynamic ICE configuration (TURN credentials from Metered.ca)
  const getIceConfig = useCallback(async (): Promise<RTCConfiguration> => {
    if (iceConfigRef.current) {
      return iceConfigRef.current;
    }
    const config = await fetchDynamicIceServers();
    iceConfigRef.current = config;
    return config;
  }, []);

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
      // 0. Fetch dynamic TURN credentials from Metered.ca
      const iceConfig = await getIceConfig();

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

      isOutgoingSubscribed.current = false;
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          isOutgoingSubscribed.current = true;
          // 3. Create peer connection once channel is open
          const pc = new RTCPeerConnection(iceConfig);
          peerConnectionRef.current = pc;

          // Add media tracks
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          pc.oniceconnectionstatechange = () => {
            console.log("Caller ICE State:", pc.iceConnectionState);
            if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
              setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
            }
            if (pc.iceConnectionState === "failed") {
              notification.error("WebRTC Connection Failed (Firewall/NAT issue)");
              sendSignal({ type: "call-ended", senderId: currentUserId });
              cleanupCall();
            }
          };

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

          // Receive remote video/audio track robustly
          pc.ontrack = (event) => {
            setRemoteStream((prevStream) => {
              if (prevStream) {
                const existingTracks = prevStream.getTracks();
                if (!existingTracks.includes(event.track)) {
                  // Return a NEW MediaStream so React detects the change and re-renders
                  return new MediaStream([...existingTracks, event.track]);
                }
                return prevStream;
              }
              if (event.streams && event.streams[0]) {
                return event.streams[0];
              }
              return new MediaStream([event.track]);
            });
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
        notification.error("Camera/microphone permissions were denied.");
      } else if (err.name === "NotFoundError") {
        notification.error("No hardware input devices found.");
      } else {
        notification.error("Could not access devices.");
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
      // 0. Fetch dynamic TURN credentials from Metered.ca
      const iceConfig = await getIceConfig();

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

      isOutgoingSubscribed.current = false;
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          isOutgoingSubscribed.current = true;
          // 3. Setup peer connection
          const pc = new RTCPeerConnection(iceConfig);
          peerConnectionRef.current = pc;

          // Add media tracks
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          pc.oniceconnectionstatechange = () => {
            console.log("Callee ICE State:", pc.iceConnectionState);
            if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
              setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
            }
            if (pc.iceConnectionState === "failed") {
              notification.error("WebRTC Connection Failed (Firewall/NAT issue)");
              sendSignal({ type: "call-ended", senderId: currentUserId });
              cleanupCall();
            }
          };

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

          // Receive remote video/audio track robustly
          pc.ontrack = (event) => {
            setRemoteStream((prevStream) => {
              if (prevStream) {
                const existingTracks = prevStream.getTracks();
                if (!existingTracks.includes(event.track)) {
                  // Return a NEW MediaStream so React detects the change and re-renders
                  return new MediaStream([...existingTracks, event.track]);
                }
                return prevStream;
              }
              if (event.streams && event.streams[0]) {
                return event.streams[0];
              }
              return new MediaStream([event.track]);
            });
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
          // "connected" status is now set by oniceconnectionstatechange when ICE actually establishes
        }
      });

    } catch (err: any) {
      console.error("Accepting call failed:", err);
      if (err.name === "NotAllowedError") {
        notification.error("Could not access camera/microphone permissions.");
      } else {
        notification.error("WebRTC connection failed.");
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

      {activeCall && activeCall.status !== "idle" && (
        <CallOverlay
          activeCall={activeCall}
          isMuted={isMuted}
          isCamOff={isCamOff}
          localStream={localStream}
          remoteStream={remoteStream}
          declineCall={declineCall}
          acceptCall={acceptCall}
          endCall={endCall}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
        />
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
