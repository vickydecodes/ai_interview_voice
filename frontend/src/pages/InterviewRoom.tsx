import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Square,
  ArrowRight,
  MessageSquare,
  Clock,
  Sparkles,
  Building2,
  AlertCircle,
  Loader2,
  HelpCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface InterviewMessage {
  role: "assistant" | "user" | "system";
  content: string;
  timestamp?: string;
  question_type?: string;
}

interface InterviewSession {
  interview_id: string;
  company_id: string;
  company_name: string;
  role: string;
  status: string;
  messages: InterviewMessage[];
  current_question_index: number;
  started_at: string;
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export const InterviewRoom: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  // Session State
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio & Voice States
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  // UI state
  const [showTranscript, setShowTranscript] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Speech Recognition ref
  const recognitionRef = useRef<any>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeechSupported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Explicitly request microphone permission
  const requestMicPermission = useCallback(async () => {
    // If accessed over insecure HTTP on a network IP, redirect to HTTPS so phone browser unlocks microphone
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "http:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      const httpsUrl = `http://${window.location.host}${window.location.pathname}${window.location.search}`;
      toast.info("Mobile browsers require HTTPS for microphone access. Redirecting to secure connection...");
      setTimeout(() => {
        window.location.href = httpsUrl;
      }, 1200);
      return false;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop tracks so recognition engine can access the microphone
        stream.getTracks().forEach((track) => track.stop());
        setMicPermission("granted");
        toast.success("Microphone connected!");
        return true;
      }

      // Legacy browser fallback
      const legacyGUM = typeof navigator !== "undefined" && (
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia
      );

      if (legacyGUM) {
        return new Promise<boolean>((resolve) => {
          legacyGUM.call(
            navigator,
            { audio: true },
            (stream: any) => {
              stream.getTracks?.()?.forEach((track: any) => track.stop());
              setMicPermission("granted");
              toast.success("Microphone connected!");
              resolve(true);
            },
            (err: any) => {
              console.warn("Legacy mic error:", err);
              setMicPermission("denied");
              toast.error("Microphone access was denied. Please allow microphone in browser settings.");
              resolve(false);
            }
          );
        });
      }

      // If Web Speech API is supported, SpeechRecognition manages its own mic permissions
      if (isSpeechSupported) {
        setMicPermission("granted");
        toast.success("Voice recognition ready!");
        return true;
      }

      setMicPermission("denied");
      toast.error("Microphone is not supported in this browser. Please use Chrome, Edge, or Safari, or type below.");
      return false;
    } catch (err: any) {
      console.warn("Microphone access request:", err);
      setMicPermission("denied");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone blocked. Please tap the lock / settings icon in your browser address bar to allow microphone.");
      } else {
        toast.error("Could not access microphone. You can type your answers below.");
      }
      return false;
    }
  }, [isSpeechSupported]);

  // Check microphone permissions quietly on mount without popping up failure toasts
  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: "microphone" as PermissionName })
        .then((permissionStatus: any) => {
          if (permissionStatus.state === "granted") {
            setMicPermission("granted");
          } else if (permissionStatus.state === "denied") {
            setMicPermission("denied");
          } else {
            setMicPermission("prompt");
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === "granted") {
              setMicPermission("granted");
            } else if (permissionStatus.state === "denied") {
              setMicPermission("denied");
            }
          };
        })
        .catch(() => {
          setMicPermission("prompt");
        });
    } else {
      setMicPermission("prompt");
    }
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Scroll chat drawer
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingReply]);

  // TTS Helper
  const speakText = useCallback(
    (text: string) => {
      if (isTtsMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select high quality voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("David")) &&
          v.lang.startsWith("en")
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => {
        setVoiceState("speaking");
      };

      utterance.onend = () => {
        setVoiceState("idle");
      };

      utterance.onerror = () => {
        setVoiceState("idle");
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isTtsMuted]
  );

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setVoiceState("idle");
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        setSpeechTranscript(currentText);
        setTypedInput(currentText);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access denied. You can use the text input below.");
        }
        setIsListening(false);
        setVoiceState("idle");
      };

      recognition.onend = () => {
        setIsListening(false);
        if (voiceState === "listening") {
          setVoiceState("idle");
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize Session
  useEffect(() => {
    let mounted = true;

    async function initInterview() {
      if (!companyId) return;
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiRequest<InterviewSession>("/interviews/start", {
          method: "POST",
          body: JSON.stringify({ company_id: companyId }),
        });

        if (mounted) {
          setSession(data);
          setMessages(data.messages || []);

          // Find first assistant message to speak
          const firstAssistantMsg = data.messages?.find((m) => m.role === "assistant");
          if (firstAssistantMsg) {
            setTimeout(() => {
              speakText(firstAssistantMsg.content);
            }, 600);
          }
        }
      } catch (err: any) {
        console.error("Failed to start interview:", err);
        if (mounted) {
          setError(err.message || "Failed to initialize interview session.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initInterview();

    return () => {
      mounted = false;
      stopSpeaking();
    };
  }, [companyId]);

  // Toggle Voice Recognition
  const toggleListening = async () => {
    if (!isSpeechSupported) {
      toast.error("Voice recognition is not supported in this browser. Please use the text input.");
      return;
    }

    if (isListening) {
      // Stop listening
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error(e);
      }
      setIsListening(false);
      setVoiceState("idle");
    } else {
      // If mic permission is not granted, request it first
      if (micPermission !== "granted") {
        const granted = await requestMicPermission();
        if (!granted) return;
      }

      // Interrupt AI speech if it is talking
      stopSpeaking();

      try {
        setSpeechTranscript("");
        recognitionRef.current?.start();
        setIsListening(true);
        setVoiceState("listening");
      } catch (err) {
        console.error("Failed to start recognition:", err);
        toast.error("Could not activate microphone. Check browser permissions.");
      }
    }
  };

  // Submit Answer (Streaming)
  const handleSendAnswer = async (answerTextToSend?: string) => {
    const text = (answerTextToSend ?? typedInput).trim();
    if (!text || !session) return;

    // Stop listening & speaking
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
    stopSpeaking();

    // Optimistically update transcript
    const userMsg: InterviewMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTypedInput("");
    setSpeechTranscript("");
    setVoiceState("thinking");
    setStreamingReply("");

    try {
      const token = localStorage.getItem("levelup_token");
      const res = await fetch(`/interviews/${session.interview_id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body received.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullAssistantReply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullAssistantReply += chunk;
        setStreamingReply(fullAssistantReply);
      }

      // Finalize assistant message
      const assistantMsg: InterviewMessage = {
        role: "assistant",
        content: fullAssistantReply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingReply("");

      // Speak assistant reply
      speakText(fullAssistantReply);
    } catch (err: any) {
      console.error("Error receiving interview answer reply:", err);
      toast.error("Failed to get response from interviewer.");
      setVoiceState("idle");
    }
  };

  // End Interview & View Report
  const handleEndInterview = async () => {
    if (!session) return;
    try {
      setIsEnding(true);
      stopSpeaking();
      if (isListening) {
        try {
          recognitionRef.current?.stop();
        } catch {
          // ignore
        }
      }

      await apiRequest(`/interviews/${session.interview_id}/end`, {
        method: "POST",
      });

      toast.success("Interview completed! Generating your evaluation report...");
      navigate(`/interview/${session.interview_id}/report`);
    } catch (err: any) {
      console.error("Failed to end interview:", err);
      toast.error(err.message || "Failed to end interview.");
      setIsEnding(false);
    }
  };

  // Find latest interviewer question
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const currentInterviewerText = streamingReply || latestAssistantMessage?.content || "Waiting for question...";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md space-y-4">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-75" />
            <div className="relative rounded-full bg-blue-600 p-4 text-white">
              <Mic className="h-8 w-8 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Setting up AI Interview Room</h2>
          <p className="text-xs text-slate-500">
            Tailoring interview questions based on company requirements and your parsed resume...
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 text-center max-w-md space-y-4">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Unable to Start Interview</h2>
          <p className="text-xs text-slate-600">{error || "Interview session not found."}</p>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/">Back to Company Selection</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col justify-between">
      {/* Top HUD Bar */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 sticky top-16 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Company info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {session.company_name}
                </span>
                <Badge variant="outline" className="text-[11px] font-semibold text-slate-600">
                  {session.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                <span className="font-mono font-medium">{formatTimer(elapsedSeconds)}</span>
                <span>•</span>
                <span>Question {messages.filter((m) => m.role === "assistant").length}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Microphone Permission Status */}
            {micPermission === "granted" ? (
              <Badge variant="outline" className="text-xs text-emerald-700 bg-emerald-50 border-emerald-200 gap-1 font-semibold hidden sm:inline-flex">
                <Mic className="h-3 w-3 text-emerald-600" />
                <span>Mic Connected</span>
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={requestMicPermission}
                className="text-xs text-amber-800 bg-amber-50 border-amber-300 gap-1.5 font-bold hover:bg-amber-100"
              >
                <Mic className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                <span>Enable Mic</span>
              </Button>
            )}

            {/* Audio Mute button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!isTtsMuted) stopSpeaking();
                setIsTtsMuted(!isTtsMuted);
              }}
              className="text-xs text-slate-700 gap-1.5"
              title={isTtsMuted ? "Unmute AI Voice" : "Mute AI Voice"}
            >
              {isTtsMuted ? (
                <>
                  <VolumeX className="h-4 w-4 text-red-500" />
                  <span className="hidden sm:inline">Voice Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-blue-600" />
                  <span className="hidden sm:inline">Voice Active</span>
                </>
              )}
            </Button>

            {/* View Transcript Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-xs text-slate-700 gap-1.5"
            >
              <MessageSquare className="h-4 w-4 text-slate-600" />
              <span className="hidden sm:inline">Transcript</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                {messages.length}
              </span>
            </Button>

            {/* End Interview */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndInterview}
              disabled={isEnding}
              className="text-xs font-bold gap-1.5"
            >
              {isEnding ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>End Interview</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Voice Space */}
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex-1 flex flex-col items-center justify-center text-center space-y-6">
        {/* Microphone Permission Prompt Banner */}
        {micPermission !== "granted" && (
          <div className="w-full max-w-2xl bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900">Microphone Access Required</div>
                <p className="text-[11px] text-amber-700">
                  {typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost"
                    ? "On mobile phones, microphone requires HTTPS. Tap below to switch to HTTPS or allow microphone."
                    : "Allow microphone permissions in your browser to speak directly with the AI interviewer."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.href = `https://${window.location.host}${window.location.pathname}${window.location.search}`;
                  }}
                  className="border-amber-300 text-amber-900 bg-white hover:bg-amber-100 font-bold text-xs shrink-0"
                >
                  Switch to HTTPS
                </Button>
              )}
              <Button
                size="sm"
                onClick={requestMicPermission}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shrink-0"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Allow Microphone</span>
              </Button>
            </div>
          </div>
        )}
        {/* Dynamic Voice State Indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs font-semibold">
          {voiceState === "speaking" && (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping" />
              <span className="text-blue-700 font-bold">Interviewer is speaking...</span>
            </>
          )}
          {voiceState === "listening" && (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-700 font-bold">Listening to your voice... Speak now</span>
            </>
          )}
          {voiceState === "thinking" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              <span className="text-indigo-700 font-bold">Interviewer is analyzing your response...</span>
            </>
          )}
          {voiceState === "idle" && (
            <>
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-slate-600">Ready • Click the microphone to answer</span>
            </>
          )}
        </div>

        {/* Voice Visualizer Orb */}
        <div className="relative flex items-center justify-center my-4">
          {/* Wave Ripple Ring 1 */}
          <div
            className={`absolute rounded-full transition-all duration-700 ${voiceState === "speaking"
                ? "w-64 h-64 bg-blue-100/60 scale-110 animate-pulse"
                : voiceState === "listening"
                  ? "w-64 h-64 bg-emerald-100/70 scale-125 animate-ping"
                  : voiceState === "thinking"
                    ? "w-56 h-56 bg-indigo-100/50 scale-105"
                    : "w-48 h-48 bg-slate-100 scale-95 opacity-50"
              }`}
          />

          {/* Wave Ripple Ring 2 */}
          <div
            className={`absolute rounded-full transition-all duration-500 ${voiceState === "speaking"
                ? "w-52 h-52 bg-blue-200/50 scale-105"
                : voiceState === "listening"
                  ? "w-52 h-52 bg-emerald-200/60 scale-110"
                  : voiceState === "thinking"
                    ? "w-48 h-48 bg-indigo-200/40"
                    : "w-40 h-40 bg-slate-200/40"
              }`}
          />

          {/* Core Interactive Orb */}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-xl transition-all duration-300 transform active:scale-95 ${voiceState === "speaking"
                ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/30 ring-4 ring-blue-200"
                : voiceState === "listening"
                  ? "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-300 animate-pulse"
                  : voiceState === "thinking"
                    ? "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-indigo-500/30 ring-4 ring-indigo-200"
                    : "bg-white text-slate-800 border-2 border-slate-300 hover:border-blue-500 hover:shadow-lg"
              }`}
          >
            {voiceState === "listening" ? (
              <>
                <Mic className="h-10 w-10 animate-bounce" />
                <span className="text-[11px] font-bold mt-1">Listening...</span>
              </>
            ) : voiceState === "speaking" ? (
              <>
                <Volume2 className="h-10 w-10 animate-pulse" />
                <span className="text-[11px] font-bold mt-1">AI Speaking</span>
              </>
            ) : voiceState === "thinking" ? (
              <>
                <Sparkles className="h-10 w-10 animate-spin" />
                <span className="text-[11px] font-bold mt-1">Thinking...</span>
              </>
            ) : (
              <>
                <Mic className="h-10 w-10 text-blue-600" />
                <span className="text-[11px] font-bold mt-1 text-slate-700">Click to Speak</span>
              </>
            )}
          </button>
        </div>

        {/* Current Question Display Card */}
        <Card className="w-full max-w-2xl border-slate-200 bg-white shadow-md text-left transition-all">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-blue-600">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Interviewer Question</span>
              </span>
              {voiceState === "speaking" && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-normal cursor-pointer"
                >
                  Stop Audio
                </button>
              )}
            </div>

            <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
              {currentInterviewerText}
            </p>
          </CardContent>
        </Card>

        {/* Real-time Voice Recognition Subtitle / Preview */}
        {(isListening || speechTranscript) && (
          <div className="w-full max-w-2xl bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left shadow-xs transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
              <span className="flex items-center gap-1">
                <Mic className="h-3 w-3 animate-pulse" />
                <span>Live Voice Recognition</span>
              </span>
              {speechTranscript && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleSendAnswer(speechTranscript)}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 font-bold gap-1"
                >
                  <span>Send Answer</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-sm font-medium text-emerald-950 italic">
              "{speechTranscript || "Listening... speak clearly into your microphone"}"
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls / Text Fallback Input */}
      <footer className="border-t border-slate-200 bg-white p-4 sticky bottom-0 z-20 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {/* Big Mic Push Button */}
          <Button
            type="button"
            variant={isListening ? "destructive" : "default"}
            size="lg"
            onClick={toggleListening}
            className={`gap-2 font-bold shrink-0 ${isListening ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {isListening ? (
              <>
                <Square className="h-4 w-4 fill-current" />
                <span>Done Speaking</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span>Speak Answer</span>
              </>
            )}
          </Button>

          {/* Text Input Fallback */}
          <div className="relative flex-1">
            <Input
              placeholder={
                isListening
                  ? "Transcribing your voice..."
                  : "Or type your answer here if microphone is unavailable..."
              }
              value={typedInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypedInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendAnswer();
                }
              }}
              disabled={voiceState === "thinking"}
              className="pr-12 text-sm bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Send Answer Button */}
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={() => handleSendAnswer()}
            disabled={!typedInput.trim() || voiceState === "thinking"}
            className="h-10 w-10 shrink-0 bg-slate-900 hover:bg-black text-white"
            title="Send Answer"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      {/* Transcript Side Panel Drawer */}
      {showTranscript && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="font-bold text-slate-900 text-sm">Interview Transcript</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500"
              onClick={() => setShowTranscript(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === "user" ? "items-end text-right" : "items-start text-left"
                  }`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {m.role === "user" ? "You (Candidate)" : "Interviewer AI"}
                </span>
                <div
                  className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
                    }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {streamingReply && (
              <div className="flex flex-col items-start text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Interviewer AI (Speaking)
                </span>
                <div className="p-3 rounded-xl text-xs max-w-[85%] leading-relaxed bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200 animate-pulse">
                  {streamingReply}
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;
