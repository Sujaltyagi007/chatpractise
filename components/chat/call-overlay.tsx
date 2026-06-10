import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CallState } from "./call-types";

interface CallOverlayProps {
  activeCall: CallState;
  isMuted: boolean;
  isCamOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  declineCall: () => void;
  acceptCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

export function CallOverlay({
  activeCall,
  isMuted,
  isCamOff,
  localStream,
  remoteStream,
  declineCall,
  acceptCall,
  endCall,
  toggleMute,
  toggleCamera,
}: CallOverlayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, activeCall.status]);

  // Attach remote stream
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((e) => {
          console.warn("Video play blocked:", e);
          setAutoplayBlocked(true);
        });
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        // Attempt to play if browser suspended it
        remoteAudioRef.current.play().catch((e) => {
          console.warn("Audio play blocked:", e);
          setAutoplayBlocked(true);
        });
      }
    }
  }, [remoteStream, activeCall.status]);

  if (activeCall.status === "idle") return null;

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Autoplay Blocked Warning Overlay */}
      {autoplayBlocked && (
        <div className="absolute top-20 z-50 flex flex-col items-center gap-3 animate-in slide-in-from-top-4">
          <div className="bg-red-500/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg backdrop-blur-md">
            Browser blocked auto-play. Please enable sound.
          </div>
          <button
            onClick={() => {
              remoteAudioRef.current?.play().then(() => setAutoplayBlocked(false)).catch(() => { });
              remoteVideoRef.current?.play().then(() => setAutoplayBlocked(false)).catch(() => { });
            }}
            className="bg-white text-black px-6 py-2.5 rounded-full font-bold shadow-xl hover:bg-stone-200 transition-all active:scale-95 cursor-pointer"
          >
            Tap to Enable Sound
          </button>
        </div>
      )}

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
      <div className={`flex flex-col items-center justify-center flex-1 w-full px-6 transition-all duration-300 ${activeCall.status === "connected" && activeCall.isVideo
        ? "max-w-5xl"
        : "max-w-lg"
        }`}>
        {/* Outgoing Ringing / Incoming Call / Connecting States */}
        {(activeCall.status === "calling" ||
          activeCall.status === "incoming" ||
          activeCall.status === "connecting") && (
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
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-stone-950 border border-stone-800 shadow-2xl flex items-center justify-center">
            {/* Remote Stream Video - UNMUTED so audio plays correctly */}
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
              <div className="absolute top-4 right-4 w-32 md:w-44 aspect-video rounded-2xl overflow-hidden bg-stone-900 border border-white/15 shadow-xl z-10 transition-all duration-300">
                {isCamOff ? (
                  <div className="w-full h-full flex items-center justify-center bg-stone-950 text-stone-600">
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

            {/* Dedicated Audio element for remote voice */}
            {remoteStream && (
              <audio ref={remoteAudioRef} autoPlay playsInline style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }} />
            )}
          </div>
        )}
      </div>

      {/* Action Control Panel */}
      <div className="pb-16 pt-6 w-full flex justify-center px-6">
        {/* Incoming Ringing Actions */}
        {activeCall.status === "incoming" ? (
          <div className="flex items-center gap-8 animate-in slide-in-from-bottom-6 duration-200">
            <button onClick={declineCall} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="h-14 w-14 rounded-full bg-red-655 hover:bg-red-555 text-white flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-all border border-red-500/10 bg-red-650 hover:bg-red-550 bg-red-600 hover:bg-red-550">
                <PhoneOff className="h-5.5 w-5.5" />
              </div>
              <span className="text-xs font-semibold text-red-400 group-hover:text-red-350 tracking-wide">
                Decline
              </span>
            </button>

            <button onClick={acceptCall} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="h-14 w-14 rounded-full bg-green-655 hover:bg-green-555 text-white flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-all border border-green-500/10 bg-green-655 hover:bg-green-555 bg-green-600 hover:bg-green-550">
                <Phone className="h-5.5 w-5.5" />
              </div>
              <span className="text-xs font-semibold text-green-400 group-hover:text-green-300 tracking-wide">
                Accept
              </span>
            </button>
          </div>
        ) : (
          /* Zoom-Style Action Control Panel */
          <div className="flex items-end justify-center gap-6  px-8 py-3.5 rounded-2xl shadow-2xl max-w-sm w-full animate-in slide-in-from-bottom-8 duration-200">
            <button onClick={toggleMute} className="flex flex-col items-center gap-1.5 group cursor-pointer">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${isMuted ? "bg-red-500/20 text-red-400 border border-red-500/30 group-hover:bg-red-500/30" : "bg-white/5 text-stone-300 group-hover:bg-white/10 border border-white/5"}`}>
                {isMuted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              </div>
              <span className="text-[10px] font-semibold text-stone-400 group-hover:text-stone-300 transition-colors tracking-wide">
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </button>

            {/* Camera Toggle */}
            {activeCall.isVideo && (
              <button onClick={toggleCamera} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${isCamOff ? "bg-red-500/20 text-red-40 border border-red-500/30 group-hover:bg-red-500/30" : "bg-white/5 text-stone-300 group-hover:bg-white/10 border border-white/5"}`}>
                  {isCamOff ? <VideoOff className="h-4.5 w-4.5" /> : <Video className="h-4.5 w-4.5" />}
                </div>
                <span className="text-[10px] font-semibold text-stone-400 group-hover:text-stone-300 transition-colors tracking-wide">{isCamOff ? "Start Video" : "Stop Video"}</span>
              </button>
            )}

            {/* Hang Up (Call Cut Button) */}
            <button onClick={endCall} className="flex flex-col items-center gap-1.5 group cursor-pointer">
              <div className="h-11 px-5 rounded-xl bg-red-600 hover:bg-red-550 text-white flex items-center justify-center gap-2 shadow-md group-hover:scale-[1.02] active:scale-95 transition-all border border-red-500/20">
                <Phone className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">End</span>
              </div>
              <span className="text-[10px] font-semibold text-red-400/80 group-hover:text-red-450 transition-colors tracking-wide">
                End Call
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
