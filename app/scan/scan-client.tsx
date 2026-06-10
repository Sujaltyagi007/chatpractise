"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Camera, QrCode, Sparkles, Upload, 
  Copy, Check, AlertCircle, RefreshCw, Smartphone
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeScannerState, CameraDevice } from "html5-qrcode";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/chat-utils";
import { cn } from "@/lib/utils";

interface ScanClientProps {
  profile: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export default function ScanClient({ profile }: ScanClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"scan" | "my-code">("scan");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scannerStarted, setScannerStarted] = useState(false);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const profileUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/people/${profile.username}` 
    : `/people/${profile.username}`;

  // QR Code image URL generator
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}&color=4f46e5&bgcolor=ffffff&margin=10`;

  // Initialize and list cameras
  useEffect(() => {
    if (activeTab !== "scan") {
      stopScanner();
      return;
    }

    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameraPermission(true);
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Try to select back camera first, otherwise the first device
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes("back") || 
            device.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.error("Camera listing error:", err);
        setCameraPermission(false);
      });

    return () => {
      stopScanner();
    };
  }, [activeTab]);

  // Restart scanner when selected camera changes
  useEffect(() => {
    if (activeTab === "scan" && selectedCameraId && cameraPermission) {
      startScanner(selectedCameraId);
    }
  }, [selectedCameraId, activeTab, cameraPermission]);

  const startScanner = async (cameraId: string) => {
    try {
      await stopScanner();
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      qrCodeInstanceRef.current = html5QrCode;

      setScanError(null);
      setScannerStarted(true);

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Keep logging minimal to avoid console spamming
        }
      );
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      setScanError(err.message || "Failed to start camera scanner");
      setScannerStarted(false);
    }
  };

  const stopScanner = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    qrCodeInstanceRef.current = null;
    setScannerStarted(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    setScanResult(decodedText);
    stopScanner();

    // Check if the QR code is a URL matching our site's pattern
    try {
      const url = new URL(decodedText);
      const pathSegments = url.pathname.split("/");
      // E.g. domain/people/username
      const peopleIndex = pathSegments.indexOf("people");
      if (peopleIndex !== -1 && pathSegments[peopleIndex + 1]) {
        const targetUsername = pathSegments[peopleIndex + 1];
        router.push(`/people/${targetUsername}`);
        return;
      }
    } catch (e) {
      // Not a valid URL, check if it's a simple string that might be a username
      const cleanText = decodedText.trim();
      if (/^[a-zA-Z0-9_-]{3,30}$/.test(cleanText)) {
        router.push(`/people/${cleanText}`);
        return;
      }
    }
  };

  // Scan file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Temporary element to use html5-qrcode
    const tempScanner = new Html5Qrcode("qr-reader-temp");
    setScanError(null);

    try {
      const decodedText = await tempScanner.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err: any) {
      console.error("File scan error:", err);
      setScanError("Could not find a valid QR Code in this image.");
    } finally {
      tempScanner.clear();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col font-sans text-stone-900 dark:text-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-stone-200 dark:border-stone-850 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/chat"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center gap-2"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Chats</span>
          </Link>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <QrCode className="h-5 w-5 animate-pulse" />
            <span>QR Connect</span>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col items-center">
        {/* Navigation Tabs */}
        <div className="flex w-full p-1 bg-stone-200/60 dark:bg-stone-900/60 rounded-xl mb-6 border border-stone-200/20 dark:border-stone-800/30">
          <button
            onClick={() => setActiveTab("scan")}
            className={cn(
              "flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === "scan"
                ? "bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-sm"
                : "text-stone-500 hover:text-stone-950 dark:hover:text-stone-300"
            )}
          >
            <Camera className="h-4 w-4" />
            Scan QR Code
          </button>
          <button
            onClick={() => setActiveTab("my-code")}
            className={cn(
              "flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === "my-code"
                ? "bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-sm"
                : "text-stone-500 hover:text-stone-950 dark:hover:text-stone-300"
            )}
          >
            <Smartphone className="h-4 w-4" />
            My QR Code
          </button>
        </div>

        {/* Scan Tab */}
        {activeTab === "scan" && (
          <div className="w-full flex flex-col items-center">
            {/* Camera Scan Window */}
            <div className="w-full relative aspect-square rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-950 flex items-center justify-center shadow-2xl">
              {/* HTML5 QR Container */}
              <div id="qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
              <div id="qr-reader-temp" className="hidden" />

              {/* Scanning Target Box Interface Overlay */}
              {scannerStarted && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                    <div className="w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                  </div>
                  
                  {/* Laser scan line effect */}
                  <div className="w-full h-0.5 bg-indigo-500/80 shadow-[0_0_12px_#6366f1] animate-bounce my-auto" />

                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                    <div className="w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                  </div>
                </div>
              )}

              {/* Camera Permission State */}
              {cameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-900/95 text-white">
                  <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                  <p className="font-semibold text-sm">Camera Permission Denied</p>
                  <p className="text-xs text-stone-400 mt-1 mb-4">
                    Please grant camera access to scan QR codes, or upload an image instead.
                  </p>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => {
                      setCameraPermission(null);
                      // Trigger prompt again
                      Html5Qrcode.getCameras()
                        .then((devices) => {
                          setCameraPermission(true);
                          if (devices && devices.length > 0) {
                            setCameras(devices);
                            setSelectedCameraId(devices[0].id);
                          }
                        })
                        .catch(() => setCameraPermission(false));
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
                  </Button>
                </div>
              )}

              {/* Scanning finished / Result confirmation */}
              {scanResult && (
                <div className="absolute inset-0 bg-stone-950/90 flex flex-col items-center justify-center p-6 text-center text-white">
                  <Sparkles className="h-12 w-12 text-indigo-400 mb-3 animate-bounce" />
                  <p className="font-bold text-lg">QR Code Scanned!</p>
                  <p className="text-xs text-stone-400 max-w-xs mt-1 truncate mb-6">{scanResult}</p>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => {
                        setScanResult(null);
                        if (selectedCameraId) startScanner(selectedCameraId);
                      }}
                    >
                      Scan Again
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Error notifications */}
            {scanError && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs w-full">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Camera Options & File Uploader */}
            <div className="w-full mt-6 space-y-4">
              {cameras.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-stone-400">Select Camera</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {cameras.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.label || `Camera ${cameras.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 w-full justify-center pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-stone-200 dark:border-stone-850 gap-2 h-11 text-sm bg-white dark:bg-stone-900 rounded-xl"
                >
                  <Upload className="h-4 w-4 text-stone-500" />
                  <span>Upload from Gallery</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* My QR Code Tab */}
        {activeTab === "my-code" && (
          <div className="w-full flex flex-col items-center">
            {/* Glow effect card wrapper */}
            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-indigo-500 to-purple-600 rounded-3xl blur-md opacity-25 dark:opacity-45 group-hover:opacity-40 transition duration-1000" />
              
              <div className="relative w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 flex flex-col items-center shadow-xl">
                {/* Profile header inside card */}
                <Avatar className="h-16 w-16 mb-2 ring-4 ring-indigo-500/10">
                  <AvatarImage src={profile.avatarUrl ?? ""} />
                  <AvatarFallback className="bg-indigo-600 text-white text-lg font-bold">
                    {getInitials(profile.fullName, profile.username)}
                  </AvatarFallback>
                </Avatar>
                
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  {profile.fullName ?? profile.username}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
                  @{profile.username}
                </p>

                {/* QR Code Canvas Representation */}
                <div className="bg-white p-4 rounded-2xl border border-stone-100 dark:border-stone-800/10 shadow-sm flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt="My QR Code"
                    className="w-48 h-48 select-none"
                    loading="lazy"
                  />
                </div>

                <p className="text-[10px] text-stone-400 text-center mt-6 max-w-xs leading-relaxed">
                  Have a friend scan this QR code on their phone to instantly view your profile and start chatting!
                </p>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="w-full mt-6 space-y-3">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="w-full border-stone-200 dark:border-stone-850 gap-2 h-11 text-sm bg-white dark:bg-stone-900 rounded-xl"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-500 font-medium">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-stone-500" />
                    <span>Copy Profile Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
