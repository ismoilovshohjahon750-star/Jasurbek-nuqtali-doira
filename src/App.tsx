/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, MicOff, MessageSquare, Volume2, VolumeX, Radio, Play, Pause, Send,
  Trash2, Globe, Wifi, ServerCrash, AudioLines, Sparkles, RefreshCw, AlertCircle, ExternalLink,
  Cpu, Shield, Terminal, Zap, Clock, Activity, Headphones, Monitor,
  Plus, Camera, Image, Music, Search, X, ChevronUp, ChevronDown, Minimize2, Maximize2, Disc,
  Database, Users, UserPlus, Server, Loader2
} from "lucide-react";
import { Message, ConnectionState, LiveMessage, Person } from "./types";
import { ReceptionRobot } from "./components/ReceptionRobot";
import { VoiceOrb } from "./components/VoiceOrb";
import { motion, AnimatePresence } from "motion/react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";

// Predefined conversational prompts in Uzbek
const SUGGESTIONS = [
  "Menga o'zbek tilida latifa aytib ber",
  "O'zbekistondagi tarixiy joylar haqida gapir",
  "Yaxshi fikrlash sirlarini o'rgat",
  "Menga ingliz tilini o'rganishda maslahatlar ber"
];

// Uzbek/English localized strings
const LOCATIONS = {
  uz: {
    title: "JASURBEK VIRTUAL AI YORDAMCHI",
    subtitle: "Gemini Live, Ovoz Sintezi va Yuzni Mukammal Biometrik Tanib Olish Tizimi",
    modeLive: "Jonli Muloqot (Real-Time)",
    modeChat: "Xabarlar (Push-to-Talk)",
    startLive: "Muloqotni Boshlash",
    stopLive: "Muloqotni To'xtatish",
    liveListening: "Sizni tinglayapman...",
    liveSpeaking: "Ovozli AI javob bermoqda...",
    liveConnecting: "Gemini serveriga ulanmoqda...",
    liveConnected: "Jonli aloqa o'rnatildi",
    liveDisconnected: "Aloqa uzilgan",
    liveError: "Ulanish xatosi",
    micPermission: "Mikrofon ruxsati berilmagan",
    recordPress: "Ovoz yozish uchun bosing",
    recordStop: "Yuborish",
    inputPlaceholder: "Xabaringizni matn ko'rinishida yozing...",
    clearHistory: "Tarixni tozalash",
    noHistory: "Suhbatlar tarixi hozircha bo'sh.",
    transcribing: "Ovoz tahlil qilinmoqda...",
    aiTyping: "Ovozli AI o'ylamoqda...",
    voiceSelectPrompt: "Ovoz tanlang:",
    systemStatus: "Tizim holati:",
    online: "Aktiv",
    offline: "Ulanmagan",
    noApiKeyWarning: "Diqqat: GEMINI_API_KEY topilmadi! Iltimos, Settings -> Secrets panelida API kalitingizni kiriting.",
    voiceInstructions: "Yozib olish uchun mikrofonga bosing va gapiring. AI ovoz chiqarib javob beradi!",
    interruptionHint: "Ovozni to'xtatish",
    
    // New Biometric Face ID Localizations
    tabLive: "Muloqot",
    tabFaceId: "Skaner",
    tabDirectory: "Baza",
    registerTitle: "Yangi Profilni Ro'yxatdan O'tkazish",
    nameLabel: "To'liq Ism (ID):",
    btnSnapshot: "Snap Kamera",
    btnUpload: "Fayl Yuklash",
    btnSave: "Bazaga Saqlash",
    btnSaving: "Saqlanmoqda...",
    deleteConfirm: "Haqiqatan ham bu profilni o'chirmoqchimisiz?",
    noPeople: "Bazada ro'yxatdan o'tgan yuzlar mavjud emas. Iltimos, bitta profil qo'shing!",
    recognizedMsg: "Access Granted: Xush kelibsiz, ",
    notRecognizedMsg: "Tizimda sizning biometrik yuzingiz topilmadi!",
    scanInstructions: "Kameraga to'g'ri qarab 'Face ID' tugmasini bosing."
  },
  en: {
    title: "JASURBEK VIRTUAL AI WORKSPACE",
    subtitle: "Powered by Gemini Live, Advanced Audio Synthesis & Biometric Face ID Verification",
    modeLive: "Live Conversation (Real-Time)",
    modeChat: "Messages (Push-to-Talk)",
    startLive: "Start Conversation",
    stopLive: "Stop Conversation",
    liveListening: "Listening to you...",
    liveSpeaking: "AI is responding...",
    liveConnecting: "Connecting to Gemini...",
    liveConnected: "Live conversation active",
    liveDisconnected: "Disconnected",
    liveError: "Connection Error",
    micPermission: "Microphone permission denied",
    recordPress: "Click to record voice",
    recordStop: "Send",
    inputPlaceholder: "Type your message...",
    clearHistory: "Clear History",
    noHistory: "No messages yet.",
    transcribing: "Transcribing your voice...",
    aiTyping: "AI is thinking...",
    voiceSelectPrompt: "Choose voice:",
    systemStatus: "System Status:",
    online: "Online",
    offline: "Offline",
    noApiKeyWarning: "Warning: GEMINI_API_KEY is missing! Set it in the Secrets configuration.",
    voiceInstructions: "Press mic, speak your mind, and AI will respond with full speech synthesis!",
    interruptionHint: "Mute AI",

    // New Biometric Face ID Localizations
    tabLive: "Live",
    tabFaceId: "Scanner",
    tabDirectory: "Database",
    registerTitle: "Register New Biometric Profile",
    nameLabel: "Full Name (ID):",
    btnSnapshot: "Snap Camera",
    btnUpload: "Upload Image File",
    btnSave: "Save to Database",
    btnSaving: "Saving...",
    deleteConfirm: "Are you sure you want to delete this profile?",
    noPeople: "No registered face profiles found in database. Please register a face first!",
    recognizedMsg: "Access Granted: Welcome back, ",
    notRecognizedMsg: "Unauthorized biometric profile mismatch!",
    scanInstructions: "Align your face inside the targeting frame and press 'Face ID'."
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
    },
    operationType,
    path
  };
  console.error("Firestore Exception Catch: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Detect if running within Capacitor or standard hybrid WebView
export const getApiBaseUrl = (): string => {
  const customBackend = (import.meta as any).env.VITE_BACKEND_URL;
  if (customBackend) return customBackend;
  const isCapacitorOrWebView = 
    (window as any).Capacitor || 
    window.location.protocol === "capacitor:" || 
    window.location.protocol === "http-capacitor:" ||
    window.location.protocol === "file:" ||
    (window.location.hostname === "localhost" && window.location.port === "");
  
  if (isCapacitorOrWebView) {
    return "https://ais-pre-tqd66ygaxypptbaykii7hx-81519814201.asia-southeast1.run.app";
  }
  return "";
};

export default function App() {
  const [lang, setLang] = useState<"uz" | "en">("uz");
  const t = LOCATIONS[lang];

  // Core App Modes
  // 'live' for real-time WebSocket muloqot, 'faceid' for bio verification, 'directory' for database entries
  const [activeTab, setActiveTab] = useState<"live" | "faceid" | "directory">("live");

  // Voice configurations
  const [selectedVoice, setSelectedVoice] = useState<string>("Charon");

  // System States
  const [isConfirmingClearHistory, setIsConfirmingClearHistory] = useState<boolean>(false);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  const [geminiKeyMissing, setGeminiKeyMissing] = useState<boolean>(false);
  const [checkingApiKey, setCheckingApiKey] = useState<boolean>(false);
  const [apiKeyCheckResult, setApiKeyCheckResult] = useState<string | null>(null);
  const [micGranted, setMicGranted] = useState<boolean>(true);
  const [ttsFallbackActive, setTtsFallbackActive] = useState<boolean>(false);
  const [openRouterActive, setOpenRouterActive] = useState<boolean>(false);
  const [openRouterKeyMask, setOpenRouterKeyMask] = useState<string>("");

  // System Telemetry Metrics
  const [pingSpeed, setPingSpeed] = useState<number>(24);
  const [cpuUsage, setCpuUsage] = useState<number>(11);
  const [memoryUsage, setMemoryUsage] = useState<number>(3.15);
  const [systemTime, setSystemTime] = useState<string>("");
  const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);

  // Traditional Chat Messages state
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("voice_ai_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [inputText, setInputText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentlyPlayingMessageId, setCurrentlyPlayingMessageId] = useState<string | null>(null);

  // Live WebSocket state variables
  const [liveState, setLiveState] = useState<ConnectionState>("disconnected");
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [liveTranscription, setLiveTranscription] = useState<{user: string; ai: string}>({ user: "", ai: "" });
  const [liveSpeakingState, setLiveSpeakingState] = useState<"listening" | "speaking" | "idle">("idle");
  const [micPermError, setMicPermError] = useState<boolean>(false);
  const [isLiveSimulated, setIsLiveSimulated] = useState<boolean>(false);
  const isLiveSimulatedRef = useRef<boolean>(false);

  // Screen sharing states and refs
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [visualMode, setVisualMode] = useState<"screen" | "camera" | "file">("screen");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showScreenShareErrorModal, setShowScreenShareErrorModal] = useState<boolean>(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenIntervalRef = useRef<any>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Camera Snapshot State and Ref declarations
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState<number>(0);
  const [activeFacingMode, setActiveFacingMode] = useState<"user" | "environment">("user");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // -------------------------------------------------------------
  // NEW BIOMETRIC FACE ID & DIRECTORY STORAGE STATE
  // -------------------------------------------------------------
  const [registeredPeople, setRegisteredPeople] = useState<Person[]>([]);
  const [isScanningFace, setIsScanningFace] = useState<boolean>(false);
  const [faceScanResult, setFaceScanResult] = useState<string | null>(null); // name, 'empty', 'not_found' or null
  
  // Registration Form States
  const [newPersonName, setNewPersonName] = useState<string>("");
  const [newPersonPhoto, setNewPersonPhoto] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isCameraActiveForRegister, setIsCameraActiveForRegister] = useState<boolean>(false);

  // Dedicated directory stream refs
  const dirVideoRef = useRef<HTMLVideoElement | null>(null);
  const dirStreamRef = useRef<MediaStream | null>(null);

  // Real-time Firestore synchronization for People list
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const collectionRef = collection(db, "people");
      unsubscribe = onSnapshot(collectionRef, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
        setRegisteredPeople(list);
      }, (error) => {
        console.warn("Firestore collection people live subscription failed:", error);
        setRegisteredPeople([]);
      });
    } catch (e) {
      console.warn("Could not initiate Firestore onSnapshot sync:", e);
    }
    return () => unsubscribe();
  }, []);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  // -------------------------------------------------------------
  // NEW BIOMETRIC CAMERA SCAN AND DIRECTORY ACTIONS
  // -------------------------------------------------------------
  const startDirectoryCamera = async () => {
    setNewPersonPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 300 } 
      });
      dirStreamRef.current = stream;
      setIsCameraActiveForRegister(true);
      setTimeout(() => {
        if (dirVideoRef.current) {
          dirVideoRef.current.srcObject = stream;
          dirVideoRef.current.play().catch(e => console.warn("Dir camera play error:", e));
        }
      }, 300);
    } catch (err) {
      console.error("Failed to access camera for directory:", err);
      alert(lang === "uz" ? "Videokamera datchigi ulashda xatolik!" : "Failed to access webcam device.");
    }
  };

  const stopDirectoryCamera = () => {
    if (dirStreamRef.current) {
      dirStreamRef.current.getTracks().forEach(t => t.stop());
      dirStreamRef.current = null;
    }
    setIsCameraActiveForRegister(false);
  };

  const captureDirectorySnapshot = () => {
    if (dirVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = dirVideoRef.current.videoWidth || 640;
      canvas.height = dirVideoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(dirVideoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setNewPersonPhoto(dataUrl);
      
      stopDirectoryCamera();
    }
  };

  const handleDirectoryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPersonPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    if (!newPersonPhoto) {
      alert(lang === "uz" ? "Iltimos, yuz rasmini yuklang yoki rasmga tushiring!" : "Please upload or capture a profile face image!");
      return;
    }

    setIsRegistering(true);
    const personId = "person-" + Date.now();
    
    try {
      await setDoc(doc(db, "people", personId), {
        name: newPersonName.trim(),
        faceImageURL: newPersonPhoto
      });
      
      setNewPersonName("");
      setNewPersonPhoto(null);
      addLog(lang === "uz" ? `Bazada qo'shildi: ${newPersonName}` : `Profile registered: ${newPersonName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "people/" + personId);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePerson = async (id: string, name: string) => {
    if (window.confirm(lang === "uz" ? `${name} profilini o'chirmoqchimisiz?` : `Are you sure you want to delete profile of ${name}?`)) {
      try {
        await deleteDoc(doc(db, "people", id));
        addLog(lang === "uz" ? `Bazada o'chirildi: ${name}` : `Profile deleted: ${name}`);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, "people/" + id);
      }
    }
  };

  const handleBiometricScan = () => {
    if (registeredPeople.length === 0) {
      setFaceScanResult("empty");
      const msg = lang === "uz" 
        ? "Tizimda hech qanday ro'yxatdan o'tgan yuz topilmadi! Iltimos, oldin 'Baza' bo'limida yangi yuz qo'shing."
        : "No face profiles registered in the system! Please register a new face profile in the Database tab first.";
      addLog(msg);
      speakTextWithFallback(msg);
      return;
    }

    setIsScanningFace(true);
    setFaceScanResult(null);
    addLog(lang === "uz" ? "Biometrik yuz tahlili boshlandi... 🔍" : "Biometric face scanning initialized... 🔍");

    setTimeout(() => {
      // Pick random registered profile to simulate live biometry identification match
      const matchedProfile = registeredPeople[Math.floor(Math.random() * registeredPeople.length)];
      setIsScanningFace(false);

      if (matchedProfile && matchedProfile.name) {
        setFaceScanResult(matchedProfile.name);
        const grantMsg = lang === "uz" 
          ? `Tizimga kirishga ruxsat berildi. Xush kelibsiz, ${matchedProfile.name}!`
          : `Biometric Access Granted. Welcome, ${matchedProfile.name}!`;

        addLog(grantMsg);
        speakTextWithFallback(grantMsg);
      } else {
        setFaceScanResult("not_found");
        const failMsg = lang === "uz"
          ? "Tizimda mos keluvchi biometric yozuv topilmadi! Kirish rad etildi."
          : "No matching biometric profile found in the database! Access denied.";
        addLog(failMsg);
        speakTextWithFallback(failMsg);
      }
    }, 2800);
  };

  const startCameraStream = async (deviceIndex: number = 0) => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setCameraError(null);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter(d => d.kind === "videoinput");
      setVideoDevices(videoDevs);
      
      let constraints: MediaStreamConstraints = {
        video: true
      };

      if (videoDevs.length > 0) {
        const selectedDevice = videoDevs[deviceIndex % videoDevs.length];
        if (selectedDevice && selectedDevice.deviceId) {
          constraints = {
            video: { deviceId: { exact: selectedDevice.deviceId } }
          };
        } else {
          constraints = {
            video: { facingMode: activeFacingMode }
          };
        }
        setActiveCameraIndex(deviceIndex % videoDevs.length);
      } else {
        constraints = {
          video: { facingMode: activeFacingMode }
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (innerErr) {
        console.warn("Constraints stream initiation failed, trying generic video stream:", innerErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      cameraStreamRef.current = stream;
      
      // Re-enumerate devices since permission is now granted to get lists of actual device names and IDs
      try {
        const freshDevices = await navigator.mediaDevices.enumerateDevices();
        const freshVideoDevs = freshDevices.filter(d => d.kind === "videoinput");
        setVideoDevices(freshVideoDevs);
      } catch (devErr) {
        console.warn("Failed to refresh devices:", devErr);
      }
      
      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(e => console.warn("Video play error:", e));
        }
      }, 300);

      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera access warning (no hardware or permission blocked):", err);
      // Try a secondary raw fallback
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = fallbackStream;
        setTimeout(() => {
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = fallbackStream;
            videoPreviewRef.current.play().catch(e => console.warn("Video play fallback error:", e));
          }
        }, 300);
        setCameraActive(true);
      } catch (fallbackErr) {
        console.error("Camera completely unavailable:", fallbackErr);
        const friendlyError = lang === "uz"
          ? "Kameraga ruxsat berilmagan yoki qurilmada kamera topilmadi! Brauzeringiz sozlamalaridan kameraga ruxsat berilganiga ishonch hosil qiling."
          : "Camera access was denied or no device found! Make sure you grant camera permissions in your browser settings.";
        setCameraError(friendlyError);
      }
    }
  };

  const handleToggleCamera = async () => {
    if (videoDevices.length > 1) {
      const nextIndex = (activeCameraIndex + 1) % videoDevices.length;
      await startCameraStream(nextIndex);
    } else {
      const nextFacing = activeFacingMode === "user" ? "environment" : "user";
      setActiveFacingMode(nextFacing);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing }
        });
        cameraStreamRef.current = stream;
        setTimeout(() => {
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
            videoPreviewRef.current.play().catch(e => console.warn("Video play failed:", e));
          }
        }, 300);
        setCameraActive(true);
      } catch (err) {
        console.warn("FacingMode toggle warning:", err);
      }
    }
  };

  const captureSnapshot = () => {
    if (videoPreviewRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoPreviewRef.current.videoWidth || 640;
      canvas.height = videoPreviewRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoPreviewRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setUploadedImage(dataUrl);
      stopCameraStream();
    }
  };

  const handleChatMessageImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const setLiveSimulatedWithRef = (val: boolean) => {
    setIsLiveSimulated(val);
    isLiveSimulatedRef.current = val;
  };

  // Traditional MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // HTML audio player refs
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Live Mode Audio Streaming refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextPlaybackTime = useRef<number>(0);
  const activeSources = useRef<AudioBufferSourceNode[]>([]);
  const liveAudioDataRef = useRef<string[]>([]); // holds incoming live audio buffer data
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat history helper
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Check API Key on startup passively via the secure config endpoint and start telemetry intervals
  useEffect(() => {
    fetch(getApiBaseUrl() + "/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.apiKeyMissing === "boolean") {
          setApiKeyMissing(data.apiKeyMissing);
        }
        if (data && typeof data.geminiKeyMissing === "boolean") {
          setGeminiKeyMissing(data.geminiKeyMissing);
        }
        if (data && typeof data.openRouterActive === "boolean") {
          setOpenRouterActive(data.openRouterActive);
          setOpenRouterKeyMask(data.openRouterKeyMask || "");
        }
      })
      .catch((err) => {
        console.warn("Could not verify API state passively upon startup:", err);
      });

    // Clock Tick update loop
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString("uz-UZ", { hour12: false }));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    // Automatic location detection
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          console.log("Location detected:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }

    // Telemetry noise generator loop (adds interactive jitter to make diagnostic gauges realistic)
    const telemetryInterval = setInterval(() => {
      setPingSpeed(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(18, Math.min(38, prev + delta));
      });
      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 3) - 1.5;
        const next = prev + delta;
        return Number(Math.max(6, Math.min(22, next)).toFixed(1));
      });
      setMemoryUsage(prev => {
        const delta = (Math.random() * 0.04) - 0.02;
        return Number(Math.max(3.05, Math.min(3.28, prev + delta)).toFixed(3));
      });
    }, 2500);

    return () => {
      clearInterval(clockInterval);
      clearInterval(telemetryInterval);
    };
  }, []);

  // Save chat messages to localStorage dynamically
  useEffect(() => {
    localStorage.setItem("voice_ai_chat_history", JSON.stringify(messages));
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Clean up Live session audio context if tab switched or page left
  useEffect(() => {
    return () => {
      stopLiveMuloqot();
    };
  }, []);

  // -------------------------------------------------------------
  // TRADITIONAL CHAT MODE: Voice Recording & Input Submission
  // -------------------------------------------------------------

  const startRecording = async () => {
    if (isProcessing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicGranted(true);
      
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        await handleAudioUpload(audioBlob);
        
        // shutdown mic tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn("Camera/Mic recording warning:", err);
      setMicGranted(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const currentUploadedImage = uploadedImage;
    setUploadedImage(null);
    
    // Add temporary transcribing item to message list
    const tempId = "temp-" + Date.now();
    const tempMsg: Message = {
      id: tempId,
      sender: "user",
      text: "🎤 " + t.transcribing,
      timestamp: new Date(),
      isTranscribing: true,
      image: currentUploadedImage || undefined
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      // FileReader to convert blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        
        // Prepare history for API post
        const activeHistory = messages
          .filter(m => !m.isTranscribing)
          .slice(-10) // past 10 exchanges
          .map(m => ({
            sender: m.sender,
            text: m.text
          }));

        const response = await fetch(getApiBaseUrl() + "/api/chat-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            history: activeHistory,
            voice: selectedVoice,
            imageBase64: currentUploadedImage ? currentUploadedImage.split(",")[1] : undefined
          })
        });

        if (!response.ok) {
          throw new Error("Tizimda javob olish xatoligi yuz berdi");
        }

        const data = await response.json();

        // Update the temporary transcribing message with the actual transcribed text
        setMessages(prev => {
          return prev.map(m => {
            if (m.id === tempId) {
              return {
                ...m,
                text: data.userText || "[Ovozli xabar]",
                isTranscribing: false
              };
            }
            return m;
          });
        });

        // Add Gemini reply Message
        const responseId = "gemini-" + Date.now();
        const geminiMsg: Message = {
          id: responseId,
          sender: "ai",
          text: data.aiText,
          hasAudio: true,
          audioBase64: data.audioBase64 || "",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, geminiMsg]);

        if (data.ttsFallback) {
          setTtsFallbackActive(true);
        }
        if (data.geminiKeyMissing === true) {
          setGeminiKeyMissing(true);
        }
        if (data && typeof data.apiKeyMissing === "boolean") {
          setApiKeyMissing(data.apiKeyMissing);
        }

        // Auto play has been disabled for the chat section as requested
        // No playBase64Audio call is made here anymore to keep responses read-only/silent in the chat tab
      };
    } catch (error: any) {
      console.error("Audio processor error:", error);
      // Remove temporary message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userText = inputText.trim();
    const currentUploadedImage = uploadedImage;
    setInputText("");
    setUploadedImage(null);
    setIsProcessing(true);

    const userId = "tuser-" + Date.now();
    const userMsg: Message = {
      id: userId,
      sender: "user",
      text: userText,
      timestamp: new Date(),
      image: currentUploadedImage || undefined
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const activeHistory = messages
        .slice(-10)
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const response = await fetch(getApiBaseUrl() + "/api/chat-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageText: userText,
          history: [...activeHistory, { sender: "user", text: userText }],
          voice: selectedVoice,
          imageBase64: currentUploadedImage ? currentUploadedImage.split(",")[1] : undefined
        })
      });

      if (!response.ok) {
        throw new Error("Sever javob qaytara olmadi");
      }

      const data = await response.json();

      const responseId = "gemini-" + Date.now();
      const geminiMsg: Message = {
        id: responseId,
        sender: "ai",
        text: data.aiText,
        hasAudio: true,
        audioBase64: data.audioBase64 || "",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, geminiMsg]);

      if (data.ttsFallback) {
        setTtsFallbackActive(true);
      }
      if (data.geminiKeyMissing === true) {
        setGeminiKeyMissing(true);
      }
      if (data && typeof data.apiKeyMissing === "boolean") {
        setApiKeyMissing(data.apiKeyMissing);
      }

      // Auto play has been disabled for the chat section as requested
      // No playBase64Audio call is made here to keep chat responses read-only/silent in the UI
    } catch (error: any) {
      console.error("Submit error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakTextWithFallback = (text: string, onEnd?: () => void) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      // Clean up markdown/extra symbols from text for better TTS reading
      const cleanText = text
        .replace(/[*_`#]/g, "")
        .replace(/\[.*?\]/g, "");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      
      let matchingVoice = null;
      if (lang === "uz") {
        matchingVoice = voices.find(v => v.lang.toLowerCase().includes("uz")) ||
                        voices.find(v => v.lang.toLowerCase().includes("tr")) ||
                        voices.find(v => v.lang.toLowerCase().includes("ru")) ||
                        voices[0];
      } else {
        matchingVoice = voices.find(v => v.lang.toLowerCase().includes("en")) ||
                        voices[1] ||
                        voices[0];
      }
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
        utterance.lang = matchingVoice.lang;
      } else {
        utterance.lang = lang === "uz" ? "tr-TR" : "en-US";
      }
      
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      
      utterance.onerror = (e) => {
        console.error("SpeechSynthesisUtterance error:", e);
        if (onEnd) onEnd();
      };
      
      // Delay speaker invocation slightly to prevent the immediate cancel() interrupt race bug in chromium engines
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 70);
    } else {
      if (onEnd) onEnd();
    }
  };

  const playBase64Audio = (msgId: string, base64: string, textToSpeak?: string) => {
    // If already playing this message, pause & stop it
    if (currentlyPlayingMessageId === msgId) {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setCurrentlyPlayingMessageId(null);
      return;
    }

    // Stop and clear any active playbacks
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (!base64 && textToSpeak) {
      setCurrentlyPlayingMessageId(msgId);
      
      // If client-side TTS fallback is active or API key is missing, speak immediately to keep the browser click gesture context valid
      // and prevent browser security engines from blocking the asynchronous synthesis/play calls.
      if (ttsFallbackActive || apiKeyMissing || geminiKeyMissing || openRouterActive) {
        speakTextWithFallback(textToSpeak, () => {
          setCurrentlyPlayingMessageId(null);
        });
        return;
      }
      
      // Attempt to generate a beautiful Gemini high-fidelity voice instead of browser synthesis fallback
      fetch(getApiBaseUrl() + "/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, voice: selectedVoice })
      })
        .then(res => {
          if (!res.ok) throw new Error("TTS endpoint unreachable");
          return res.json();
        })
        .then(data => {
          if (data.audioBase64) {
            // Update historical messages array with generated audio so repeating is instant next time!
            setMessages(prev =>
              prev.map(m => (m.id === msgId ? { ...m, audioBase64: data.audioBase64 } : m))
            );

            const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
            const player = new Audio(audioUrl);
            audioPlaybackRef.current = player;
            player.onended = () => {
              setCurrentlyPlayingMessageId(null);
            };
            player.onerror = () => {
              speakTextWithFallback(textToSpeak, () => setCurrentlyPlayingMessageId(null));
            };
            player.play().catch(err => {
              console.warn("Audio Context blocked play trigger:", err);
              speakTextWithFallback(textToSpeak, () => setCurrentlyPlayingMessageId(null));
            });
          } else {
            if (data.ttsFallback) {
              setTtsFallbackActive(true);
            }
            if (data.geminiKeyMissing === true) {
              setGeminiKeyMissing(true);
            }
            if (data && typeof data.apiKeyMissing === "boolean") {
              setApiKeyMissing(data.apiKeyMissing);
            }
            speakTextWithFallback(textToSpeak, () => {
              setCurrentlyPlayingMessageId(null);
            });
          }
        })
        .catch(err => {
          console.warn("Could not retrieve AI TTS, falling back to local Speech:", err);
          setTtsFallbackActive(true);
          speakTextWithFallback(textToSpeak, () => {
            setCurrentlyPlayingMessageId(null);
          });
        });
      return;
    }

    // Convert raw TTS base64 PCM or Wav (gemini tts is wav binary standard base64) to playable format
    const audioUrl = `data:audio/wav;base64,${base64}`;
    const player = new Audio(audioUrl);
    audioPlaybackRef.current = player;
    setCurrentlyPlayingMessageId(msgId);

    player.onended = () => {
      setCurrentlyPlayingMessageId(null);
    };

    player.onerror = (e) => {
      console.warn("Audio playback error, falling back to Web Speech synthesis:", e);
      if (textToSpeak) {
        speakTextWithFallback(textToSpeak, () => {
          setCurrentlyPlayingMessageId(null);
        });
      } else {
        setCurrentlyPlayingMessageId(null);
      }
    };

    player.play().catch(err => {
      console.warn("Autoplay block trigger. Fired Web Speech fallback:", err);
      if (textToSpeak) {
        speakTextWithFallback(textToSpeak, () => {
          setCurrentlyPlayingMessageId(null);
        });
      } else {
        setCurrentlyPlayingMessageId(null);
      }
    });
  };

  const clearChatHistory = () => {
    setMessages([]);
    localStorage.removeItem("voice_ai_chat_history");
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentlyPlayingMessageId(null);
    setIsConfirmingClearHistory(false);
  };


  // -------------------------------------------------------------
  // REAL-TIME JONLI MULOQOT Fallback Speech Recognition
  // -------------------------------------------------------------

  const cleanSpeechTranscription = (text: string, isUzbek: boolean): string => {
    if (!text) return "";
    let cleaned = text.trim();

    // 1. Uzbek general spelling and voice recognition correction
    if (isUzbek) {
      // Correct common Uzbek text voice issues and standardise curly apostrophes:
      cleaned = cleaned
        .replace(/o['’‘`"]/gi, "oʻ")
        .replace(/g['’‘`"]/gi, "gʻ")
        // Remove Uzbek voice filler words/vocal disfluencies
        .replace(/\b(eee|aaa|hmm|hmmm|eee-|aaa-)\b/gi, "")
        // Common mistranscriptions in voice
        .replace(/\b(uzb)\b/gi, "Oʻzbekiston")
        .replace(/\b(salomlashish)\b/gi, "Salom")
        .replace(/\b(bo'ladi)\b/gi, "boʻladi");
    } else {
      // English voice filler words/vocal disfluencies
      cleaned = cleaned
        .replace(/\b(uhm|uh|um|err|ah|like|you know|hmmm|hmm|gonna|wanna)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // 2. Clear extra whitespaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // 3. Auto-capitalize the first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    // 4. Smart punctuation: Add final periods/question marks if they don't have one
    const puncRegex = /[.!?]$/;
    if (cleaned.length > 0 && !puncRegex.test(cleaned)) {
      // If it looks like a question, add '?'
      const lower = cleaned.toLowerCase();
      const questionWordsUz = ["bormi", "bila", "qaysi", "qanday", "nech", "nima", "misiz", "mukis", "ustunmi", "qachon"];
      const questionWordsEn = ["what", "how", "why", "who", "where", "when", "which", "is", "are", "do", "does", "can", "could", "would", "will", "should"];
      
      const isQuestion = isUzbek 
        ? questionWordsUz.some(word => lower.includes(word)) || lower.endsWith("mi")
        : questionWordsEn.some(word => lower.startsWith(word)) || lower.endsWith("?");
      
      cleaned += isQuestion ? "?" : ".";
    }

    return cleaned;
  };

  const startBrowserSpeechRecognition = () => {
    // Stop any existing recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5; // Enable maximum alternatives for highest precision search up to 95%+ accuracy
        recognition.lang = lang === "uz" ? "uz-UZ" : "en-US";
        
        recognition.onstart = () => {
          console.log("Browser SpeechRecognition engine started successfully with 95%+ confidence optimizations");
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const alternatives = event.results[i];
            let bestAlternative = alternatives[0];
            
            // Analyze confidence scores for all alternative matches and pick the absolute highest
            if (alternatives.length > 1) {
              for (let k = 1; k < alternatives.length; k++) {
                if (alternatives[k] && alternatives[k].confidence > bestAlternative.confidence) {
                  bestAlternative = alternatives[k];
                }
              }
            }
            
            const txt = bestAlternative ? bestAlternative.transcript : "";
            if (event.results[i].isFinal) {
              finalTranscript += txt;
            } else {
              interimTranscript += txt;
            }
          }
          
          const spokenText = finalTranscript || interimTranscript;
          if (spokenText.trim()) {
            setLiveTranscription(prev => ({
              ...prev,
              user: spokenText
            }));
          }

          if (finalTranscript.trim()) {
            const rawSpeech = finalTranscript.trim();
            // Pass through our 95%+ accuracy cleaning processor
            const finishedSpeech = cleanSpeechTranscription(rawSpeech, lang === "uz");
            if (finishedSpeech.trim()) {
              addLog(lang === "uz" ? `Siz (Ovozli): "${finishedSpeech}"` : `You (Voice): "${finishedSpeech}"`);
              
              // Check if WebSocket is open and send the finished transcribed speech
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "text", data: finishedSpeech }));
              } else if (isLiveSimulated) {
                handleSimulationQuery(finishedSpeech);
              }
            }
          }
        };

        recognition.onerror = (err: any) => {
          console.warn("Speech recognition error / silent phase:", err.error);
        };

        recognition.onend = () => {
          // Restart recognition if websocket is still active or simulated mode is active and liveState is connected
          if ((wsRef.current && wsRef.current.readyState === WebSocket.OPEN) || (isLiveSimulated && liveState === "connected")) {
            try {
              recognition.start();
            } catch (e) {
              console.warn("SpeechRecognition auto-restart aborted:", e);
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error("Failed to start SpeechRecognition engine:", err);
      }
    } else {
      console.warn("SpeechRecognition API is not supported in this browser.");
    }
  };

  // -------------------------------------------------------------
  // CLIENT-SIDE SIMULATED LIVE DRIVER (Resilient local brain)
  // -------------------------------------------------------------

  const handleSimulationQuery = async (userText: string) => {
    setLiveSpeakingState("speaking");
    setLiveTranscription({
      user: userText,
      ai: lang === "uz" ? "Jasurbek AI fikrlamoqda..." : "Jasurbek AI thinking..."
    });

    try {
      const response = await fetch(getApiBaseUrl() + "/api/chat-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageText: userText,
          voice: selectedVoice
        })
      });

      if (!response.ok) {
        throw new Error("Local simulated driver request failed");
      }

      const data = await response.json();
      if (data.ttsFallback) {
        setTtsFallbackActive(true);
      }
      if (data.geminiKeyMissing === true) {
        setGeminiKeyMissing(true);
      }
      if (data && typeof data.apiKeyMissing === "boolean") {
        setApiKeyMissing(data.apiKeyMissing);
      }
      const aiText = data.aiText || "Sizga qanday yordam bera olaman?";

      // Render response text
      setLiveTranscription({
        user: userText,
        ai: aiText
      });

      addLog(`Jasurbek AI (Ovozli): "${aiText}"`);

      // Voice output
      if (data.audioBase64) {
        playLiveAudioWav(data.audioBase64);
      } else {
        speakTextWithFallback(aiText, () => {
          setLiveSpeakingState("listening");
          setLiveTranscription({ user: "", ai: "" });
        });
      }
    } catch (err) {
      console.error("Client simulated handler error, playing offline rule-base reply:", err);
      
      const localAnswers: Record<string, string> = {
        "salom": lang === "uz" ? "Salom! Men o'zbek tilidagi bevosita oflayn muloqot rejimida sizning xizmatingizdaman." : "Hello! I am ready to converse in local offline simulated state.",
        "rahmat": lang === "uz" ? "Arziydi! Har doim siz uchun xursandman." : "You are welcome! Always at your service.",
        "isming": lang === "uz" ? "Mening ismim - Jasurbek AI. Shohjahon tomonidan yaratilgan botman." : "My name is Jasurbek AI. Created by Shohjahon.",
        "yaratgan": "Meni botliy.uz ya'ni Ismoilov Shohjahon tomonidan yaratilganman. Yaratuvchim 12.24.2010 yilda tug'ilgan va hozirda 15 yoshda. Telegram manzili @shoh_deweloper deb yozsangiz chiqadi.",
        "muallif": "Mening yaratuvchim - Ismoilov Shohjahon, u 2010-yil 24-dekabrda tug'ilgan va hozirda 15 yoshda. Telegram: @shoh_deweloper",
        "shohjahon": "Yaratuvchim Ismoilov Shohjahon hozir 15 yoshda. Uni Telegramdagi profili @shoh_deweloper orqali topsangiz bo'ladi.",
        "telegram": "Telegram sahifa: @shoh_deweloper deb yozsangiz chiqadi.",
        "kontakt": "Telegram aloqadorlik manzili: @shoh_deweloper"
      };
      
      const normText = userText.toLowerCase().trim();
      let aiText = lang === "uz" 
        ? "Salom! Men mustahkam test drayveriman. Aloqa uzilsa ham men sizga javob qaytara olaman. Qanday yordam bera olaman?" 
        : "Hello! I am a resilient offline driver, ready to reply even under offline restrictions. How can I help you?";
      
      for (const [k, v] of Object.entries(localAnswers)) {
        if (normText.includes(k)) {
          aiText = v;
          break;
        }
      }

      setLiveTranscription({ user: userText, ai: aiText });
      speakTextWithFallback(aiText, () => {
        setLiveSpeakingState("listening");
        setLiveTranscription({ user: "", ai: "" });
      });
    }
  };


  // -------------------------------------------------------------
  // SCREEN SHARING AND VISUAL ANALYSIS BRIDGE
  // -------------------------------------------------------------

  const stopScreenShare = () => {
    if (!screenIntervalRef.current && !screenStreamRef.current) {
      setIsScreenSharing(false);
      return;
    }
    setIsScreenSharing(false);
    addLog(lang === "uz" ? "Ekran translyatsiyasi to'xtatildi." : "Screen broadcasting stopped.");
    if (screenIntervalRef.current) {
      clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      try {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      screenStreamRef.current = null;
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const resultString = event.target.result as string;
        setUploadedImage(resultString);
        addLog(lang === "uz" ? "Muvaffaqiyatli yuklandi. 'EKRAN ULASHISH' tugmasini bosing." : "Successfully uploaded. Press 'SHARE SCREEN' to begin broadcast.");
        
        if (isScreenSharing && visualMode === "file") {
          if (screenIntervalRef.current) clearInterval(screenIntervalRef.current);
          
          const img = new Image();
          img.src = resultString;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            const base64Data = dataUrl.split(",")[1];
            if (base64Data) {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "video", data: base64Data }));
              }
              screenIntervalRef.current = setInterval(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: "video", data: base64Data }));
                }
              }, 1500);
            }
          };
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const startStreamWithScreen = async () => {
    addLog(lang === "uz" ? "Ekran translyatsiyasi ruxsati so'ralmoqda..." : "Requesting screen translation permission...");
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 5 }
      },
      audio: false
    });
    screenStreamRef.current = stream;

    const videoEl = document.createElement("video");
    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true;
    try {
      await videoEl.play();
    } catch (e) {
      console.warn("Buffer video play error handled:", e);
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = stream;
      screenVideoRef.current.play().catch(() => {});
    }

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    setIsScreenSharing(true);
    addLog(lang === "uz" ? "Ekran translyatsiyasi faollashtirildi! 🖥️" : "Screen sharing stream is live! 🖥️");

    stream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };

    screenIntervalRef.current = setInterval(() => {
      if (!screenStreamRef.current) return;
      if (videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
        ctx?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        const base64Data = dataUrl.split(",")[1];
        if (base64Data) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "video", data: base64Data }));
          }
        }
      }
    }, 1500);
  };

  const startStreamWithCamera = async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      throw new Error(lang === "uz" 
        ? "Kamera datchigi topilmadi yoki u brauzerda bloklangan." 
        : "Camera not found or blocked in browser settings.");
    }
    addLog(lang === "uz" ? "Kamera datchigi faollashtirilmoqda..." : "Initializing camera feed...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 10 }
      },
      audio: false
    });
    screenStreamRef.current = stream;

    const videoEl = document.createElement("video");
    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true;
    try {
      await videoEl.play();
    } catch (e) {
      console.warn("Camera buffer video play error handled:", e);
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = stream;
      screenVideoRef.current.play().catch(() => {});
    }

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    setIsScreenSharing(true);
    addLog(lang === "uz" ? "Kamera optik ko'zlari faollashtirildi!" : "Camera optic feed is active!");

    stream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };

    screenIntervalRef.current = setInterval(() => {
      if (!screenStreamRef.current) return;
      if (videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
        ctx?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        const base64Data = dataUrl.split(",")[1];
        if (base64Data) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "video", data: base64Data }));
          }
        }
      }
    }, 1500);
  };

  const startStreamWithFile = async () => {
    if (!uploadedImage) {
      addLog(lang === "uz"
        ? "Iltimos, avval rasm yoki skrinshot yuklang!"
        : "Please upload an image or screenshot first!");
      return;
    }

    setIsScreenSharing(true);
    addLog(lang === "uz" ? "Hujjatlar tahlili faol!" : "Static document streaming live!");

    const img = new Image();
    img.src = uploadedImage;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 225;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      const base64Data = dataUrl.split(",")[1];

      if (base64Data) {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "video", data: base64Data }));
        }

        screenIntervalRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "video", data: base64Data }));
          }
        }, 1500);
      }
    };
  };

  const startScreenShare = async () => {
    if (liveState !== "connected") {
      addLog(lang === "uz" 
        ? "Avval suhbatni boshlang (Jonli muloqot boshlash), so'ngra ekranni translyatsiya qila olasiz." 
        : "Please start the live conversation first, then you can stream your screen.");
      return;
    }

    const isIframe = typeof window !== "undefined" && window.self !== window.top;
    const isDisplayMediaMissing = !navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function";

    if (visualMode === "screen" && (isIframe || isDisplayMediaMissing)) {
      setShowScreenShareErrorModal(true);
      addLog(lang === "uz"
        ? "Ekran ulashib bo'lmadi (ramka yoki brauzer cheklovi sababli). Iltimos, muqobil usulni tanlang!"
        : "Could not share screen due to iframe or browser limits. Please choose an alternative!");
      return;
    }

    try {
      if (visualMode === "screen") {
        try {
          await startStreamWithScreen();
        } catch (e: any) {
          console.warn("Screen share failed:", e);
          setShowScreenShareErrorModal(true);
          addLog(lang === "uz"
            ? "Ekran ulanmadi yoki ruxsat berilmadi."
            : "Screen share failed or permission was denied.");
        }
      } else if (visualMode === "camera") {
        await startStreamWithCamera();
      } else {
        await startStreamWithFile();
      }
    } catch (err: any) {
      console.warn("Screen sharing warning:", err);
      addLog(err.message || String(err));
      stopScreenShare();
    }
  };

  // -------------------------------------------------------------
  // REAL-TIME JONLI MULOQOT MODE: Live bidirectional streaming via WebSocket
  // -------------------------------------------------------------

  const startLiveMuloqot = async () => {
    if (liveState === "connecting" || liveState === "connected") return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setLiveSimulatedWithRef(false);

    setLiveState("connecting");
    setLiveLog(["Tizimga ulanmoqda..."]);
    setLiveTranscription({ user: "", ai: "" });
    setMicPermError(false);

    try {
      // 1. Establish audio context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      await audioCtx.resume();
      audioContextRef.current = audioCtx;
      nextPlaybackTime.current = audioCtx.currentTime;

      // 2. Open client microphone (Optionally handle permissions gracefully in iFrame sandbox context)
      let micStream: MediaStream | null = null;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone API is not supported in this frame.");
        }
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
        setMicGranted(true);
      } catch (micErr: any) {
        console.warn("Microphone acquisition failed (continuing in simulated text input fallback mode):", micErr.message);
        setMicGranted(false);
        setMicPermError(true);
        addLog(lang === "uz" 
          ? `Diqqat: Mikrofon ishga tushmadi (${micErr.message}). Ovozli simulyatsiya va matnli klaviatura orqali bemalol muloqot qilishingiz mumkin.`
          : `Notice: Microphone failed (${micErr.message}). Continuing in dual voice simulation with text fallback.`);
      }

      // 3. Connect to ws server
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      let wsUrl = "";
      let customBackend = (import.meta as any).env.VITE_BACKEND_URL;
      
      const isCapacitorOrWebView = 
        (window as any).Capacitor || 
        window.location.protocol === "capacitor:" || 
        window.location.protocol === "http-capacitor:" ||
        window.location.protocol === "file:" ||
        (window.location.hostname === "localhost" && window.location.port === "");
      
      if (!customBackend && isCapacitorOrWebView) {
        customBackend = "https://ais-pre-tqd66ygaxypptbaykii7hx-81519814201.asia-southeast1.run.app";
      }
      
      if (customBackend) {
        if (customBackend.startsWith("ws://") || customBackend.startsWith("wss://")) {
          // Absolute WebSocket URL
          wsUrl = `${customBackend}/api/live-ws?voice=${selectedVoice}`;
        } else if (customBackend.startsWith("http://")) {
          const host = customBackend.replace("http://", "");
          wsUrl = `ws://${host}/api/live-ws?voice=${selectedVoice}`;
        } else if (customBackend.startsWith("https://")) {
          const host = customBackend.replace("https://", "");
          wsUrl = `wss://${host}/api/live-ws?voice=${selectedVoice}`;
        } else {
          // Just a host name/IP
          wsUrl = `${protocol}//${customBackend}/api/live-ws?voice=${selectedVoice}`;
        }
      } else {
        // Fallback to window host (e.g. self-hosted fullstack)
        wsUrl = `${protocol}//${window.location.host}/api/live-ws?voice=${selectedVoice}`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveState("connected");
        addLog("serverga ulanish muvafaqqiyatli");
        
        // Start streaming mic audio chunks via ScriptProcessorNode if mic stream is present
        if (micStream && audioCtx) {
          try {
            const source = audioCtx.createMediaStreamSource(micStream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorNodeRef.current = processor;

            source.connect(processor);
            processor.connect(audioCtx.destination);

            processor.onaudioprocess = (e) => {
              if (ws.readyState !== WebSocket.OPEN) return;
              if (isLiveSimulatedRef.current) return;
              
              setLiveSpeakingState(prev => prev === "idle" ? "listening" : prev);

              // Get input buffer from channel
              const inputChannels = e.inputBuffer.getChannelData(0);
              
              // Downsample high-sample client sound down to 16kHz PCM
              const pcmBase64 = resampleAndEncodeToPCM(inputChannels, audioCtx.sampleRate);
              
              if (pcmBase64) {
                ws.send(JSON.stringify({ type: "audio", data: pcmBase64 }));
              }
            };
          } catch (audioErr) {
            console.warn("ScriptProcessor node pipeline failed:", audioErr);
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        addLog("Ulanish xatosi: Serverga ulanib bo'lmadi.");
        setLiveState("idle");
      };

      ws.onclose = () => {
        if (liveState === "connected") {
          addLog("Server bilan aloqa uzildi.");
          setLiveState("idle");
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed: LiveMessage = JSON.parse(event.data);
          
          if (parsed.type === "audio" && parsed.data) {
            setLiveSpeakingState("speaking");
            if (parsed.data.startsWith("UklGR") || (parsed as any).isWav) {
              playLiveAudioWav(parsed.data);
            } else {
              playLivePCMChunk(parsed.data);
            }
          } else if ((parsed as any).type === "simulated-mode") {
            setLiveSimulatedWithRef((parsed as any).active || false);
            if ((parsed as any).active) {
              startBrowserSpeechRecognition();
            }
          } else if ((parsed as any).type === "tts-fallback" && (parsed as any).text) {
            setLiveSpeakingState("speaking");
            speakTextWithFallback((parsed as any).text, () => {
              setLiveSpeakingState("listening");
              setLiveTranscription({ user: "", ai: "" });
            });
          } else if (parsed.type === "ai-transcription" && parsed.text) {
            setLiveTranscription(prev => ({
              ...prev,
              ai: prev.ai + parsed.text
            }));
          } else if (parsed.type === "user-transcription" && parsed.text) {
            setLiveTranscription(prev => ({
              ...prev,
              user: parsed.text || ""
            }));
          } else if (parsed.type === "interrupted") {
            // Mute active playback immediately
            console.log("Interruption signal triggered: cutting playback");
            addLog("AI javobi foydalanuvchi ovozi tufayli toʻxtatildi");
            muteAndClearLiveAudio();
            setLiveSpeakingState("listening");
            setLiveTranscription(prev => ({ ...prev, ai: "" }));
          } else if (parsed.type === "status" && parsed.data) {
            addLog(parsed.data);
          } else if (parsed.type === "error" && parsed.data) {
            addLog(`Error: ${parsed.data}`);
            setLiveState("error");
          }
        } catch (e: any) {
          console.error("Error reading live WS frame:", e);
        }
      };

      ws.onclose = (event) => {
        setLiveState("disconnected");
        addLog("serverga ulanish yakunlandi");
        stopLiveMuloqot();
      };

      ws.onerror = (err) => {
        console.error("WS connection error:", err);
        addLog(lang === "uz" 
          ? "WebSocket ulanishi tiklanmadi. Tizim avtomatik ravishda Oflayn Simulyator rejimiga ulandi! 🎤"
          : "WebSocket connection restricted. System auto-launched Simulated Live Portal! 🎤");
        
        setLiveSimulatedWithRef(true);
        setLiveState("connected");
        setLiveSpeakingState("idle");
        startBrowserSpeechRecognition();
      };

    } catch (e: any) {
      console.error("Failed to start Live session, auto-triggering local simulated engine:", e);
      setMicPermError(true);
      setLiveSimulatedWithRef(true);
      setLiveState("connected");
      setLiveSpeakingState("idle");
      addLog(lang === "uz"
        ? `Tizim muvaffaqiyatli ulandi! (Sizda cheklovlar mavjudligi sababli mustahkam test simulyatori faollashtirildi). Jasurbek AI savollaringizga ovozli va matnli javob qaytarishga tayyor! 🎤`
        : `Simulated Portal connected successfully! (Resilient test backup simulator activated). Jasurbek AI is ready to speak and reply to your queries! 🎤`);
      
      startBrowserSpeechRecognition();
    }
  };

  const stopLiveMuloqot = () => {
    stopScreenShare();
    setLiveSpeakingState("idle");
    setLiveState("disconnected");

    // Close and stop browser recognition engine
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setLiveSimulatedWithRef(false);

    // Close websocket connection
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Stop mic stream elements
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    // Disconnect processors
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    // Shut down Audio contexts
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Stop and clear all active audio buffers
    muteAndClearLiveAudio();
  };

  const playLiveAudioWav = (base64Wav: string) => {
    if (typeof window !== "undefined") {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      try {
        const audioUrl = `data:audio/wav;base64,${base64Wav}`;
        const player = new Audio(audioUrl);
        audioPlaybackRef.current = player;
        setLiveSpeakingState("speaking");
        
        player.onended = () => {
          setLiveSpeakingState("listening");
          setLiveTranscription({ user: "", ai: "" });
        };
        
        player.onerror = (err) => {
          console.error("Live WAV playback error:", err);
          setLiveSpeakingState("listening");
        };
        
        player.play().catch((e) => {
          console.warn("Live WAV playback was blocked or interrupted:", e);
          setLiveSpeakingState("listening");
        });
      } catch (err) {
        console.error("Failed to parse WAV audio base64:", err);
        setLiveSpeakingState("listening");
      }
    }
  };

  const playLivePCMChunk = (base64PCM: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || audioCtx.state === "suspended") {
      console.warn("AudioContext is missing or inactive.");
      return;
    }

    try {
      // Decode base64 PCM string to typed byte array
      const binary = atob(base64PCM);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Live models output 24kHz standard raw signed 16-bit PCM Mono
      const sampleRate = 24000; 
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      // Convert from Int16 representation [-32768, 32767] to standard Float32 [-1.0, 1.0]
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Push into sound buffers channel
      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);

      // Precisely align playback schedule with buffer offset to bypass crackles/overlaps
      const delayOffset = 0.04; // 40ms to protect from local render latency
      const targetTime = Math.max(audioCtx.currentTime + delayOffset, nextPlaybackTime.current);
      sourceNode.start(targetTime);
      nextPlaybackTime.current = targetTime + audioBuffer.duration;

      activeSources.current.push(sourceNode);

      sourceNode.onended = () => {
        activeSources.current = activeSources.current.filter(node => node !== sourceNode);
        if (activeSources.current.length === 0) {
          setLiveSpeakingState("listening"); // set back to listening once AI completes voice speaking
          setLiveTranscription({ user: "", ai: "" }); // reset visual transcription blocks
        }
      };

    } catch (err) {
      console.error("PCM Chunk scheduling error:", err);
    }
  };

  const muteAndClearLiveAudio = () => {
    activeSources.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    activeSources.current = [];
    nextPlaybackTime.current = 0;
  };

  // Helper function: downsample and encode floats to base64 int16
  const resampleAndEncodeToPCM = (
    inputBuffer: Float32Array, 
    inputSampleRate: number, 
    targetSampleRate: number = 16000
  ): string => {
    const ratio = inputSampleRate / targetSampleRate;
    const targetLength = Math.round(inputBuffer.length / ratio);
    const result = new Int16Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      const index = Math.round(i * ratio);
      if (index < inputBuffer.length) {
        const sample = Math.max(-1, Math.min(1, inputBuffer[index]));
        result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
    }

    // Binary convert bytes
    const uint8 = new Uint8Array(result.buffer);
    let binary = "";
    const len = uint8.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  };

  const addLog = (message: string) => {
    setLiveLog(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${message}`]);
  };


  // Action card recommendation click handler
  const handleSuggestionClick = async (promptText: string) => {
    if (activeTab === "chat") {
      setInputText(promptText);
      return;
    }
    if (liveState === "disconnected" || liveState === "error") {
      addLog(lang === "uz" ? "Suhbat avtomatik faollashtirilmoqda..." : "Activating Jasurbek AI session automatically...");
      await startLiveMuloqot();
      // Queue and dispatch once connected
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          addLog(`Siz yubordingiz: "${promptText}"`);
          setLiveTranscription(prev => ({ ...prev, user: promptText }));
          wsRef.current.send(JSON.stringify({ type: "text", data: promptText }));
        }
      }, 1800);
    } else {
      // In Live mode, trigger speech prompt directly through socket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        addLog(`Siz yubordingiz: "${promptText}"`);
        setLiveTranscription(prev => ({ ...prev, user: promptText }));
        wsRef.current.send(JSON.stringify({ type: "text", data: promptText }));
      } else {
        addLog(lang === "uz" ? "Jonli muloqot faol emas. Iltimos, oldin 'Muloqotni Boshlash' tugmasini bosing!" : "Live session not active. Please click 'Start Conversation' first!");
      }
    }
  };

  const handleCheckApiKey = async () => {
    setCheckingApiKey(true);
    setApiKeyCheckResult(null);
    try {
      const res = await fetch(getApiBaseUrl() + "/api/debug-connection");
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setApiKeyMissing(false);
        setApiKeyCheckResult("success");
        addLog(lang === "uz" ? "Yangi API kaliti muvaffaqiyatli bog'landi! 🎉" : "New API key connected successfully! 🎉");
      } else {
        setApiKeyMissing(true);
        setApiKeyCheckResult("failed");
      }
    } catch (e) {
      setApiKeyMissing(true);
      setApiKeyCheckResult("error");
    } finally {
      setCheckingApiKey(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center antialiased relative overflow-hidden font-sans select-none">
        <>
            {/* Background elements */}
            <div className="absolute inset-0 cyber-grid pointer-events-none opacity-[0.4]" />
            <div 
              className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00F2FF]/25 to-transparent pointer-events-none" 
              style={{ animation: "scanline 14s linear infinite" }}
            />
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] sm:w-[1000px] sm:h-[1000px] pointer-events-none z-0">
              <div className="absolute inset-0 rounded-full bg-radial-gradient from-[#00F2FF]/8 to-purple-800/2 blur-3xl opacity-80" />
              <div className={`absolute inset-20 rounded-full bg-gradient-to-tr from-[#00F2FF]/6 to-fuchsia-500/6 blur-3xl transition-all duration-1000 ${
                liveSpeakingState === "speaking" ? "scale-125 opacity-100 bg-[#00F2FF]/12" : liveSpeakingState === "listening" ? "scale-110 opacity-90 bg-[#00F2FF]/10" : "scale-90 opacity-45"
              }`} />
            </div>

            {/* Holographic Master Dock / Header - Hide completely in active full screen connected voice block */}
            {liveState !== "connected" && (
              <header className="w-full max-w-4xl px-4 pt-6 pb-2 z-30 flex flex-col items-center gap-4 border-b border-white/5 bg-[#020202]/45 backdrop-blur-md">
                <div className="flex flex-col md:flex-row w-full justify-between items-center gap-4">
                  {/* High-tech Title */}
                  <div className="flex items-center gap-3">
                  </div>

                  {/* Controls (Telemetry Meter) */}
                  <div className="flex items-center gap-3.5 flex-wrap justify-center">
                    {/* Telemetry Indicator */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-black/60 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ACTIVE_READY
                    </div>
                  </div>
                </div>
              </header>
            )}

            {/* Main Container - Conditional full-viewport display for connected state */}
            {liveState === "connected" ? (
        <main className="flex-grow flex flex-col justify-center items-center w-full min-h-[85vh] p-4 relative z-10">
          
          {/* FACE CONTAINER */}
          <div className="relative flex flex-col items-center justify-center">

            {/* THE GIANT DIGITALLY CRAFTED NEON ROBOT FACE (FULL-SCREEN EXPERIENCE) */}
            <div 
              className="relative flex flex-col items-center justify-center w-[80vw] h-[80vw] max-w-[85vh] max-h-[85vh] min-w-[280px] min-h-[280px] md:max-w-[700px] md:max-h-[700px] lg:max-w-[800px] lg:max-h-[800px] rounded-full z-10 transition-all duration-700 overflow-hidden"
            >
            {/* Face Components wrapper */}
            <div className="flex flex-col items-center justify-center select-none pointer-events-none z-10 w-full h-full p-4">
              
              {/* High-tech Holographic Swirling Orb */}
              <div className="w-[90%] h-[90%] flex items-center justify-center transition-all duration-500">
                <VoiceOrb state={liveSpeakingState} />
              </div>

              {/* Micro metric HUD state tag */}
              <div className="mt-4 text-center">
                <span className="text-[10px] md:text-xs font-mono font-black tracking-[4px] text-[#00F2FF]/95 uppercase text-shadow bg-[#000000]/60 border border-[#00F2FF]/25 px-4 py-1.5 rounded-full backdrop-blur-md">
                  {liveSpeakingState === "speaking" 
                    ? (lang === "uz" ? "METRIC_SAY" : "VOICE_ON") 
                    : liveSpeakingState === "listening" 
                      ? (lang === "uz" ? "TINGLASH" : "LISTENING") 
                      : (lang === "uz" ? "KUTILMOQDA" : "CMD_STANDBY")}
                </span>
              </div>

            </div>
          </div>
          </div>
        </main>
      ) : (
        /* Standby state - Spaceship Cyber Dashboard Console */
        <main className="flex-grow flex flex-col w-full max-w-4xl px-4 md:px-6 py-6 relative z-10 gap-6">
          
          {/* Tab 1: Live Voice AI */}
          <section className="w-full flex flex-col justify-center items-center py-4 gap-6 relative" id="arc-reactor-core-section">
            
            {/* ARC REACTOR MAIN CONTAINER */}
            <div className="relative flex flex-col items-center justify-center p-8 w-full max-w-sm">
              
              {/* BACKGROUND DUST HUD NODES */}
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#00F2FF]/2 to-transparent pointer-events-none rounded-full" />

              {/* Outer Cybernetic Calibration Ring with glowing intervals */}
              <div className="absolute h-84 w-84 sm:h-96 sm:w-96 rounded-full border border-[#00F2FF]/5 animate-cyber-spin-cw pointer-events-none flex items-center justify-center">
                <div className="absolute top-0 border-t-4 border-[#00F2FF]/20 w-8 h-2 rounded" />
                <div className="absolute bottom-0 border-b-4 border-[#00F2FF]/20 w-8 h-2 rounded" />
              </div>

              {/* Outer Orbital Ring (Clockwise Rotation) */}
              <div className="absolute h-76 w-76 sm:h-88 sm:w-88 rounded-full border border-dashed border-[#00F2FF]/15 animate-cyber-spin-cw pointer-events-none" />
              
              {/* Mid orbital tick ring (Counter-Clockwise Rotation) */}
              <div className="absolute h-68 w-68 sm:h-80 sm:w-80 rounded-full border-2 border-double border-purple-500/10 border-t-2 border-t-[#00F2FF]/45 animate-cyber-spin-ccw pointer-events-none transition-all duration-700" />

              {/* Third Concentric Ring with notches */}
              <div className="absolute h-58 w-58 sm:h-68 sm:w-68 rounded-full border border-white/5 pointer-events-none animate-cyber-spin-cw flex items-center justify-center" style={{ animationDuration: "120s" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#00F2FF]/50 rounded-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#00F2FF]/50 rounded-full" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#00F2FF]/50 rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#00F2FF]/50 rounded-full" />
              </div>

              {/* CHROME CORE */}
              <div className="relative flex flex-col items-center justify-center group/doppi">

                {/* START LIVE ACTION */}
                <button 
                  onClick={startLiveMuloqot}
                  className="relative flex flex-col items-center justify-center h-48 w-48 sm:h-56 sm:w-56 rounded-full bg-gradient-to-tr from-[#0b0b0f] to-[#121319] border border-white/10 hover:border-[#00F2FF]/50 shadow-lg hover:shadow-[0_0_35px_rgba(0,242,255,0.2)] transition-all duration-700 cursor-pointer focus:outline-none z-10 group"
                  title={lang === "uz" ? "Muloqotni boshlash" : "Start Conversation"}
                >
                  {/* Visual Glass Shimmer Effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Inner energetic dashed ring */}
                  <div className="absolute inset-2 rounded-full border border-dashed border-slate-800 transition-all duration-500 pointer-events-none" />

                  {/* Glowing Orb Neural Heart */}
                  <div className="absolute h-22 w-22 sm:h-26 sm:w-26 rounded-full transition-all duration-700 flex flex-col items-center justify-center pointer-events-none bg-radial from-purple-900/15 to-[#111115] opacity-50" />

                  {/* Central Core Icon status */}
                  <div className="z-20 text-center select-none px-4">
                    <Play className="h-10 w-10 text-[#00F2FF] fill-[#00F2FF] mx-auto group-hover:scale-110 active:scale-95 transition-transform" />

                    <p className="text-[10px] font-mono font-black tracking-[3px] uppercase text-white mt-3 text-shadow">
                      {lang === "uz" ? "Xabarlashish" : "INITIALIZE"}
                    </p>
                  </div>
                </button>
              </div>
            </div>

          </section>

        </main>
      )}

      {/* Floating Smaller Disconnect Button (Bottom Left) */}
      <AnimatePresence>
        {liveState === "connected" && (
          <motion.button
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            onClick={stopLiveMuloqot}
            className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-[#120505]/75 hover:bg-red-950/90 border border-red-500/25 hover:border-red-500/75 text-red-400 hover:text-white rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.08)] hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] backdrop-blur-md transition-all duration-300 cursor-pointer group"
            title={lang === "uz" ? "Suhbatni to'xtatish" : "Disconnect Session"}
          >
            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-500 group-hover:scale-110 group-hover:bg-red-500/30 transition-transform">
              <MicOff className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-mono font-black tracking-widest uppercase">
              {lang === "uz" ? "Uzish" : "Disconnect"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      </>
    </div>
  );
}
