/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Flame, 
  Award, 
  Sparkles, 
  TrendingUp, 
  User, 
  Brain, 
  Compass, 
  Mail, 
  Settings, 
  Heart, 
  Eye, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert, 
  Compass as CompassIcon, 
  MapPin, 
  ChevronRight, 
  ArrowLeft, 
  Activity, 
  LogOut, 
  Play, 
  Square, 
  Smile, 
  Zap, 
  Check, 
  Copy, 
  Trash2, 
  Clock, 
  Send,
  Share2,
  Home,
  BarChart2,
  ChevronUp,
  Lock,
  Phone,
  BookOpen,
  Dumbbell,
  Droplets,
  Moon
} from "lucide-react";
import confetti from "canvas-confetti";

// Import Firebase SDK, Firestore references, and utilities
import { 
  auth, 
  db, 
  googleProvider, 
  OperationType, 
  handleFirestoreError 
} from "./firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";

// Constants & Themes config
enum TimeTheme {
  MORNING = "Morning",     // Orange + Sky Blue
  EVENING = "Evening",     // Purple + Pink
  NIGHT = "Night"          // Black + Neon Blue
}

enum Mood {
  MOTIVATED = "Motivated",
  TIRED = "Tired",
  SAD = "Sad",
  LAZY = "Lazy",
  ANGRY = "Angry"
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  points: number;
  streak: number;
  maxStreak: number;
  currentMood: string;
  guardianRank: string;
  isFitConnected: boolean;
  emailRemindersEnabled: boolean;
  fitSteps: number;
  fitDistance: number;
  fitCalories: number;
  fitActiveMinutes: number;
}

interface TaskItem {
  id: string;
  title: string;
  category: "Study" | "Running" | "Sleep" | "General";
  time: string;
  points: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  systemGenerated: boolean;
  date: string;
}

interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  points: number;
  streak: number;
  guardianRank: string;
}

interface SimulatedEmail {
  id: string;
  email: string;
  subject: string;
  title: string;
  body: string;
  timestamp: string;
  status: string;
}

export default function App() {
  // Authentication & Session States
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // Custom Telegram Authentication States
  const [authOption, setAuthOption] = useState<"telegram" | "website" | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<number>(1);
  const [signupName, setSignupName] = useState<string>("");
  const [signupMobile, setSignupMobile] = useState<string>("");
  const [signupPasscode, setSignupPasscode] = useState<string>("");
  const [signupRepeatPasscode, setSignupRepeatPasscode] = useState<string>("");
  const [loginMobile, setLoginMobile] = useState<string>("");
  const [loginPasscode, setLoginPasscode] = useState<string>("");
  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    return localStorage.getItem("telegram_chat_id") || "";
  });
  const [isVerifyingTelegram, setIsVerifyingTelegram] = useState<boolean>(false);
  const [telegramRegKey, setTelegramRegKey] = useState<string>(() => {
    return "reg_" + Math.floor(100000 + Math.random() * 900000).toString();
  });
  const [botUsername, setBotUsername] = useState<string>("royroutune_bot");
  const [otpCode, setOtpCode] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpTimer, setOtpTimer] = useState<number>(300); // 5 minutes countdown
  const [otpSending, setOtpSending] = useState<boolean>(false);

  // Core App States
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentTheme, setCurrentTheme] = useState<TimeTheme>(TimeTheme.NIGHT);
  const [activeTab, setActiveTab] = useState<"home" | "routine" | "fitness" | "motivation" | "leaderboard" | "history" | "settings">("home");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Routine Form & Tasks states
  const [routineInput, setRoutineInput] = useState("");
  const [structuredWake, setStructuredWake] = useState("04:30 AM");
  const [structuredStudy, setStructuredStudy] = useState("8 Hours");
  const [structuredWorkout, setStructuredWorkout] = useState("Gym Workout");
  const [structuredRunning, setStructuredRunning] = useState("Morning Running");
  const [structuredWater, setStructuredWater] = useState("4 Litres");
  const [structuredSleep, setStructuredSleep] = useState("11:00 PM");
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedMood, setSelectedMood] = useState<Mood>(Mood.MOTIVATED);
  const [motivationQuote, setMotivationQuote] = useState("Rise and hold your ground. Discipline is your weapon.");
  const [motivationLanguage, setMotivationLanguage] = useState<"English" | "Hindi" | "Hinglish">("English");
  const [loadingMotivation, setLoadingMotivation] = useState(false);

  // Gemini Setup state
  const [customApiKey, setCustomApiKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<"Not Configured" | "Connected" | "Error">("Not Configured");

  // GPS Running tracking states
  const [isTrackingRun, setIsTrackingRun] = useState(false);
  const [gpsDistance, setGpsDistance] = useState(0); // in KM
  const [gpsVelocity, setGpsVelocity] = useState(0); // km/h
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [gpsPointsAwarded, setGpsPointsAwarded] = useState(0);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const geolocationIdRef = useRef<number | null>(null);

  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<"Weekly" | "Monthly">("Weekly");
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Guardian Punishment / Red Warning states
  const [isPunishedMode, setIsPunishedMode] = useState(false);
  const [recoveryActive, setRecoveryActive] = useState(false);
  const [punishmentMessage, setPunishmentMessage] = useState("");

  // Floating design particles with dynamic density scaling and hardware offloaders
  const [particleDensity, setParticleDensity] = useState<"low" | "medium" | "high" | "off">(() => {
    return (localStorage.getItem("guardian_particle_density") as any) || "medium";
  });
  const [backParticles, setBackParticles] = useState<{ id: number; left: string; size: string; delay: string; duration: string; color: string }[]>([]);

  useEffect(() => {
    if (particleDensity === "off") {
      setBackParticles([]);
      return;
    }

    // Default configuration ranges
    const baseCount = particleDensity === "low" ? 6 : particleDensity === "medium" ? 14 : 28;
    // Scale down on actual small screens if high settings aren't forced, to spare battery on mobile
    const limitFactor = typeof window !== "undefined" && window.innerWidth < 768 ? 0.7 : 1.0;
    const finalCount = Math.max(3, Math.round(baseCount * limitFactor));

    // Synergistic background particle colors matched perfectly to each active ambiance flow
    let baseColors = ["rgba(255, 255, 255, 0.45)", "rgba(165, 180, 252, 0.35)", "rgba(191, 219, 254, 0.4)"];
    
    if (isPunishedMode) {
      baseColors = ["rgba(239, 68, 68, 0.6)", "rgba(249, 115, 22, 0.5)", "rgba(220, 38, 38, 0.5)"];
    } else if (currentTheme === TimeTheme.MORNING) {
      baseColors = ["rgba(6, 182, 212, 0.5)", "rgba(234, 88, 12, 0.4)", "rgba(249, 115, 22, 0.4)"];
    } else if (currentTheme === TimeTheme.EVENING) {
      baseColors = ["rgba(168, 85, 247, 0.5)", "rgba(236, 72, 153, 0.5)", "rgba(244, 63, 94, 0.4)"];
    }

    const floats = Array.from({ length: finalCount }).map((_, i) => {
      const selectedColor = baseColors[i % baseColors.length];
      return {
        id: i,
        left: `${(i * (100 / finalCount)) + Math.random() * (60 / finalCount)}%`,
        size: `${Math.random() * 4 + 2}px`, // Slightly smaller dots perform better and feel cleaner
        delay: `${Math.random() * 5}s`,
        duration: `${Math.random() * 6 + 10}s`, // Highly relaxed speeds for lower CPU load
        color: selectedColor
      };
    });
    setBackParticles(floats);
  }, [particleDensity, currentTheme, isPunishedMode]);

  // Telegram Notification States
  const [sentEmails, setSentEmails] = useState<SimulatedEmail[]>(() => {
    try {
      const saved = localStorage.getItem("roy_sent_emails");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inboxStatus, setInboxStatus] = useState("Idle");
  const [emailNotificationToast, setEmailNotificationToast] = useState<{ message: string; submessage?: string; type: "success" | "error" } | null>(null);

  // Real Telegram Integration States
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [telegramSuccessModal, setTelegramSuccessModal] = useState(false);
  const [telegramFailureModal, setTelegramFailureModal] = useState(false);
  const [telegramModalError, setTelegramModalError] = useState("");

  // Automated Telegram Discipline Alert States
  const [telegramAlertsEnabled, setTelegramAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("telegram_alerts_enabled") !== "false";
  });
  const [alertFrequency, setAlertFrequency] = useState<"30min" | "1hr" | "2hr">(() => {
    return (localStorage.getItem("telegram_alert_frequency") as any) || "1hr";
  });
  const [telegramSilentMode, setTelegramSilentMode] = useState<boolean>(() => {
    return localStorage.getItem("telegram_silent_mode") === "true";
  });
  const [motivationIntensity, setMotivationIntensity] = useState<"low" | "medium" | "high">(() => {
    return (localStorage.getItem("telegram_motivation_intensity") as any) || "medium";
  });
  const [lastAutoAlertTime, setLastAutoAlertTime] = useState<number>(() => {
    return parseInt(localStorage.getItem("telegram_last_auto_alert_time") || "0", 10);
  });
  const [isDayCompletedMessageSent, setIsDayCompletedMessageSent] = useState<string>(() => {
    return localStorage.getItem("telegram_is_day_completed_message_sent") || "";
  });
  const [activeAppNotification, setActiveAppNotification] = useState<{ title: string; body: string; type: "broadcast_preparing" | "broadcast_sent" | "success" } | null>(null);

  // Motivation Modal State
  const [isMotivationModalOpen, setIsMotivationModalOpen] = useState(false);
  const [modalMotivation, setModalMotivation] = useState("");
  const [isGeneratingModalMotivation, setIsGeneratingModalMotivation] = useState(false);

  // Premium Telegram Connection Integration
  const [telegramConnected, setTelegramConnected] = useState<boolean>(() => {
    return localStorage.getItem("telegram_connected") === "true";
  });
  const [showTelegramConnectModal, setShowTelegramConnectModal] = useState<boolean>(false);

  // In-App Discipline Warning System (Every 1 hour warning)
  const [showInAppDisciplineWarning, setShowInAppDisciplineWarning] = useState<boolean>(false);
  const [lastInAppWarningTime, setLastInAppWarningTime] = useState<number>(() => {
    return parseInt(localStorage.getItem("last_in_app_warning_time") || "0", 10);
  });

  useEffect(() => {
    localStorage.setItem("telegram_connected", String(telegramConnected));
  }, [telegramConnected]);

  useEffect(() => {
    localStorage.setItem("telegram_chat_id", telegramChatId);
  }, [telegramChatId]);

  // Load Telegram bot config from server with robust retry mechanism
  useEffect(() => {
    let active = true;
    let attempts = 0;
    const maxAttempts = 12; // Try up to 12 times (36 seconds total)
    
    const loadConfig = () => {
      fetch("/api/telegram/config")
        .then(res => {
          if (!res.ok) throw new Error(`HTTP status ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!active) return;
          if (data && data.botUsername) {
            setBotUsername(data.botUsername);
            console.log("Successfully connected to Telegram config. Bot:", data.botUsername);
          }
        })
        .catch(err => {
          if (!active) return;
          attempts++;
          if (attempts < maxAttempts) {
            console.warn(`Telegram config fetch attempt ${attempts} failed (${err.message}). Retrying in 3s...`);
            setTimeout(loadConfig, 3000);
          } else {
            console.error("Failed to load Telegram config after maximum attempts:", err);
          }
        });
    };

    loadConfig();

    return () => {
      active = false;
    };
  }, []);

  const telegramPollingIntervalRef = useRef<any>(null);

  const startTelegramPolling = (regKey: string) => {
    if (telegramPollingIntervalRef.current) {
      clearInterval(telegramPollingIntervalRef.current);
    }
    setIsVerifyingTelegram(true);
    
    telegramPollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/telegram/check-connection?regKey=${regKey}`);
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json().catch(() => ({}));
            console.warn("Connection check failed:", errorData.error);
          } else {
            console.warn("Connection check failed with non-JSON response:", response.status);
          }
          return;
        }
        
        if (!contentType || !contentType.includes("application/json")) {
          // Dev server restarting or returning HTML gateway page
          return;
        }

        const data = await response.json();
        if (data.connected && data.chatId) {
          if (data.token) {
            // DIRECT SECURE AUTO LOGIN TO TELEGRAM PROFILE!
            if (telegramPollingIntervalRef.current) {
              clearInterval(telegramPollingIntervalRef.current);
              telegramPollingIntervalRef.current = null;
            }
            setIsVerifyingTelegram(false);
            window.location.search = `?tg_token=${data.token}`;
            return;
          }

          // If performing initial onboarding/not logged in, wait for the passcode repeat phase and login token
          if (!profile) {
            console.log("Telemetry handshake link detected, waiting for passcode and profile completion...");
            return;
          }

          if (telegramPollingIntervalRef.current) {
            clearInterval(telegramPollingIntervalRef.current);
            telegramPollingIntervalRef.current = null;
          }
          setTelegramConnected(true);
          setTelegramChatId(data.chatId);
          setIsVerifyingTelegram(false);
          setSignupStep(3); // Advance to OTP step in signup if running signup flow
          
          setEmailNotificationToast({
            message: "✅ Telegram Connected Successfully",
            submessage: `Successfully linked with chat node ${data.chatId}`,
            type: "success"
          });
          
          confetti({
            particleCount: 80,
            spread: 50,
          });
        }
      } catch (err) {
        console.error("Error polling connection state:", err);
      }
    }, 2000);
  };

  const stopTelegramPolling = () => {
    if (telegramPollingIntervalRef.current) {
      clearInterval(telegramPollingIntervalRef.current);
      telegramPollingIntervalRef.current = null;
    }
    setIsVerifyingTelegram(false);
  };

  useEffect(() => {
    return () => {
      if (telegramPollingIntervalRef.current) {
        clearInterval(telegramPollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("last_in_app_warning_time", String(lastInAppWarningTime));
  }, [lastInAppWarningTime]);

  // 1-Hour In-App Discipline Alert System Checker
  useEffect(() => {
    if (!profile || tasks.length === 0) return;
    
    const warningInterval = setInterval(() => {
      const incompleteCount = tasks.filter(t => !t.completed).length;
      if (incompleteCount === 0) return;

      const now = Date.now();
      const timeSinceLastWarning = now - lastInAppWarningTime;
      const oneHourMs = 3600000; // 1 hour is 3,600,000 ms

      if (lastInAppWarningTime === 0) {
        setLastInAppWarningTime(now);
      } else if (timeSinceLastWarning >= oneHourMs) {
        setShowInAppDisciplineWarning(true);
        setLastInAppWarningTime(now);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(warningInterval);
  }, [profile, tasks, lastInAppWarningTime]);



  useEffect(() => {
    if (emailNotificationToast) {
      const timer = setTimeout(() => {
        setEmailNotificationToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [emailNotificationToast]);

  // Sync Telegram Settings to LocalStorage
  useEffect(() => {
    localStorage.setItem("telegram_alerts_enabled", String(telegramAlertsEnabled));
  }, [telegramAlertsEnabled]);

  useEffect(() => {
    localStorage.setItem("telegram_alert_frequency", alertFrequency);
  }, [alertFrequency]);

  useEffect(() => {
    localStorage.setItem("telegram_silent_mode", String(telegramSilentMode));
  }, [telegramSilentMode]);

  useEffect(() => {
    localStorage.setItem("telegram_motivation_intensity", motivationIntensity);
  }, [motivationIntensity]);

  useEffect(() => {
    localStorage.setItem("telegram_last_auto_alert_time", String(lastAutoAlertTime));
  }, [lastAutoAlertTime]);

  useEffect(() => {
    localStorage.setItem("telegram_is_day_completed_message_sent", isDayCompletedMessageSent);
  }, [isDayCompletedMessageSent]);

  // Automated Telegram alert scheduling checker
  useEffect(() => {
    const schedulingInterval = setInterval(async () => {
      if (!telegramAlertsEnabled || !profile || tasks.length === 0 || !telegramConnected || !telegramChatId) return;

      const totalCount = tasks.length;
      const completedCount = tasks.filter(t => t.completed).length;
      const todayString = getLocalDateString();

      // Case A: 100% Completed Target Success Alert
      if (totalCount > 0 && completedCount === totalCount) {
        if (isDayCompletedMessageSent !== todayString) {
          // Send automatic Success Alert to Telegram
          setIsTelegramLoading(true);
          try {
            // Internal App Alert popup first
            setActiveAppNotification({
              title: "✅ TARGET COMPLETED PROTOCOL",
              body: "Discipline confirmed! Dispatching target completion telemetry to secure bot...",
              type: "broadcast_preparing"
            });

            // Format message
            const formattedMessage = `<b>✅ DISCIPLINE MAINTAINED</b>\nToday's target completed successfully!\n\n🎖️ <b>Perfect Score:</b> ${completedCount}/${totalCount} Tasks\n🔥 <b>Streak Protection:</b> Secured\n📈 <i>Keep up the incredible consistency!</i>\n\n— Roy Routine AI System\nPowered by Roy No Rules • Since 2026`;

            // Call telegram send API through our proxy server
            const response = await fetch("/api/telegram/send-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: telegramChatId,
                text: formattedMessage,
                disableNotification: telegramSilentMode
              })
            });

            const data = await response.json();
            const isOk = response.ok && data.success;

            // Log
            const newLog = {
              id: `tg_auto_${Date.now()}`,
              email: `Telegram Chat ID: ${telegramChatId}`,
              subject: "✅ Target Completed Automatically",
              title: "Discipline Maintained",
              body: "All assigned blocks are marked finished. Today's target completed successfully.",
              timestamp: new Date().toISOString(),
              status: isOk ? "Delivered" : "Failed",
              type: "SUCCESS"
            };

            setSentEmails(prev => {
              const updated = [newLog, ...prev];
              localStorage.setItem("roy_sent_emails", JSON.stringify(updated));
              return updated;
            });

            if (isOk) {
              setIsDayCompletedMessageSent(todayString);
              setActiveAppNotification({
                title: "TELEGRAM BROADCAST SUCCESS",
                body: "✅ Today's completion report is now broadcasted in your Telegram bot.",
                type: "success"
              });
              setTimeout(() => setActiveAppNotification(null), 5000);
            } else {
              console.warn("Telegram automated success broadcast failed:", data.description);
            }
          } catch (e) {
            console.error("Failed to dispatcher auto success message:", e);
          } finally {
            setIsTelegramLoading(false);
          }
        }
        return; // No need to check for warnings if they completed everything
      }

      // Case B: Incomplete Target Warning Alert
      if (totalCount > 0 && completedCount < totalCount) {
        let frequencyMs = 3600000; // 1 hour
        if (alertFrequency === "30min") frequencyMs = 1800000;
        else if (alertFrequency === "2hr") frequencyMs = 7200000;

        const now = Date.now();
        const timeSinceLastAlert = now - lastAutoAlertTime;

        if (timeSinceLastAlert >= frequencyMs) {
          setIsTelegramLoading(true);

          try {
            // Select random premium motivational alert variation
            const randomAlerts = [
              {
                emoji: "⚠️",
                title: "⚠️ ROY ROUTINE DISCIPLINE ALERT",
                body: "Your daily mission is still incomplete.\n\n⏳ Time is moving.\n🔥 Discipline creates legends.\n📈 Your streak depends on today's actions.\n\nComplete your targets now before your momentum breaks."
              },
              {
                emoji: "⚡",
                title: "⚡ ROY ROUTINE VIGILANCE BROADCAST",
                body: "Laziness detected. Tasks remain incomplete.\n\n💀 Excuses are for the weak, real warriors take action.\n⌛ Every passive hour is a missed opportunity.\n🎖️ Build consistency and execute with pride."
              },
              {
                emoji: "🚨",
                title: "🚨 CRITICAL GUARDIAN DISCIPLINE PROTOCOL",
                body: "We are tracking pending work targets on your board.\n\n🔥 Breaking your routine is an irreversible failure.\n🎯 Completing current checklists maintains high performance.\n🚀 Stand up and eliminate all delay vectors."
              },
              {
                emoji: "⚔️",
                title: "⚔️ CORE ROUTINE DEFICIT WARNING",
                body: "System demands immediate checklist resolution.\n\n⌛ There is no starting tomorrow. Accomplish tasks today.\n⛓️ Break the shackles of procrastination.\n🏆 The Guardian AI system is monitoring closely!"
              }
            ];

            const alertTemplate = randomAlerts[Math.floor(Math.random() * randomAlerts.length)];

            // Adjust body slightly according to Motivation Intensity
            let intensitySubtitle = "";
            let intenseSuffix = "";
            if (motivationIntensity === "low") {
              intensitySubtitle = "⚠️ <i>Gentle Reminder</i>";
              intenseSuffix = "\n\nYou got this! Just take one step today.";
            } else if (motivationIntensity === "high") {
              intensitySubtitle = "🔥 <b>CRITICAL AGGRESSIVE STREAK THREAT</b>";
              intenseSuffix = "\n\n🚨 FAILURE WILL NOT BE TOLERATED! ENFORCE DISCIPLINE ONCE AND FOR ALL!";
            } else {
              intensitySubtitle = "🛡️ <b>STANDARD VIGILANCE MONITORING</b>";
            }

            const alertTitle = alertTemplate.title;
            const alertBodyFormatted = `<b>${alertTitle}</b>\n${intensitySubtitle}\n\n${alertTemplate.body}${intenseSuffix}\n\n— Roy Routine AI System\nPowered by Roy No Rules • Since 2026`;

            // Active App Alert Popup
            setActiveAppNotification({
              title: "⚠️ TELEGRAM ALERT ENQUEUED",
              body: `Discipline deficit detected (${completedCount}/${totalCount} done). Broadcast warning triggers in 3 seconds...`,
              type: "broadcast_preparing"
            });

            // Give the user a 3 second heads-up before actual Telegram dispatch
            await new Promise(resolve => setTimeout(resolve, 3000));

            const response = await fetch("/api/telegram/send-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: telegramChatId,
                text: alertBodyFormatted,
                disableNotification: telegramSilentMode
              })
            });

            const data = await response.json();
            const isOk = response.ok && data.success;

            // Log
            const newLog = {
              id: `tg_auto_${Date.now()}`,
              email: `Telegram Chat ID: ${telegramChatId}`,
              subject: alertTitle,
              title: "Incomplete Target Warning",
              body: alertTemplate.body.replace(/\n/g, " "),
              timestamp: new Date().toISOString(),
              status: isOk ? "Delivered" : "Failed",
              type: "ROUTINE_MISSED"
            };

            setSentEmails(prev => {
              const updated = [newLog, ...prev];
              localStorage.setItem("roy_sent_emails", JSON.stringify(updated));
              return updated;
            });

            if (isOk) {
              setLastAutoAlertTime(now);
              setActiveAppNotification({
                title: "VIGILANCE ALARM TRANSMITTED",
                body: "⚡ Severe alerting broadcast delivered successfully to Telegram Bot.",
                type: "broadcast_sent"
              });
              setTimeout(() => setActiveAppNotification(null), 5000);
            } else {
              console.warn("Telegram automated alert broadcast failed:", data.description);
            }
          } catch (e) {
            console.error("Failed to dispatcher auto alert:", e);
          } finally {
            setIsTelegramLoading(false);
          }
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(schedulingInterval);
  }, [telegramAlertsEnabled, profile, tasks, alertFrequency, telegramSilentMode, motivationIntensity, lastAutoAlertTime, isDayCompletedMessageSent]);

  // Live IST Time update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Time-of-Day Theme Engine
  // Automatically updates every 24 hours (or dynamically on initial page load based on current IST time)
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 16) {
      setCurrentTheme(TimeTheme.MORNING);
    } else if (hour >= 16 && hour < 20) {
      setCurrentTheme(TimeTheme.EVENING);
    } else {
      setCurrentTheme(TimeTheme.NIGHT);
    }
  }, [currentTime]);

  // Load API Key configuration from LocalStorage
  useEffect(() => {
    const storedKey = localStorage.getItem("GUARDIAN_CUSTOM_GEMINI_KEY");
    if (storedKey) {
      setCustomApiKey(storedKey);
      setApiKeyStatus("Connected");
    } else {
      setApiKeyStatus("Not Configured");
    }
  }, []);

  // Fetch real-time simulated inbox logs from our full stack backend
  const fetchSimulatedInbox = async () => {
    try {
      const response = await fetch("/api/emails");
      if (response.ok) {
        const data = await response.json();
        setSentEmails(data);
      }
    } catch (err) {
      console.log("Could not load backend emails logs. Relying on local list.");
    }
  };

  useEffect(() => {
    fetchSimulatedInbox();
    const interval = setInterval(fetchSimulatedInbox, 5000);
    return () => clearInterval(interval);
  }, []);

  // Telegram Custom Web Auto Login Checker
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tgToken = params.get("tg_token");
    if (tgToken) {
      setLoadingAuth(true);
      fetch(`/api/telegram/autologin?token=${tgToken}`)
        .then(res => {
          if (!res.ok) {
            throw new Error("Invalid or expired session token");
          }
          return res.json();
        })
        .then(data => {
          const { profile: tgProfile, tasks: tgTasks, user: tgUser } = data;
          
          confetti({
            particleCount: 125,
            spread: 75,
          });

          setEmailNotificationToast({
            message: "✅ Telegram Connected Successfully",
            submessage: `Successfully synchronized and authenticated as ${tgProfile.displayName}. Loading system...`,
            type: "success"
          });

          // Sync into localStorage profile
          localStorage.setItem("roy_routine_current_user", JSON.stringify(tgProfile));
          localStorage.setItem(`roy_tasks_${tgProfile.uid}`, JSON.stringify(tgTasks));
          
          // Add/Overwrite in localized users index
          const usersRaw = localStorage.getItem("roy_routine_users");
          const usersRegistry = usersRaw ? JSON.parse(usersRaw) : {};
          const mobile = tgProfile.uid.replace("user_", "");
          usersRegistry[mobile] = {
            name: tgProfile.displayName,
            mobile: mobile,
            passcode: data._rawPasscode || "123456",
            telegramConnected: true,
            chatId: tgProfile.telegramChatId,
            profile: tgProfile,
            tasks: tgTasks
          };
          localStorage.setItem("roy_routine_users", JSON.stringify(usersRegistry));

          setProfile(tgProfile);
          setUser(tgUser);
          setTasks(tgTasks);

          // Strip parameter from the browser path
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(err => {
          console.error("Auto login error:", err);
          setAuthError(`❌ Autologin failed: ${err.message}`);
        })
        .finally(() => {
          setLoadingAuth(false);
        });
    }
  }, []);

  // Auth Observer Integration - Upgraded Custom Local Storage Session Restore
  useEffect(() => {
    setLoadingAuth(true);
    const storedUserStr = localStorage.getItem("roy_routine_current_user");
    if (storedUserStr) {
      try {
        const storedProfile = JSON.parse(storedUserStr) as UserProfile;
        if (storedProfile && storedProfile.uid) {
          setProfile(storedProfile);
          setUser({ uid: storedProfile.uid, displayName: storedProfile.displayName });
          loadUserTasks(storedProfile.uid);
        } else {
          setProfile(null);
          setUser(null);
        }
      } catch (e) {
        console.error("Error restoring session: ", e);
        setProfile(null);
        setUser(null);
      }
    } else {
      setProfile(null);
      setUser(null);
    }
    
    // Simulate premium system start loop
    const timer = setTimeout(() => {
      setLoadingAuth(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Sync profile edits back to active local registries and Roy Server
  useEffect(() => {
    if (profile) {
      localStorage.setItem("roy_routine_current_user", JSON.stringify(profile));
      const usersRaw = localStorage.getItem("roy_routine_users");
      const usersRegistry = usersRaw ? JSON.parse(usersRaw) : {};
      
      const isTelegramUser = profile.uid && profile.uid.startsWith("user_");
      if (isTelegramUser) {
        const mobile = profile.uid.replace("user_", "");
        if (usersRegistry[mobile]) {
          usersRegistry[mobile].profile = profile;
          localStorage.setItem("roy_routine_users", JSON.stringify(usersRegistry));
        }

        // Real-time server sync
        fetch("/api/telegram/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: profile.uid, profile, tasks })
        }).catch(err => console.error("Telemetry profile sync failed:", err));
      }
    }
  }, [profile]);

  // Sync tasks changes back to active local registries and Roy Server
  useEffect(() => {
    if (profile && tasks.length > 0) {
      localStorage.setItem(`roy_tasks_${profile.uid}`, JSON.stringify(tasks));
      const usersRaw = localStorage.getItem("roy_routine_users");
      const usersRegistry = usersRaw ? JSON.parse(usersRaw) : {};
      
      const isTelegramUser = profile.uid && profile.uid.startsWith("user_");
      if (isTelegramUser) {
        const mobile = profile.uid.replace("user_", "");
        if (usersRegistry[mobile]) {
          usersRegistry[mobile].tasks = tasks;
          localStorage.setItem("roy_routine_users", JSON.stringify(usersRegistry));
        }

        // Real-time server sync
        fetch("/api/telegram/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: profile.uid, profile, tasks })
        }).catch(err => console.error("Telemetry tasks sync failed:", err));
      }
    }
  }, [tasks, profile]);

  // Periodically poll server state for Telegram companion updates (Complete/Skip in Telegram)
  useEffect(() => {
    if (!profile || !profile.uid || !profile.uid.startsWith("user_")) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/telegram/get-state?uid=${profile.uid}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            return;
          }
          const data = await res.json();
          if (data && data.success) {
            // Compare & update points / streak / tasks to avoid redundant re-renders
            const serverPoints = data.profile?.points ?? 100;
            const serverStreak = data.profile?.streak ?? 1;
            const serverMaxStreak = data.profile?.maxStreak ?? 1;
            const serverRank = data.profile?.guardianRank ?? "Acolyte";
            
            if (
              serverPoints !== profile.points || 
              serverStreak !== profile.streak || 
              serverMaxStreak !== profile.maxStreak || 
              serverRank !== profile.guardianRank
            ) {
              setProfile(prev => prev ? { 
                ...prev, 
                points: serverPoints, 
                streak: serverStreak, 
                maxStreak: serverMaxStreak,
                guardianRank: serverRank,
                telegramConnected: data.profile?.telegramConnected ?? true,
                telegramChatId: data.profile?.telegramChatId ?? prev.telegramChatId
              } : null);
            }

            // Compare tasks lists and align if mismatched
            const serverTasks = data.tasks || [];
            if (serverTasks.length > 0) {
              const clientTasksStr = JSON.stringify(tasks);
              const serverTasksStr = JSON.stringify(serverTasks);
              if (clientTasksStr !== serverTasksStr) {
                setTasks(serverTasks);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Telemetry background state synchronization failed:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [profile, tasks]);

  // OTP Timer Countdown
  useEffect(() => {
    let interval: any;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setOtpCode(""); // Code expired
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  // Create or retrieve Firestore profile
  const syncUserProfile = async (firebaseUser: any) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        if (data.points < 0) {
          setIsPunishedMode(true);
          setPunishmentMessage("Discipline compromised. Your score has entered negative thresholds! Complete the Recovery challenge immediately to survive.");
        }
      } else {
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "ritikrai2625@gmail.com",
          displayName: firebaseUser.displayName || "Novice Warrior",
          photoURL: firebaseUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
          points: 100, // starting gift
          streak: 1,
          maxStreak: 1,
          currentMood: Mood.MOTIVATED,
          guardianRank: "Acolyte",
          isFitConnected: false,
          emailRemindersEnabled: true,
          fitSteps: 0,
          fitDistance: 0,
          fitCalories: 0,
          fitActiveMinutes: 0
        };
        await setDoc(userRef, initialProfile);
        setProfile(initialProfile);
      }
      
      // Load user tasks for today
      loadUserTasks(firebaseUser.uid);
    } catch (err) {
      console.error("Firestore user sync failed: ", err);
      // Sandbox fallback on Firestore load failure
      loadSandboxFallback();
    }
  };

  const loadSandboxFallback = () => {
    setIsSandboxMode(true);
    const mockProfile: UserProfile = {
      uid: "sandbox_warrior_101",
      email: "ritikrai2625@gmail.com",
      displayName: "Guardian Recruit",
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
      points: 120,
      streak: 3,
      maxStreak: 7,
      currentMood: Mood.MOTIVATED,
      guardianRank: "Acolyte",
      isFitConnected: true,
      emailRemindersEnabled: true,
      fitSteps: 4120,
      fitDistance: 2.8,
      fitCalories: 245,
      fitActiveMinutes: 32
    };
    setProfile(mockProfile);
    
    // Set standard mock checklist items for initial UX
    const initialMockTasks: TaskItem[] = [
      { id: "task_1", title: "Study NEET Physics Lecture & Practice MCQs", category: "Study", time: "09:00 AM", points: 25, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
      { id: "task_2", title: "Complete study session on Biology Genetics revision", category: "Study", time: "02:30 PM", points: 20, completed: true, completedAt: new Date().toISOString(), createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
      { id: "task_3", title: "5KM Road Running or Fitness session", category: "Running", time: "05:30 PM", points: 20, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
      { id: "task_4", title: "Ensure 8-Hours Sleep Rest & Wind-Down", category: "Sleep", time: "10:30 PM", points: 15, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() }
    ];
    setTasks(initialMockTasks);
  };

  // Format local date string (YYYY-MM-DD)
  const getLocalDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Load user tasks supporting offline local storage registries and Firebase sync
  const loadUserTasks = (userId: string) => {
    const storedTasksStr = localStorage.getItem(`roy_tasks_${userId}`);
    if (storedTasksStr) {
      try {
        const storedTasks = JSON.parse(storedTasksStr);
        if (Array.isArray(storedTasks) && storedTasks.length > 0) {
          setTasks(storedTasks);
          return () => {};
        }
      } catch (e) {
        console.warn("Parsing stored tasks failed, trying Firestore snapshot", e);
      }
    }

    if (userId.startsWith("sandbox_") || userId.startsWith("user_")) {
      // Custom user or sandbox, generate initial template tasks
      const initialMockTasks: TaskItem[] = [
        { id: "task_1", title: "Study NEET Physics Lecture & Practice MCQs", category: "Study", time: "09:00 AM", points: 25, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
        { id: "task_2", title: "Complete study session on Biology Genetics revision", category: "Study", time: "02:30 PM", points: 20, completed: true, completedAt: new Date().toISOString(), createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
        { id: "task_3", title: "5KM Road Running or Fitness session", category: "Running", time: "05:30 PM", points: 20, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
        { id: "task_4", title: "Ensure 8-Hours Sleep Rest & Wind-Down", category: "Sleep", time: "10:30 PM", points: 15, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() }
      ];
      setTasks(initialMockTasks);
      localStorage.setItem(`roy_tasks_${userId}`, JSON.stringify(initialMockTasks));
      return () => {};
    }

    const tasksRef = collection(db, "users", userId, "tasks");
    const q = query(tasksRef, where("date", "==", getLocalDateString()), orderBy("time", "asc"));
    
    // Subscribe to task updates live
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskArr: TaskItem[] = [];
      snapshot.forEach((doc) => {
        taskArr.push({ ...doc.data() as TaskItem, id: doc.id });
      });
      setTasks(taskArr);
    }, (error) => {
      console.warn("Failed tasks snapshot subscription. Falling back to simple get:", error);
      // Manual fetch
      getDocs(q).then(snapshot => {
        const taskArr: TaskItem[] = [];
        snapshot.forEach((doc) => {
          taskArr.push({ ...doc.data() as TaskItem, id: doc.id });
        });
        setTasks(taskArr);
      });
    });
    return unsubscribe;
  };

  // Skip old Google popup auth
  const handleGoogleLogin = async () => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      // Redirect to developer workspace sandbox automatically
      triggerSandboxMode();
    } catch (err: any) {
      console.error("Popup login failed: ", err);
    } finally {
      setLoadingAuth(false);
    }
  };

  const triggerSandboxMode = () => {
    setAuthError(null);
    loadSandboxFallback();
  };

  const handleLogout = async () => {
    localStorage.removeItem("roy_routine_current_user");
    setProfile(null);
    setUser(null);
    setAuthMode("login");
    setSignupStep(1);
    setTelegramConnected(false);
    setTelegramChatId("");
    setOtpSent(false);
    setOtpCode("");
    setEnteredOtp(["", "", "", "", "", ""]);
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed: ", err);
    }
  };

  // Save GEMINI API Key
  const handleSaveApiKey = () => {
    if (!customApiKey.trim()) {
      localStorage.removeItem("GUARDIAN_CUSTOM_GEMINI_KEY");
      setApiKeyStatus("Not Configured");
      return;
    }
    localStorage.setItem("GUARDIAN_CUSTOM_GEMINI_KEY", customApiKey);
    setApiKeyStatus("Connected");
    triggerSparkles();
  };

  // Trigger Point confetti animation
  const triggerSparkles = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#3b82f6", "#10b981", "#fbbf24", "#ec4899"]
    });
  };

  const triggerShatterConfetti = () => {
    // Red / orange spark shards for streak breaks
    confetti({
      particleCount: 120,
      spread: 120,
      origin: { y: 0.5 },
      colors: ["#ef4444", "#f97316", "#1e293b"]
    });
  };

  // Firebase Firestore write error handler helper
  const updateProfileInDocument = async (updatedFields: Partial<UserProfile>) => {
    if (isSandboxMode || !profile || (profile.uid && profile.uid.startsWith("user_"))) {
      setProfile(prev => prev ? { ...prev, ...updatedFields } : null);
      return;
    }
    const path = `users/${profile.uid}`;
    try {
      await updateDoc(doc(db, "users", profile.uid), updatedFields);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Task Interaction: Complete/Unlock Task
  const toggleTaskCompletion = async (task: TaskItem) => {
    const updatedCompleted = !task.completed;
    const pointDelta = updatedCompleted ? task.points : -task.points;
    const targetPoints = Math.max(0, (profile?.points || 0) + pointDelta);

    // Calculate ranking based on updated points
    let rank = "Acolyte";
    if (targetPoints >= 500) rank = "Grandmaster Guardian";
    else if (targetPoints >= 350) rank = "Vanguard Champion";
    else if (targetPoints >= 200) rank = "Discipline Veteran";
    else if (targetPoints >= 100) rank = "Acolyte";

    await updateProfileInDocument({
      points: targetPoints,
      guardianRank: rank
    });

    if (isSandboxMode || !profile || (profile.uid && profile.uid.startsWith("user_"))) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: updatedCompleted, completedAt: updatedCompleted ? new Date().toISOString() : null } : t));
    } else {
      const taskRef = doc(db, "users", profile!.uid, "tasks", task.id);
      try {
        await updateDoc(taskRef, {
          completed: updatedCompleted,
          completedAt: updatedCompleted ? new Date().toISOString() : null
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile!.uid}/tasks/${task.id}`);
      }
    }

    if (updatedCompleted) {
      triggerSparkles();
    }
  };

  // AI Routine Generator Trigger Call
  const handleGenerateRoutine = async () => {
    if (!routineInput.trim()) return;
    setIsGeneratingRoutine(true);

    try {
      const response = await fetch("/api/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: routineInput,
          mood: selectedMood,
          language: motivationLanguage,
          clientApiKey: customApiKey
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact generated routine API");
      }

      const result = await response.json();
      
      // Batch save tasks to Firestore/state
      const generatedTasks: TaskItem[] = result.tasks.map((t: any, index: number) => ({
        id: `task_${Date.now()}_${index}`,
        title: t.title,
        category: t.category,
        time: t.time || "08:00 AM",
        points: t.points || 15,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        systemGenerated: true,
        date: getLocalDateString()
      }));

      if (isSandboxMode || !profile || (profile.uid && profile.uid.startsWith("user_"))) {
        setTasks(generatedTasks);
      } else {
        // Write each task doc to user's subcollection
        for (const task of generatedTasks) {
          const taskRef = doc(db, "users", profile.uid, "tasks", task.id);
          await setDoc(taskRef, task);
        }
      }

      setRoutineInput("");
      triggerSparkles();
      
      // Automatically send a simulated configuration Telegram alert
      sendTelegramAlert(
        "🛡️ Routine Synchronized: Guardian AI active",
        "Your new custom-tailored discipline checklist is ready!",
        `Guardian bot successfully generated a routine matching your schedule: "${routineInput}". Stay disciplined, complete your tasks, and do not trigger Punishment Mode!`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingRoutine(false);
    }
  };

  // Generate customized AI Motivation quote
  const handleFetchMotivation = async () => {
    setLoadingMotivation(true);
    const selectedLang = motivationLanguage;
    const englishQuotes = [
      "The neural matrix detects incomplete vectors. Execute self-mastery today or watch your stats decay.",
      "In the field of high-performance minds, fatigue is merely an unoptimized subroutine. Terminate it.",
      "Your streak is not a number; it is a code of honor. Do not rewrite your standards for comfort.",
      "Comfort is a Trojan horse. Open your directives, lock in your concentration, and destroy procrastination.",
      "Every task checked is a block added to your fortress. Stand tall, execute, and leave nothing to chance.",
      "Consistency is the signature of royalty. Overcome the inertia and complete your daily checklist."
    ];

    const hindiQuotes = [
      "अनुशासन ही तुम्हारी सबसे बड़ी शक्ति है। आज के लक्ष्यों को अधूरा मत छोड़ो, उठो और रणक्षेत्र में उतरो!",
      "आलस्य केवल एक भ्रम है। अपने भीतर की ज्वाला को जगाओ और आज के कर्मों को संपूर्ण करो।",
      "समय की रेत बह रही है। यदि आज तुम नहीं रुके, तो कल तुम इतिहास लिखोगे।",
      "कठिन मार्ग ही तुम्हें सर्वश्रेष्ठ बनाता है। अपने आलस्य को परास्त करो और आगे बढ़ो।",
      "कोई बहाना नहीं चलेगा। तुम्हारी सीमाएं केवल तुम्हारे दिमाग में हैं। काम शुरू करो!",
      "जब थकावट होने लगे, तो याद रखना कि शुरुआत किस संकल्प के साथ की थी।"
    ];

    const hinglishQuotes = [
      "Incomplete targets matlab failure path key open hona. Alarm ko nahi, khud ke sapno ko snooze karna band karo.",
      "Lazy feel karna ek system bug hai. Workout karo, padhai karo, aur is bug ko abhi wipe out karo!",
      "Streak tootna nahi chahiye! Kal par depend rehna kamzoro ka kaam hai, real champion aaj hi execute karta hai.",
      "No excuses, raw discipline! Baatein kam aur tasks zyada. Lock in karo aur today's targets khatam karo.",
      "Discipline se hi legend bante hain. Break pure determination ke saath lo, lazy hokar nahi. Rise and grind!",
      "Aaj ka target complete karke hi sona hai. Kal par sab chodne waale kabhi select nahi hote."
    ];

    const getRandomLocalQuote = (language: "English" | "Hindi" | "Hinglish") => {
      const bank = language === "English" ? englishQuotes : language === "Hindi" ? hindiQuotes : hinglishQuotes;
      return bank[Math.floor(Math.random() * bank.length)];
    };

    try {
      // Simulate high-speed AI processing layout
      await new Promise(resolve => setTimeout(resolve, 200));
      const text = getRandomLocalQuote(selectedLang);
      setMotivationQuote(text);
      setModalMotivation(text);
    } catch (err) {
      const text = getRandomLocalQuote(selectedLang);
      setMotivationQuote(text);
      setModalMotivation(text);
    } finally {
      setLoadingMotivation(false);
    }
  };

  // Generate customized AI Motivation quote inside the interactive modal
  const generateModalMotivation = async (lang?: "English" | "Hindi" | "Hinglish") => {
    const selectedLang = lang || motivationLanguage;
    setIsGeneratingModalMotivation(true);
    
    const englishQuotes = [
      "The neural matrix detects incomplete vectors. Execute self-mastery today or watch your stats decay.",
      "In the field of high-performance minds, fatigue is merely an unoptimized subroutine. Terminate it.",
      "Your streak is not a number; it is a code of honor. Do not rewrite your standards for comfort.",
      "Comfort is a Trojan horse. Open your directives, lock in your concentration, and destroy procrastination.",
      "Every task checked is a block added to your fortress. Stand tall, execute, and leave nothing to chance.",
      "Consistency is the signature of royalty. Overcome the inertia and complete your daily checklist."
    ];

    const hindiQuotes = [
      "अनुशासन ही तुम्हारी सबसे बड़ी शक्ति है। आज के लक्ष्यों को अधूरा मत छोड़ो, उठो और रणक्षेत्र में उतरो!",
      "आलस्य केवल एक भ्रम है। अपने भीतर की ज्वाला को जगाओ और आज के कर्मों को संपूर्ण करो।",
      "समय की रेत बह रही है। यदि आज तुम नहीं रुके, तो कल तुम इतिहास लिखोगे।",
      "कठिन मार्ग ही तुम्हें सर्वश्रेष्ठ बनाता है। अपने आलस्य को परास्त करो और आगे बढ़ो।",
      "कोई बहाना नहीं चलेगा। तुम्हारी सीमाएं केवल तुम्हारे दिमाग में हैं। काम शुरू करो!",
      "जब थकावट होने लगे, तो याद रखना कि शुरुआत किस संकल्प के साथ की थी।"
    ];

    const hinglishQuotes = [
      "Incomplete targets matlab failure path key open hona. Alarm ko nahi, khud ke sapno ko snooze karna band karo.",
      "Lazy feel karna ek system bug hai. Workout karo, padhai karo, aur is bug ko abhi wipe out karo!",
      "Streak tootna nahi chahiye! Kal par depend rehna kamzoro ka kaam hai, real champion aaj hi execute karta hai.",
      "No excuses, raw discipline! Baatein kam aur tasks zyada. Lock in karo aur today's targets khatam karo.",
      "Discipline se hi legend bante hain. Break pure determination ke saath lo, lazy hokar nahi. Rise and grind!",
      "Aaj ka target complete karke hi sona hai. Kal par sab chodne waale kabhi select nahi hote."
    ];

    const getRandomLocalQuote = (language: "English" | "Hindi" | "Hinglish") => {
      const bank = language === "English" ? englishQuotes : language === "Hindi" ? hindiQuotes : hinglishQuotes;
      return bank[Math.floor(Math.random() * bank.length)];
    };

    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      const localQuote = getRandomLocalQuote(selectedLang);
      setModalMotivation(localQuote);
      setMotivationQuote(localQuote);
    } catch (err) {
      const localQuote = getRandomLocalQuote(selectedLang);
      setModalMotivation(localQuote);
      setMotivationQuote(localQuote);
    } finally {
      setIsGeneratingModalMotivation(false);
    }
  };

  // Whenever mood shifts, fetch new motivation automatically to make it feel super active
  useEffect(() => {
    if (profile) {
      handleFetchMotivation();
    }
  }, [selectedMood, motivationLanguage]);

  // GPS RUNNING TRACKER LOGIC
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setTrackingError("Geolocation is not supported by your browser");
      return;
    }
    
    setTrackingError(null);
    setIsTrackingRun(true);
    setGpsDistance(0);
    setGpsVelocity(5.8); // simulated velocity base
    setCaloriesBurned(0);
    setGpsPointsAwarded(0);
    
    let lastCoords: GeolocationCoordinates | null = null;
    let accumulatedDistance = 0;

    geolocationIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        if (lastCoords) {
          // Calculate distance via Haversine formula
          const R = 6371; // radius of Earth in KM
          const dLat = ((coords.latitude - lastCoords.latitude) * Math.PI) / 180;
          const dLon = ((coords.longitude - lastCoords.longitude) * Math.PI) / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos((lastCoords.latitude * Math.PI) / 180) * 
            Math.cos((coords.latitude * Math.PI) / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distanceDiff = R * c; // in KM
          
          accumulatedDistance += distanceDiff;
          setGpsDistance(parseFloat(accumulatedDistance.toFixed(3)));
          setGpsVelocity(parseFloat((coords.speed || 6.2).toFixed(1)));
          setCaloriesBurned(Math.floor(accumulatedDistance * 65));
        }
        lastCoords = coords;
      },
      (error) => {
        console.warn("GPS Location error (Sandbox fallback simulation enabled):", error.message);
        // Sandbox fallback for location tracking
        const fallbackInterval = setInterval(() => {
          accumulatedDistance += 0.05 + Math.random() * 0.03;
          setGpsDistance(parseFloat(accumulatedDistance.toFixed(2)));
          setCaloriesBurned(Math.floor(accumulatedDistance * 65));
          setGpsVelocity(parseFloat((5.5 + Math.random() * 2).toFixed(1)));
        }, 3000);

        // Save reference to clear it later
        (geolocationIdRef as any).fallbackInterval = fallbackInterval;
      },
      { enableHighAccuracy: true }
    );
  };

  const stopGpsTracking = async () => {
    if (geolocationIdRef.current) {
      navigator.geolocation.clearWatch(geolocationIdRef.current);
    }
    if ((geolocationIdRef as any).fallbackInterval) {
      clearInterval((geolocationIdRef as any).fallbackInterval);
    }
    setIsTrackingRun(false);

    // Award Points based on kilometers finished
    if (gpsDistance > 0.05) {
      const ranPoints = Math.floor(gpsDistance * 40);
      setGpsPointsAwarded(ranPoints);
      const totalP = (profile?.points || 0) + ranPoints;
      await updateProfileInDocument({
        points: totalP,
        fitDistance: parseFloat(((profile?.fitDistance || 0) + gpsDistance).toFixed(2)),
        fitCalories: (profile?.fitCalories || 0) + caloriesBurned
      });
      triggerSparkles();
    }
  };

  // Trigger Guardian Punishment mode
  const triggerGuardianPunish = async () => {
    setIsPunishedMode(true);
    setRecoveryActive(true);
    triggerShatterConfetti();

    // Check if streak was > 0 to send a broken streak email
    const originalStreak = profile?.streak || 0;

    // Deduct points and destroy streak index
    const updatedPoints = Math.max(0, (profile?.points || 0) - 30);
    await updateProfileInDocument({
      points: updatedPoints,
      streak: 0
    });

    setPunishmentMessage("DISCIPLINE FAILED TODAY. Streak shattered. Total points decremented (-30). The Guardian demands a Recovery Challenge!");
    
    // Automatically dispatch a strict Telegram alert warning them!
    sendTelegramAlert(
      "🚨 GUARDIAN EMERGENCY DISCIPLINE PROTOCOL",
      "Discipline has broke down today.",
      "Warning: Daily targets were ignored. Guardian AI has temporarily locked your visual spectrum with red warning overlays. Resolve this immediately by completing the active Recovery Trial.",
      "PUNISHMENT_ACTIVATED"
    );

    if (originalStreak > 0) {
      // Send Streak Broken Alert (triggered after 7 seconds so they don't hit the anti-spam cooldown)
      setTimeout(() => {
        sendTelegramAlert(
          "🔥 CURRENT STREAK INCINERATED - RESET TO 0",
          "Streak Extinguished!",
          `Your active consistency streak of ${originalStreak} days was destroyed today. Laziness can never build monuments. Rise up, construct discipline again.`,
          "STREAK_BROKEN"
        );
      }, 7000);
    }
  };

  // Perform streak break recovery challenge
  const completeRecoveryChallenge = async () => {
    setIsPunishedMode(false);
    setRecoveryActive(false);
    triggerSparkles();

    // Grant bonus streak restore and safety rewards
    await updateProfileInDocument({
      points: (profile?.points || 0) + 50,
      streak: 1 // restore minimal safety
    });

    sendTelegramAlert(
      "✨ Discipline Restored: Safety match confirmed",
      "Challenge met!",
      "Congratulations, you have conquered the Recovery Trial! The Warning overlay is deactivated and safety multiplier is partially restored.",
      "SUCCESS"
    );
  };

  // Shared Telegram alert notification dispatcher
  const sendTelegramAlert = async (subject: string, title: string, body: string, type: string = "TEST") => {
    if (!telegramConnected || !telegramChatId) {
      setEmailNotificationToast({
        message: "Telegram Disconnected",
        submessage: "Please link your @royroutune_bot under setting panel first.",
        type: "error"
      });
      return;
    }

    setIsTelegramLoading(true);
    setInboxStatus("Dispatching...");

    let formattedMessage = "";
    if (type === "ROUTINE_MISSED" || type === "PUNISHMENT_ACTIVATED") {
      formattedMessage = `⚠ <b>Roy Routine Alert</b>\nToday's discipline target was missed.\n\n🔥 Your streak is weakening.\n⚡ Complete pending tasks now.\n🏆 Discipline creates legends.\n🚀 Come back stronger today.`;
    } else if (type === "STREAK_BROKEN") {
      formattedMessage = `🔥 <b>Roy Routine Alert: STREAK DESTROYED</b>\n\n${subject}\n\n⚡ ${body}\n\n🏆 Discipline creates legends.\n🚀 Come back stronger today.`;
    } else if (type === "TEST") {
      formattedMessage = `🔔 <b>Roy Routine - Telegram Test Alert</b>\n\n✅ Status: Telegram Alert System is now Online and active!\n⚙ Sync Code: Connected to ${telegramChatId}\n⚡ Real-time secure telemetry dispatcher verified.`;
    } else if (type === "SUCCESS") {
      formattedMessage = `🌟 <b>Roy Routine - Target Completed</b>\n\n🎉 ${subject}\n\n🏆 <i>${title}</i>\n🚀 ${body}`;
    } else {
      formattedMessage = `⚠ <b>Roy Routine - Update</b>\n\n⚙ <b>Category:</b> ${type}\n⚡ <b>Report:</b> ${subject}\n\n<i>${body}</i>`;
    }

    try {
      const response = await fetch("/api/telegram/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: telegramChatId,
          text: formattedMessage,
          disableNotification: telegramSilentMode
        })
      });

      const data = await response.json();
      const isOk = response.ok && data.success;

      const newTelegramLog = {
        id: `tg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        email: `Telegram Chat ID: ${telegramChatId}`,
        subject,
        title,
        body,
        timestamp: new Date().toISOString(),
        status: isOk ? "Delivered" : "Failed",
        type: type
      };

      setSentEmails(prev => {
        const updated = [newTelegramLog as any, ...prev];
        localStorage.setItem("roy_sent_emails", JSON.stringify(updated));
        return updated;
      });

      if (isOk) {
        setInboxStatus("Success");
        setTelegramSuccessModal(true);
        setEmailNotificationToast({
          message: "Roy Routine Telegram Alert Sent Successfully",
          submessage: "Direct chat broadcast completed and confirmed.",
          type: "success"
        });
        setTimeout(() => setInboxStatus("Idle"), 2000);
      } else {
        setInboxStatus("Fail");
        setTelegramModalError(data.error || data.details || "Telegram API rejected the send.");
        setTelegramFailureModal(true);
        setEmailNotificationToast({
          message: "Telegram Service Failure",
          submessage: data.error || data.details || "API rejection.",
          type: "error"
        });
        setTimeout(() => setInboxStatus("Idle"), 4000);
      }
    } catch (error: any) {
      console.error("Telegram dispatch error:", error);
      setInboxStatus("Error");
      setTelegramModalError(error.message || "Network Timeout or Connection Interrupted.");
      setTelegramFailureModal(true);
      setEmailNotificationToast({
        message: "Network Alert Error!",
        submessage: error.message || "Network Error.",
        type: "error"
      });
      setTimeout(() => setInboxStatus("Idle"), 2000);
    } finally {
      setIsTelegramLoading(false);
    }
  };

  const sendManualTelegramTestAlert = async () => {
    await sendTelegramAlert(
      "🔔 Guardian Test Alert: Sensor sync verified",
      "Alert system online!",
      "Premium test alert confirmation. This is a real-time system check verifying that Roy Routine X Telegram Bot secure telemetry is fully connected, authorized, and active.",
      "TEST"
    );
  };

  // Manual Retry Trigger for Failed/Blocked Dispatches
  const handleManualRetry = async (logId: string) => {
    // Re-dispatch using active Telegram configurations
    const logItem = sentEmails.find(e => e.id === logId);
    if (!logItem) return;
    setInboxStatus("Retrying...");
    await sendTelegramAlert(logItem.subject, logItem.title, logItem.body, logItem.type);
  };

  // Load Leaderboard list
  useEffect(() => {
    if (!profile) return;
    setLoadingLeaderboard(true);

    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leaders: LeaderboardUser[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        leaders.push({
          uid: doc.id,
          displayName: d.displayName || "Novice Warrior",
          photoURL: d.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
          points: d.points || 0,
          streak: d.streak || 0,
          guardianRank: d.guardianRank || "Acolyte"
        });
      });
      setLeaderboard(leaders);
      setLoadingLeaderboard(false);
    }, (err) => {
      console.warn("Leaderboard live loading failed. Using simulated competitive profiles:", err);
      // Fallback sandbox competitive leaderboard
      const mockLeaders: LeaderboardUser[] = [
        { uid: "leader_1", displayName: "Aman Sen (Grandmaster)", photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop", points: 840, streak: 28, guardianRank: "Grandmaster Guardian" },
        { uid: "leader_2", displayName: "Priyanka Roy", photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop", points: 610, streak: 14, guardianRank: "Vanguard Champion" },
        { uid: "leader_3", displayName: "Rohan Verma", photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop", points: 340, streak: 8, guardianRank: "Discipline Veteran" },
        { uid: "leader_4", displayName: "Sneha Thakur", photoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=256&auto=format&fit=crop", points: 290, streak: 7, guardianRank: "Discipline Veteran" },
        { uid: "sandbox_warrior_101", displayName: profile?.displayName || "Novice Recuit", photoURL: profile?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop", points: profile?.points || 120, streak: profile?.streak || 3, guardianRank: profile?.guardianRank || "Acolyte" }
      ].sort((a: any, b: any) => b.points - a.points);
      setLeaderboard(mockLeaders);
      setLoadingLeaderboard(false);
    });

    return unsubscribe;
  }, [profile, isSandboxMode]);

  // Clean simulated email log
  const handleClearEmailLog = async () => {
    try {
      await fetch("/api/emails/clear", { method: "POST" });
      setSentEmails([]);
    } catch (err) {
      console.warn("Could not clear API logs");
    }
  };

  // Force check today's completion state / end of day simulation loop
  const triggerDailyStatusAssessment = () => {
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    
    if (totalCount > 0 && completedCount < totalCount) {
      const skippedRunning = tasks.some(t => t.category === "Running" && !t.completed);
      const skippedStudy = tasks.some(t => t.category === "Study" && !t.completed);

      // Trigger categories dispatches with beautiful staggered delays (7s apart) matching our 6s anti-spam shield
      let delayOffset = 100;

      if (skippedRunning) {
        setTimeout(() => {
          sendTelegramAlert(
            "🏃 GPS PHYSICAL SENSOR: Running Target Unfinished",
            "Cardiovascular target ignored!",
            "Your running activity requirements were bypassed today. The physical tracker reported insufficient steps. Complete your physical quotas tomorrow to maintain your rank.",
            "RUNNING_INCOMPLETE"
          );
        }, delayOffset);
        delayOffset += 7000;
      }

      if (skippedStudy) {
        setTimeout(() => {
          sendTelegramAlert(
            "🧠 INTELLECTUAL INTENSITY SENSOR: Study Session Bypassed",
            "Study block skipped!",
            "A registered academic deep-work block was left uncompleted today. Your cognitive discipline quota was ignored. Resolve this immediately.",
            "STUDY_SKIPPED"
          );
        }, delayOffset);
        delayOffset += 7000;
      }

      // Routine missed
      setTimeout(() => {
        sendTelegramAlert(
          "💀 PERFORMANCE SUMMARY: Routine Missed today",
          "Total checklist deficit recorded",
          `Completed only ${completedCount} out of ${totalCount} assigned routine blocks. Performance coefficient is critically low, triggering system lock.`,
          "ROUTINE_MISSED"
        );
      }, delayOffset);

      // Trigger overall punishment mode which also schedules streak broken alert after 7s!
      triggerGuardianPunish();
    } else {
      // Golden completion
      triggerSparkles();
      updateProfileInDocument({
        streak: (profile?.streak || 0) + 1,
        maxStreak: Math.max(profile?.maxStreak || 1, (profile?.streak || 0) + 1),
        points: (profile?.points || 0) + 30
      });
      sendTelegramAlert(
        "🌟 DISCIPLINE CONFIRMED: Streak Multiplier Active",
        "Flawless perfection today!",
        "Stunning discipline executed! Every single item on your checklist was completed today. Your streak incremented plus your extra 30 point challenge bonus is secured.",
        "SUCCESS"
      );
    }
  };

  return (
    <div 
      id="guardian-app"
      className={`min-h-screen text-slate-100 flex flex-col justify-between relative overflow-hidden transition-all duration-1000 ${
        isPunishedMode 
          ? "bg-punished-flow border-4 border-red-600 punishment-warning-bg warning-screen-vibe" 
          : currentTheme === TimeTheme.MORNING
            ? "bg-morning-flow"
            : currentTheme === TimeTheme.EVENING
              ? "bg-evening-flow"
              : "bg-night-flow"
      }`}
    >
      {/* Floating App Notification popup */}
      <AnimatePresence>
        {activeAppNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            style={{ zIndex: 999999 }}
            className="fixed top-6 right-6 max-w-sm w-full bg-slate-950/95 border border-sky-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(14,165,233,0.3)] backdrop-blur-xl text-left overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-sky-500 animate-pulse" />
            <div className="flex gap-3">
              <div className={`p-2.5 rounded-xl ${
                activeAppNotification.type === "broadcast_preparing" 
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" 
                  : activeAppNotification.type === "success" 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              }`}>
                {activeAppNotification.type === "broadcast_preparing" ? (
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                ) : activeAppNotification.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </div>
              <div className="flex-grow">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  {activeAppNotification.title}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-normal font-medium">
                  {activeAppNotification.body}
                </p>
                <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>REAL-TIME DISPATCH</span>
                  <span className="text-sky-400/80 font-bold">SECURE BOT-Vigilance</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveAppNotification(null)}
                className="text-slate-500 hover:text-white transition duration-150 p-1 self-start cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Cinematic Ambient Depth Effects & Orbs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" id="dynamic-ambient-glow">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] atmospheric-orb-1 pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] atmospheric-orb-2 pointer-events-none" />
        
        {/* Soft active glow lighting sources */}
        {isPunishedMode ? (
          <>
            <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] bg-red-600/20 rounded-full blur-[130px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-orange-600/10 rounded-full blur-[130px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-8%] left-[-5%] w-[400px] h-[400px] bg-[#3B82F6]/10 rounded-full blur-[110px]" />
            <div className="absolute bottom-[-8%] right-[-5%] w-[400px] h-[400px] bg-[#8B5CF6]/10 rounded-full blur-[110px]" />
          </>
        )}

        {/* Floating Glowing Particle Layer */}
        {backParticles.map((pt) => (
          <div
            key={pt.id}
            className="floating-particle"
            style={{
              left: pt.left,
              width: pt.size,
              height: pt.size,
              animationDelay: pt.delay,
              animationDuration: pt.duration,
              background: pt.color,
              boxShadow: `0 0 ${parseFloat(pt.size) * 1.5}px ${pt.color}`,
              willChange: "transform, opacity"
            }}
          />
        ))}
      </div>

      {/* Top Guardian Punishment Mode Alert Banner */}
      <AnimatePresence>
        {isPunishedMode && (
          <motion.div 
            id="emergency-warning-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-950 text-red-100 border-b border-red-600 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 z-50 overflow-hidden relative"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-red-500 w-6 h-6 animate-pulse" id="alert-shield" />
              <div id="alert-text">
                <span className="font-extrabold text-sm uppercase tracking-widest punishment-glow-text text-red-500 mr-2">DISCIPLINE BREACH DETECTED:</span>
                <span className="text-xs md:text-sm font-medium">{punishmentMessage}</span>
              </div>
            </div>
            {recoveryActive && (
              <button
                id="recovery-challenge-btn"
                onClick={completeRecoveryChallenge}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-md transition-all glow-primary filter drop-shadow hover:scale-105 relative z-10"
              >
                Accept Recovery Challenge
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-grow flex flex-col relative z-10">
        {/* Top Navbar */}
        <header id="top-navbar" className="glass-panel rounded-3xl p-5 md:p-6 mb-8 flex flex-col lg:flex-row justify-between items-center gap-5 border border-white/10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Animated decorative color blob matching time theme */}
          <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full filter blur-3xl opacity-25 bg-cyan-400 pointer-events-none animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full filter blur-3xl opacity-20 bg-purple-500 pointer-events-none" />
          
          {/* Title and Time */}
          <div className="flex flex-col sm:flex-row items-center gap-5 z-10 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-3.5 self-start">
              <div className="p-3 bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] animate-pulse" id="guardian-logo">
                <Activity className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent tracking-tighter filter drop-shadow">
                  GUARDIAN AI
                </h1>
                <p className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-[0.25em] leading-none mt-1">
                  DISCIPLINE OPERATING SYSTEM
                </p>
              </div>
            </div>

            {/* Live IST clock */}
            <div className="flex flex-col items-start px-4 py-2.5 rounded-2xl bg-black/40 border border-white/15 font-mono text-xs text-slate-300 w-full sm:w-auto min-w-[170px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                <span className="pulse-glow text-cyan-400 font-extrabold uppercase text-[9px] tracking-widest">IST / SECURE PROTOCOL</span>
              </div>
              <span className="text-base font-black tracking-widest text-white mt-1 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                {currentTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })}
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {currentTime.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* User Metrics & Quick Profile Info */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 md:gap-4 z-10 w-full lg:w-auto">
            {profile ? (
              <>
                {/* Stats indicators */}
                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 rounded-2xl transition shadow-xl" 
                  id="points-stat"
                >
                  <Award className="text-amber-400 w-5 h-5 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none">REWARD SCORE</div>
                    <div className="text-sm font-black text-amber-300 font-mono mt-0.5">{profile.points} Pts</div>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 rounded-2xl transition shadow-xl relative overflow-hidden" 
                  id="streak-stat"
                >
                  <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-orange-500/10 to-transparent pointer-events-none" />
                  <Flame className="text-orange-500 w-5 h-5 streak-fire-anim" />
                  <div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none">STREAK CONTROL</div>
                    <div className="text-sm font-black text-orange-400 font-mono mt-0.5 animate-pulse">{profile.streak} Days</div>
                  </div>
                </motion.div>

                {/* Avatar Display */}
                <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                  <div className="relative">
                    <img 
                      src={profile.photoURL} 
                      alt="avatar" 
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full border border-cyan-500/40 object-cover shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      id="profile-avatar-img"
                    />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-black text-white leading-tight truncate max-w-[120px]">
                      {profile.displayName}
                    </div>
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest leading-none mt-1">
                      {profile.guardianRank}
                    </div>
                  </div>
                  <button 
                    id="logout-button"
                    onClick={handleLogout}
                    className="p-2 ml-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs font-medium text-slate-400">
                Awaiting discipline authentication...
              </div>
            )}
          </div>
        </header>

        {/* Guest / Non-Authenticated Welcome Experience - Futuristic Roy Routine Auth Flow */}
        <AnimatePresence>
          {!profile && !loadingAuth && (
            <motion.div 
              id="roy-auth-gateway"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg mx-auto my-8 border-white/5 relative overflow-hidden text-center shadow-[0_0_50px_rgba(59,130,246,0.15)] bg-slate-950/80 backdrop-blur-2xl"
            >
              {/* Futuristic grids & radial glows */}
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-25 bg-cyan-500 pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-25 bg-pink-500 pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25 pointer-events-none" />

              {/* Top Premium Decorative Tech Element & Back Arrow */}
              <div className="relative flex items-center justify-center min-h-[40px] mb-6">
                {authOption !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.vibrate?.([50]);
                      setAuthOption(null);
                      setAuthError(null);
                      stopTelegramPolling();
                    }}
                    className="absolute left-0 text-[10px] font-black font-mono text-slate-500 hover:text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 transition cursor-pointer z-30 group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                  </button>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-full text-[9px] font-black font-mono text-cyan-400 tracking-wider uppercase shadow-[0_0_15px_rgba(6,182,212,0.15)] mx-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  ROY AI AUTH PROTOCOL // V2.9
                </div>
              </div>

              {/* Title & Description */}
              <h1 className="text-3xl font-black text-white tracking-tight uppercase bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-400">
                {authOption === null ? (
                  "Operator Gateway"
                ) : authOption === "telegram" ? (
                  "Telegram Autopilot"
                ) : authMode === "signup" ? (
                  "Create Matrix Core"
                ) : (
                  "Decryption Chamber"
                )}
              </h1>
              <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto uppercase tracking-wide font-medium leading-relaxed font-sans">
                {authOption === null ? (
                  "Select your entry protocol to authenticate your quantum streaks, metrics, and discipline points."
                ) : authOption === "telegram" ? (
                  `Link directly with @${botUsername} for prompt-driven sync & automatic notification logs.`
                ) : authMode === "signup" ? (
                  "Initialize your quantum neural routine. Core synchronization via official Telegram channel."
                ) : (
                  "Welcome operator. Access your synchronized streak records, points, and custom study matrices."
                )}
              </p>

              {/* Selection Screen (2 Premium Futuristic Options) */}
              {authOption === null && (
                <div className="space-y-4 mt-8 mb-4 relative z-10 text-left">
                  {/* Option 2: Continued with Telegram */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.vibrate?.([100]);
                      setAuthOption("telegram");
                      setAuthError(null);
                      startTelegramPolling(telegramRegKey);
                    }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-sky-950/20 via-sky-900/40 to-cyan-950/20 hover:from-sky-900/40 hover:via-sky-850/65 hover:to-cyan-900/40 border border-sky-500/30 hover:border-sky-400/50 rounded-2xl text-white font-extrabold text-sm uppercase tracking-widest cursor-pointer shadow-lg shadow-sky-500/5 hover:shadow-sky-400/15 active:scale-98 transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3.5">
                      <span className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center font-bold text-xl">🚀</span>
                      <span className="text-left font-mono">
                        <span className="block font-black tracking-widest text-xs text-sky-300">Continue With Telegram</span>
                        <span className="block text-[8px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Automated Neural Setup // 1-Click Sync</span>
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-sky-400 group-hover:translate-x-1.5 transition-transform" />
                  </button>

                  {/* Option 1: Continued with Website */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.vibrate?.([100]);
                      setAuthOption("website");
                      setAuthError(null);
                    }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-slate-900/60 to-slate-950/40 hover:from-slate-900/80 hover:to-slate-950/60 border border-white/5 hover:border-white/10 rounded-2xl text-slate-200 font-extrabold text-sm uppercase tracking-widest cursor-pointer active:scale-98 transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3.5">
                      <span className="w-11 h-11 rounded-xl bg-slate-800/40 border border-white/5 flex items-center justify-center font-bold text-xl">🌐</span>
                      <span className="text-left font-mono">
                        <span className="block font-black tracking-widest text-xs text-slate-300">Continue With Website</span>
                        <span className="block text-[8px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Classic Credentials // Device Matrix</span>
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1.5 transition-transform" />
                  </button>
                </div>
              )}

              {/* Website Option Mode Tab Switcher */}
              {authOption === "website" && (
                <div className="flex bg-slate-900/60 p-1 border border-white/5 rounded-2xl my-6 max-w-[280px] mx-auto relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setSignupStep(1);
                      setAuthError(null);
                    }}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                      authMode === "login" 
                        ? "bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]" 
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Operator Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setSignupStep(1);
                      setAuthError(null);
                    }}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                      authMode === "signup" 
                        ? "bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]" 
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Create Profile
                  </button>
                </div>
              )}

              {authError && (
                <div className="p-3 bg-red-950/30 border border-red-500/30 text-rose-300 rounded-xl text-xs font-bold leading-relaxed mb-4 relative z-10 animate-bounce">
                  {authError}
                </div>
              )}

              {authOption === "telegram" && (
                <div className="space-y-5 relative z-10 my-6 text-left">
                  <div className="p-5 bg-slate-900/40 border border-sky-500/20 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-25" />
                    
                    <div className="relative w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-sky-500/10 rounded-full border border-sky-400/30">
                      <Send className="w-5.5 h-5.5 text-sky-400 translate-x-[-1px] rotate-[-12deg]" />
                    </div>

                    <h3 className="text-center text-xs font-black text-sky-300 uppercase tracking-widest font-mono mb-4">
                      TELEGRAM DIRECT REGISTRY
                    </h3>
                    
                    <div className="text-[10px] font-mono text-slate-350 uppercase tracking-tight space-y-2.5 max-w-sm mx-auto leading-relaxed">
                      <div className="flex gap-2.5 p-3.5 bg-slate-950/40 rounded-xl border border-white/5 shadow-inner">
                        <span className="text-cyan-400 font-black font-mono">01 //</span>
                        <span>Click command launcher below to locate official <b>@{botUsername}</b> channel.</span>
                      </div>
                      <div className="flex gap-2.5 p-3.5 bg-slate-950/40 rounded-xl border border-white/5 shadow-inner">
                        <span className="text-cyan-400 font-black font-mono">02 //</span>
                        <span>Press <b>START</b> to couple and hand-shake browser identifier <b>{telegramRegKey}</b>.</span>
                      </div>
                      <div className="flex gap-2.5 p-3.5 bg-slate-950/40 rounded-xl border border-white/5 shadow-inner">
                        <span className="text-cyan-400 font-black font-mono">03 //</span>
                        <span>Press <b>Share Contact</b> inside Telegram & lock passcodes to compile auto login metrics.</span>
                      </div>
                    </div>

                    {/* Telmetry Polling Panel */}
                    <div className="w-full mt-4 p-3 bg-slate-950/60 border border-white/5 rounded-xl font-mono text-[9px] text-slate-400 tracking-wider flex items-center justify-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                       <span>📡 TELEMETRY: LISTENING FOR REGISTRATION CHANNEL CHAT...</span>
                    </div>

                    {/* Launch Button */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.vibrate?.([100]);
                        window.open(`https://t.me/${botUsername}?start=${telegramRegKey}`, "_blank");
                        startTelegramPolling(telegramRegKey);
                      }}
                      className="w-full py-3.5 mt-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition border border-sky-400/20 shadow-lg shadow-sky-500/10 active:scale-97 cursor-pointer flex items-center justify-center gap-2 group animate-pulse hover:animate-none"
                    >
                      🚀 Continue With Telegram Chat
                      <ChevronRight className="w-4 h-4 text-sky-200 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* AUTH MODES VIEWS Container */}
              <div className="relative z-10 text-left">
                {authOption === "website" && (
                  <div>
                    {authMode === "login" ? (
                  /* ================= LOGIN MODE ================= */
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!loginMobile.trim() || !loginPasscode.trim()) {
                      setAuthError("❌ Please enter your mobile number and passcode.");
                      return;
                    }
                    setAuthError(null);
                    
                    // Fetch users catalog
                    const usersRaw = localStorage.getItem("roy_routine_users");
                    const usersRegistry = usersRaw ? JSON.parse(usersRaw) : {};
                    const matched = usersRegistry[loginMobile.trim()];
                    
                    const handleSuccessLogin = (profileObj: any, tasksObj: any, name: string) => {
                      navigator.vibrate?.([100, 50, 100]);
                      
                      setEmailNotificationToast({
                        message: "Authenticated Successfully!",
                        submessage: `Welcome back, ${name}. Loading matrix database...`,
                        type: "success"
                      });
                      
                      confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 }
                      });
                      
                      localStorage.setItem("roy_routine_current_user", JSON.stringify(profileObj));
                      localStorage.setItem(`roy_tasks_${profileObj.uid}`, JSON.stringify(tasksObj));
                      
                      setProfile(profileObj);
                      setUser({ uid: profileObj.uid, displayName: profileObj.displayName });
                      setTasks(tasksObj);
                    };

                    if (matched && matched.passcode === loginPasscode.trim()) {
                      handleSuccessLogin(matched.profile, matched.tasks, matched.name);
                    } else {
                      // Attempt Server Fallback (Telegram or other synced device user)
                      fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mobile: loginMobile.trim(), passcode: loginPasscode.trim() })
                      })
                      .then(async (res) => {
                        if (!res.ok) {
                          const errData = await res.json().catch(() => ({}));
                          throw new Error(errData.error || "Invalid mobile number or passcode.");
                        }
                        return res.json();
                      })
                      .then((data) => {
                        // Success from Server! Register in local catalog
                        usersRegistry[loginMobile.trim()] = {
                          name: data.profile.displayName,
                          mobile: loginMobile.trim(),
                          passcode: loginPasscode.trim(),
                          telegramConnected: data.profile.telegramConnected,
                          chatId: data.profile.telegramChatId,
                          profile: data.profile,
                          tasks: data.tasks
                        };
                        localStorage.setItem("roy_routine_users", JSON.stringify(usersRegistry));
                        handleSuccessLogin(data.profile, data.tasks, data.profile.displayName);
                      })
                      .catch((err) => {
                        navigator.vibrate?.([200]);
                        setAuthError(`❌ ${err.message}`);
                      });
                    }
                  }} className="space-y-4">
                    {/* Mobile Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="tel"
                          value={loginMobile}
                          onChange={(e) => setLoginMobile(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full pl-10 pr-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 border border-white/5 focus:border-cyan-500/50 rounded-xl text-slate-100 placeholder-slate-600 outline-none text-sm font-mono transition shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                        />
                      </div>
                    </div>

                    {/* Passcode Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Passcode</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="password"
                          value={loginPasscode}
                          onChange={(e) => setLoginPasscode(e.target.value)}
                          placeholder="••••••"
                          className="w-full pl-10 pr-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 border border-white/5 focus:border-cyan-500/50 rounded-xl text-slate-100 placeholder-slate-600 outline-none text-sm font-mono transition shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="submit"
                      className="w-full py-3.5 mt-6 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 active:scale-98 cursor-pointer flex items-center justify-center gap-2 group border border-cyan-400/20"
                    >
                      Authenticate Core
                      <ChevronRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                ) : (
                  /* ================= SIGNUP FLOW ================= */
                  <div>
                    {signupStep === 1 && (
                      /* Signup step 1: User data input */
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!signupName.trim() || !signupMobile.trim() || !signupPasscode.trim() || !signupRepeatPasscode.trim()) {
                          setAuthError("❌ All credentials elements are mandatory.");
                          return;
                        }
                        if (signupMobile.trim().length < 8) {
                          setAuthError("❌ Please enter a valid mobile number.");
                          return;
                        }
                        if (signupPasscode !== signupRepeatPasscode) {
                          setAuthError("❌ Passcode confirmation does not match.");
                          return;
                        }
                        setAuthError(null);
                        setSignupStep(2); // Next step: Telegram connection
                      }} className="space-y-4">
                        {/* Real Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Real Name</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                            <input
                              type="text"
                              value={signupName}
                              onChange={(e) => setSignupName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full pl-10 pr-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 border border-white/5 focus:border-cyan-500/50 rounded-xl text-slate-100 placeholder-slate-600 outline-none text-sm transition shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] font-sans"
                            />
                          </div>
                        </div>

                        {/* Mobile Number */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Mobile Number</label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                            <input
                              type="tel"
                              value={signupMobile}
                              onChange={(e) => setSignupMobile(e.target.value)}
                              placeholder="e.g. 9876543210"
                              className="w-full pl-10 pr-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 border border-white/5 focus:border-cyan-500/50 rounded-xl text-slate-100 placeholder-slate-600 outline-none text-sm font-mono transition shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            />
                          </div>
                        </div>

                        {/* Passcode */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Create Passcode</label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                            <input
                              type="password"
                              value={signupPasscode}
                              onChange={(e) => setSignupPasscode(e.target.value)}
                              placeholder="••••••"
                              className="w-full pl-10 pr-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 border border-white/5 focus:border-cyan-500/50 rounded-xl text-slate-100 placeholder-slate-600 outline-none text-sm font-mono transition shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            />
                          </div>
                        </div>

                        {/* Repeat Passcode */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Repeat Passcode</label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                            <input
                              type="password"
                              value={signupRepeatPasscode}
                              onChange={(e) => setSignupRepeatPasscode(e.target.value)}
                              placeholder="••••••"
                              className="w-full pl-10 pr-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 border border-white/5 focus:border-cyan-500/50 rounded-xl text-slate-100 placeholder-slate-600 outline-none text-sm font-mono transition shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            />
                          </div>
                        </div>

                        {/* Continue Button */}
                        <button
                          type="submit"
                          className="w-full py-3.5 mt-6 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2 group border border-cyan-400/20"
                        >
                          Synchronize Security Core
                          <ChevronRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1" />
                        </button>
                      </form>
                    )}

                    {signupStep >= 2 && (
                      /* Signup step 2-4: Telegram & OTP screen */
                      <div className="space-y-6">
                        {/* Step Details & Indicators */}
                        <div className="p-4 bg-slate-900/35 border border-white/5 rounded-2xl relative overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Phase Verification</span>
                            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest font-mono">
                              {signupStep === 2 ? "Telegram Connect" : "OTP Decryption"}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <div className="h-1 flex-1 rounded-full bg-cyan-400" />
                            <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${signupStep >= 3 ? "bg-cyan-500" : "bg-slate-800"}`} />
                            <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${signupStep >= 4 ? "bg-cyan-500" : "bg-slate-800"}`} />
                          </div>
                        </div>

                        {/* TELEGRAM CONNECTION FORM */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">1. Telegram Link Initialization</h3>
                            {telegramConnected ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.15)] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-950/40 border border-red-500/30 text-rose-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                                Unconnected
                              </span>
                            )}
                          </div>

                          {!telegramConnected ? (
                            <div>
                              {isVerifyingTelegram ? (
                                <div className="p-6 bg-slate-900/50 border border-cyan-500/30 rounded-2xl text-center space-y-4 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-25 animate-pulse" />
                                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-2 border-slate-900" />
                                    <div className="absolute inset-0 rounded-full border-2 border-t-cyan-500 border-r-cyan-500 animate-spin" />
                                    <Send className="w-5 h-5 text-cyan-400 translate-x-[-1px] rotate-[-12deg]" />
                                  </div>
                                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono animate-pulse">
                                    Handshaking Network...
                                  </h4>
                                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-tight space-y-0.5 max-w-xs mx-auto">
                                    <p className="truncate">📡 neural_port: listening on webhook...</p>
                                    <p className="animate-pulse">🔒 waiting for /start from @{botUsername}</p>
                                    <button
                                      type="button"
                                      onClick={stopTelegramPolling}
                                      className="text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest font-mono underline cursor-pointer mt-3 block mx-auto relative z-10"
                                    >
                                      Cancel Handshake Polling
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.vibrate?.([100]);
                                    window.open(`https://t.me/${botUsername}?start=${telegramRegKey}`, "_blank");
                                    startTelegramPolling(telegramRegKey);
                                  }}
                                  className="w-full py-3.5 bg-gradient-to-r from-[#229ED9]/20 to-[#229ED9]/40 hover:from-[#229ED9]/30 hover:to-[#229ED9]/50 text-white font-extrabold text-sm uppercase tracking-widest rounded-xl transition border border-[#229ED9]/40 hover:border-[#229ED9]/60 active:scale-97 cursor-pointer flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(34,158,217,0.1)]"
                                >
                                  <Send className="w-4.5 h-4.5 text-[#229ED9] group-hover:scale-110 -rotate-12 translate-x-[-1px] transition-transform" />
                                  Telegram Verify
                                </button>
                              )}
                              <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-2 leading-relaxed">
                                🛸 Opens <b>@{botUsername}</b> in Telegram. Click <b>START</b> and we will automatically harvest your Chat Node telemetry keys.
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 bg-emerald-950/15 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/30">
                                <Check className="w-4 h-4" />
                              </div>
                              <div className="flex-grow">
                                <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest font-mono">Neural Handshake Active</h4>
                                <p className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">CHAT_ID captured: <span className="text-white font-bold">{telegramChatId}</span></p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* OTP SYSTEM DISPATCH PANEL */}
                        {telegramConnected && (
                          <div className="space-y-4 animate-fade-in">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">2. Dispatched Quantum Key</h3>
                            
                            {!otpSent ? (
                              <button
                                type="button"
                                disabled={otpSending}
                                onClick={async () => {
                                  setOtpSending(true);
                                  navigator.vibrate?.([100]);
                                  
                                  try {
                                    const res = await fetch("/api/telegram/send-otp", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ chatId: telegramChatId })
                                    });

                                    if (!res.ok) {
                                      const errData = await res.json().catch(() => ({}));
                                      throw new Error(errData.error || errData.details || "Failed to dispatch OTP");
                                    }

                                    const data = await res.json();
                                    setOtpCode(data.otpCode);
                                    setOtpTimer(300); // 5 minutes duration
                                    setOtpSent(true);
                                    setSignupStep(4); // Show verify inputs
                                    setEnteredOtp(["", "", "", "", "", ""]);
                                    
                                    setEmailNotificationToast({
                                      message: "OTP Dispatched Successfully",
                                      submessage: "The verification key has been sent inside your Telegram Bot Chat.",
                                      type: "success"
                                    });
                                    
                                    navigator.vibrate?.([150, 100, 150]);
                                  } catch (err: any) {
                                    console.error("OTP send failure:", err);
                                    setEmailNotificationToast({
                                      message: "OTP Dispatch Failed",
                                      submessage: err.message || "Please check your server setup and bot token.",
                                      type: "error"
                                    });
                                  } finally {
                                    setOtpSending(false);
                                  }
                                }}
                                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/10 active:scale-97 cursor-pointer flex items-center justify-center gap-2 border border-cyan-400/20"
                              >
                                {otpSending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 text-cyan-200 animate-spin" />
                                    Dispersing Telemetry OTP...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4 text-cyan-200" />
                                    Send Verification OTP
                                  </>
                                )}
                              </button>
                            ) : (
                              /* OTP CODE VERIFIER SCREEN */
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Input 6-Digit Verification Key</span>
                                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                                    Expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                                  </span>
                                </div>

                                {/* Animated Individual 6 digit inputs */}
                                <div className="flex justify-between gap-1.5" id="otp-inputs-grid">
                                  {enteredOtp.map((val, idx) => (
                                    <input
                                      key={idx}
                                      id={`otp-input-box-${idx}`}
                                      type="text"
                                      maxLength={1}
                                      value={val}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9]/g, "");
                                        const newOtp = [...enteredOtp];
                                        newOtp[idx] = value;
                                        setEnteredOtp(newOtp);

                                        // Try auto focus next
                                        if (value && idx < 5) {
                                          const nextEl = document.getElementById(`otp-input-box-${idx + 1}`);
                                          nextEl?.focus();
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        // Auto focus previous on backspace
                                        if (e.key === "Backspace" && !enteredOtp[idx] && idx > 0) {
                                          const prevEl = document.getElementById(`otp-input-box-${idx - 1}`);
                                          prevEl?.focus();
                                        }
                                      }}
                                      className="w-12 h-14 bg-slate-900/65 focus:bg-slate-900/90 border border-white/10 focus:border-cyan-400 text-slate-100 text-lg font-black text-center rounded-xl outline-none shadow-md transition-all duration-300 focus:shadow-[0_0_15px_rgba(34,211,238,0.25)] scale-100 focus:scale-105"
                                    />
                                  ))}
                                </div>

                                <div className="flex gap-3 mt-4">
                                  {/* Resend button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOtpSent(false);
                                      setOtpCode("");
                                    }}
                                    className="flex-1 py-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider rounded-xl transition border border-white/5 active:scale-95 cursor-pointer"
                                  >
                                    Reset / Resend
                                  </button>

                                  {/* Verify button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fullCode = enteredOtp.join("");
                                      if (fullCode.length < 6) {
                                        setAuthError("❌ Verification key must contain 6 distinct digits.");
                                        return;
                                      }
                                      
                                      if (fullCode === otpCode && otpCode !== "") {
                                        // SUCCESS POPUP & ACCOUNT PERSISTENCE
                                        navigator.vibrate?.([100, 50, 100, 50, 200]);
                                        setAuthError(null);
                                        
                                        // Sparkle / Confetti
                                        confetti({
                                          particleCount: 200,
                                          spread: 100,
                                          origin: { y: 0.55 }
                                        });

                                        const newProfile: UserProfile = {
                                          uid: `user_${signupMobile}`,
                                          email: "ritikrai2625@gmail.com",
                                          displayName: signupName,
                                          photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
                                          points: 100,
                                          streak: 1,
                                          maxStreak: 1,
                                          currentMood: Mood.MOTIVATED,
                                          guardianRank: "Acolyte",
                                          isFitConnected: false,
                                          emailRemindersEnabled: true,
                                          fitSteps: 0,
                                          fitDistance: 0,
                                          fitCalories: 0,
                                          fitActiveMinutes: 0
                                        };

                                        const newTasks: TaskItem[] = [
                                          { id: "task_1", title: "Study NEET Physics Lecture & Practice MCQs", category: "Study", time: "09:00 AM", points: 25, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
                                          { id: "task_2", title: "Complete study session on Biology Genetics revision", category: "Study", time: "02:30 PM", points: 20, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
                                          { id: "task_3", title: "5KM Road Running or Fitness session", category: "Running", time: "05:30 PM", points: 20, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() },
                                          { id: "task_4", title: "Ensure 8-Hours Sleep Rest & Wind-Down", category: "Sleep", time: "10:30 PM", points: 15, completed: false, completedAt: null, createdAt: new Date().toISOString(), systemGenerated: true, date: getLocalDateString() }
                                        ];

                                        const rawUsers = localStorage.getItem("roy_routine_users");
                                        const usersRegistry = rawUsers ? JSON.parse(rawUsers) : {};
                                        
                                        usersRegistry[signupMobile] = {
                                          name: signupName,
                                          mobile: signupMobile,
                                          passcode: signupPasscode,
                                          telegramConnected: true,
                                          chatId: telegramChatId,
                                          profile: newProfile,
                                          tasks: newTasks
                                        };

                                        localStorage.setItem("roy_routine_users", JSON.stringify(usersRegistry));
                                        localStorage.setItem("roy_routine_current_user", JSON.stringify(newProfile));
                                        localStorage.setItem(`roy_tasks_${newProfile.uid}`, JSON.stringify(newTasks));

                                        // Persist web account directly to the server matrix database
                                        fetch("/api/telegram/sync", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            uid: newProfile.uid,
                                            profile: newProfile,
                                            tasks: newTasks,
                                            passcode: signupPasscode
                                          })
                                        }).catch(err => console.error("Web signup server sync failed:", err));

                                        // Toast
                                        setEmailNotificationToast({
                                          message: "Verification Successful!",
                                          submessage: "Welcome to Roy Routine. Your matrix core is active.",
                                          type: "success"
                                        });

                                        setProfile(newProfile);
                                        setUser({ uid: newProfile.uid, displayName: newProfile.displayName });
                                        setTasks(newTasks);
                                      } else {
                                        navigator.vibrate?.([200]);
                                        setAuthError("❌ Invalid Verification Code.");
                                      }
                                    }}
                                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-400/20"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                                    Submit Key
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>
                )}
              </div>

              {/* Sandbox Bypass Backdoors */}
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
                <button
                  type="button"
                  id="sandbox-auth-trigger"
                  onClick={triggerSandboxMode}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  Bypass Gate (Instant Sandbox Login)
                </button>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none">
                  Telemetry core fallback enabled
                </div>
              </div>

              {/* AUTHENTICATION FOOTER */}
              <footer className="mt-8 text-[9px] font-bold text-slate-500 tracking-[0.25em] uppercase font-mono border-t border-white/5 pt-4">
                Powered by Roy No Rules 🚀 <span className="text-slate-600 ml-1">Since 2026</span>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Loading Indicator */}
        {loadingAuth && (
          <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col items-center justify-center">
            {/* Ambient cyber grids */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center relative z-10 px-6"
            >
              <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-slate-900" />
                <div className="absolute inset-0 rounded-full border-2 border-t-sky-500 border-r-sky-500 animate-spin" />
                <Zap className="w-6 h-6 text-sky-400 animate-pulse" />
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-widest font-sans mb-2">
                Initializing Roy Routine...
              </h2>
              <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 animate-pulse">
                Establishing Quantum Vigilance Engine
              </p>
            </motion.div>
          </div>
        )}

        {/* Main Application Interface */}
        {profile && (
          <main className="flex-grow w-full max-w-5xl mx-auto flex flex-col gap-6 items-stretch mt-1 pb-32">
            <AnimatePresence mode="wait">
            
            {/* Cinematic Home Tab */}
            {activeTab === "home" && (
              <motion.div
                key="home-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-8 text-left relative overflow-hidden w-full max-w-4xl mx-auto py-1"
              >
                {/* 1. HERO SECTION */}
                <div className="relative text-center flex flex-col items-center justify-center py-6 pt-10" id="hero-section">
                  {/* Subtle breathing background light */}
                  <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-72 h-72 rounded-full bg-cyan-500/10 filter blur-[100px] pointer-events-none animate-pulse" />
                  <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-96 h-96 rounded-full bg-violet-600/5 filter blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />
                  
                  {/* Floating micro particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden h-full w-full">
                    <motion.div 
                      animate={{ y: [-10, 10, -10], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                      className="absolute top-10 left-12 w-2 h-2 bg-cyan-400/60 rounded-full blur-[1px]" 
                    />
                    <motion.div 
                      animate={{ y: [15, -15, 15], opacity: [0.2, 0.6, 0.2] }}
                      transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                      className="absolute top-40 right-16 w-1.5 h-1.5 bg-pink-400/50 rounded-full blur-[1px]" 
                    />
                    <motion.div 
                      animate={{ y: [-8, 8, -8], opacity: [0.4, 0.8, 0.4] }}
                      transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
                      className="absolute bottom-10 left-1/3 w-1 h-1 bg-violet-400/60 rounded-full" 
                    />
                  </div>

                  {/* Breathing Roy Routine Geometric Logo */}
                  <motion.div 
                    id="roy-routine-center-logo"
                    animate={{ 
                      scale: [1, 1.02, 1],
                      boxShadow: ["0 0 30px rgba(6,182,212,0.1)", "0 0 50px rgba(139,92,246,0.15)", "0 0 30px rgba(6,182,212,0.1)"]
                    }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="w-20 h-20 md:w-22 md:h-22 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center mb-6 relative overflow-hidden backdrop-blur-md cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-violet-500/10 opacity-70" />
                    <div className="absolute inset-2 bg-gradient-to-b from-slate-950 to-slate-900 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="logo-grad-sym" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="50%" stopColor="#a78bfa" />
                            <stop offset="100%" stopColor="#f472b6" />
                          </linearGradient>
                        </defs>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" stroke="url(#logo-grad-sym)" />
                      </svg>
                    </div>
                  </motion.div>

                  {/* Smooth Animated Title */}
                  <motion.h1 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.8 }}
                    className="text-4xl md:text-5xl font-black tracking-[0.25em] text-white uppercase text-center font-sans select-none"
                    id="hero-main-title"
                  >
                    ROY ROUTINE
                  </motion.h1>

                  {/* Premium Subtitle */}
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 1 }}
                    className="text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase bg-gradient-to-r from-cyan-400 via-violet-300 to-pink-400 bg-clip-text text-transparent mt-3 text-center"
                    id="hero-subtitle"
                  >
                    Build Discipline. Control Your Future.
                  </motion.p>
                </div>

                {/* 2. SMART STATUS CARD */}
                {(() => {
                  const doneCount = tasks.filter(t => t.completed).length;
                  const totalCount = tasks.length;
                  const progressPercent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
                  const disciplineScore = totalCount ? progressPercent : 100;
                  
                  return (
                    <motion.div 
                      whileHover={{ y: -3 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 bg-slate-950/40 backdrop-blur-2xl relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 mx-auto w-full"
                      id="smart-status-card"
                    >
                      <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/5 rounded-full blur-[90px] pointer-events-none" />
                      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
                      
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />
                      
                      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
                        {/* Stat 1: Discipline score */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left border-r border-white/5 pr-2 last:border-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                              <Award className="w-5 h-5 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">DISCIPLINE SCORE</span>
                          </div>
                          <span className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300">
                            {disciplineScore}%
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tight">COHERENCE VECTOR</span>
                        </div>

                        {/* Stat 2: Daily Progress */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left border-r border-white/5 pr-2 last:border-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-purple-500/10 rounded-xl text-violet-400">
                              <Activity className="w-5 h-5 filter drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]" />
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">DAILY PROGRESS</span>
                          </div>
                          <span className="text-3xl font-mono font-black text-white">
                            {doneCount}/{totalCount || 5}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tight">TARGETS INDEX</span>
                        </div>

                        {/* Stat 3: Streak */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left border-r border-white/5 pr-2 last:border-0 font-sans">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400">
                              <Flame className="w-5 h-5 streak-fire-anim" />
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">STREAK CONTROL</span>
                          </div>
                          <span className="text-3xl font-mono font-black text-pink-400 filter drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                            {profile?.streak || 0} DAYS
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tight">CONTINUITY TIER</span>
                        </div>

                        {/* Stat 4: Telegram Connected */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left last:border-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                              <Send className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">TELEGRAM SYNC</span>
                          </div>
                          <span className={`text-xs font-black uppercase inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                            telegramConnected 
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                              : "bg-white/5 text-slate-400 border border-white/5"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${telegramConnected ? "bg-cyan-400 animate-pulse" : "bg-slate-500"}`} />
                            {telegramConnected ? "CONNECTED" : "UNLINKING"}
                          </span>
                          <span className="text-[8px] text-slate-500 mt-1 uppercase font-bold tracking-tight">
                            {telegramConnected ? `${telegramChatId ? "@" + telegramChatId : "Secure Tunnel"}` : "PROMPT DISPATCH DISENGAGED"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* FOUR FUTURISTIC GLOWING BUTTONS HUB */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 font-sans" id="premium-cyber-toolbar">
                  {/* Button 1: Connect Telegram */}
                  <button
                    onClick={() => {
                      setShowTelegramConnectModal(true);
                    }}
                    className={`relative p-4 rounded-2xl bg-slate-950/80 border transition-all duration-300 text-left overflow-hidden flex flex-col justify-between h-28 group cursor-pointer ${
                      telegramConnected 
                        ? "border-emerald-500/30 hover:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]" 
                        : "border-sky-500/30 hover:border-sky-400 focus:ring-1 focus:ring-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.05)] hover:shadow-[0_0_25px_rgba(14,165,233,0.15)]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-2 rounded-xl transition group-hover:scale-110 ${
                        telegramConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-sky-500/10 text-sky-450"
                      }`}>
                        <Send className="w-5 h-5" />
                      </div>
                      {telegramConnected ? (
                        <span className="text-[9px] font-black uppercase text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full animate-pulse border border-emerald-500/20 font-mono tracking-widest">
                          ● Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-slate-500 px-2 py-0.5 bg-white/5 rounded-full font-mono tracking-widest">
                          ● Offline
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Connect Telegram</h4>
                      <span className="text-[9px] text-slate-400 font-mono tracking-tight block mt-0.5">
                        {telegramConnected ? "@royroutune_bot connected" : "Link @royroutune_bot"}
                      </span>
                    </div>
                  </button>

                  {/* Button 2: Start Discipline */}
                  <button
                    onClick={() => setActiveTab("routine")}
                    className="relative p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 hover:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] transition-all duration-300 text-left overflow-hidden flex flex-col justify-between h-28 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 transition group-hover:scale-110">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black uppercase text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded-full font-mono tracking-widest">
                        ● Core
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Start Discipline</h4>
                      <span className="text-[9px] text-slate-400 font-mono tracking-tight block mt-0.5">Define Tracker checklist</span>
                    </div>
                  </button>

                  {/* Button 3: Open Motivation */}
                  <button
                    onClick={() => {
                      setIsMotivationModalOpen(true);
                      generateModalMotivation(motivationLanguage);
                    }}
                    className="relative p-4 rounded-2xl bg-slate-950/80 border border-pink-500/30 hover:border-pink-400 focus:ring-1 focus:ring-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.15)] transition-all duration-300 text-left overflow-hidden flex flex-col justify-between h-28 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 transition group-hover:scale-110">
                        <Brain className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black uppercase text-pink-400 px-2 py-0.5 bg-pink-500/10 rounded-full font-mono tracking-widest">
                        ● MultiLing
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Open Motivation</h4>
                      <span className="text-[9px] text-slate-400 font-mono tracking-tight block mt-0.5">Generate Instant Quotes</span>
                    </div>
                  </button>

                  {/* Button 4: Share Progress */}
                  <button
                    onClick={() => {
                      const done = tasks.filter(t => t.completed).length;
                      const total = tasks.length;
                      const rate = total ? Math.round((done / total) * 100) : 0;
                      const streak = profile?.streak || 0;
                      const message = `🚨 ROY ROUTINE VIGILANCE DISPATCH 🚨\n\n🎯 Daily Target Progress: ${rate}%\n🔥 Current Streak: ${streak} Days\n🏆 Consistency Status: ${isPunishedMode ? "WARNING (DEFICIT)" : "SECURED"}\n\n⚡ "Discipline creates legends. Complete your targets now!"\nPowered by Roy No Rules • Since 2026`;
                      
                      if (navigator.share) {
                        navigator.share({
                          title: "Roy Routine System Dispatch",
                          text: message
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(message);
                        setEmailNotificationToast({
                          message: "Telemetry Dispatch Copied!",
                          submessage: "Formatting stored in board list. Post into WhatsApp & Telegram!",
                          type: "success"
                        });
                      }
                    }}
                    className="relative p-4 rounded-2xl bg-slate-950/80 border border-orange-500/30 hover:border-orange-400 focus:ring-1 focus:ring-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.05)] hover:shadow-[0_0_25px_rgba(249,115,22,0.15)] transition-all duration-300 text-left overflow-hidden flex flex-col justify-between h-28 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 transition group-hover:scale-110">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black uppercase text-orange-400 px-2 py-0.5 bg-orange-500/10 rounded-full font-mono tracking-widest">
                        ● Dispatch
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Share Progress</h4>
                      <span className="text-[9px] text-slate-400 font-mono tracking-tight block mt-0.5">Broadcast routine metrics</span>
                    </div>
                  </button>
                </div>

                {/* 3. DAILY TARGETS SECTION */}
                <div className="space-y-4 z-10" id="daily-targets-interactive-section">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest block">OPERATIONAL VECTORS</span>
                      <h3 className="text-lg font-black text-white tracking-wider uppercase font-sans">DAILY ACTIVE TARGETS</h3>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">SECURE TO COMPLIATE ROUTINE</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-sans">
                    {(() => {
                      // Category mappings & task analyzer
                      const categories = [
                        { 
                          name: "Study", 
                          icon: BookOpen, 
                          color: "from-cyan-500/20 to-violet-500/10", 
                          borderColor: "group-hover:border-cyan-400/50",
                          glowColor: "rgba(6,182,212,0.15)",
                          accentText: "text-cyan-400",
                          taskMatch: "Study"
                        },
                        { 
                          name: "Workout", 
                          icon: Dumbbell, 
                          color: "from-pink-500/20 to-indigo-500/10", 
                          borderColor: "group-hover:border-pink-400/50",
                          glowColor: "rgba(236,72,153,0.15)",
                          accentText: "text-pink-400",
                          taskMatch: "Workout"
                        },
                        { 
                          name: "Running", 
                          icon: Flame, 
                          color: "from-orange-500/20 to-pink-500/10", 
                          borderColor: "group-hover:border-orange-400/50",
                          glowColor: "rgba(249,115,22,0.15)",
                          accentText: "text-orange-400",
                          taskMatch: "Running"
                        },
                        { 
                          name: "Water", 
                          icon: Droplets, 
                          color: "from-blue-500/20 to-cyan-500/10", 
                          borderColor: "group-hover:border-blue-400/50",
                          glowColor: "rgba(59,130,246,0.15)",
                          accentText: "text-blue-400",
                          taskMatch: "Water"
                        },
                        { 
                          name: "Sleep", 
                          icon: Moon, 
                          color: "from-violet-500/20 to-fuchsia-500/10", 
                          borderColor: "group-hover:border-violet-400/50",
                          glowColor: "rgba(139,92,246,0.15)",
                          accentText: "text-violet-400",
                          taskMatch: "Sleep"
                        }
                      ];

                      return categories.map((cat) => {
                        // Gather tasks belonging to this category from list
                        const catTasks = tasks.filter(t => t.category.toLowerCase() === cat.taskMatch.toLowerCase());
                        const totalCat = catTasks.length || 1; // logical default of 1 if not declared
                        const completedCat = catTasks.filter(t => t.completed).length;
                        const rate = Math.round((completedCat / totalCat) * 100);

                        return (
                          <motion.div
                            key={cat.name}
                            whileHover={{ y: -4, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 450, damping: 22 }}
                            onClick={() => {
                              // If they have tasks in this category, toggle the first incomplete one
                              const nextIncomplete = catTasks.find(t => !t.completed);
                              if (nextIncomplete) {
                                toggleTaskCompletion(nextIncomplete);
                              } else if (catTasks.length > 0) {
                                // wrap around and toggle first completed
                                toggleTaskCompletion(catTasks[0]);
                              } else {
                                // No tasks configured, trigger toast info
                                setEmailNotificationToast({
                                  message: `${cat.name} Target Standby`,
                                  submessage: `Please compile or add tasks mapped to "${cat.taskMatch}" in the target planner.`,
                                  type: "success"
                                });
                              }
                            }}
                            className="group relative rounded-2xl p-4 md:p-5 border border-white/5 bg-slate-950/40 hover:bg-slate-900/40 backdrop-blur-md transition-all duration-300 flex flex-col justify-between h-44 overflow-hidden cursor-pointer shadow-[0_10px_25px_rgba(0,0,0,0.3)]"
                            style={{ 
                              boxShadow: `inset 0 0 15px rgba(255,255,255,0.01), 0 0 20px rgba(0,0,0,0.3)`
                            }}
                          >
                            {/* Ambient Glow Aura */}
                            <div className="absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-300 group-hover:opacity-70 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${cat.glowColor}, transparent 70%)` }} />
                            
                            <div className="flex justify-between items-start mb-2 relative z-10">
                              <div className={`p-2 rounded-xl transition duration-300 bg-white/5 ${cat.accentText} group-hover:scale-110`}>
                                <cat.icon className="w-4 h-4 filter drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]" />
                              </div>
                              <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">ACTIVE</span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center justify-center my-1.5">
                              {/* Soft glowing circular progress ring */}
                              <div className="relative w-14 h-14 flex items-center justify-center">
                                <svg className="w-14 h-14 transform -rotate-90">
                                  <circle cx="28" cy="28" r="22" className="stroke-white/[0.03]" strokeWidth="3.5" fill="transparent" />
                                  <motion.circle
                                    cx="28"
                                    cy="28"
                                    r="22"
                                    stroke="currentColor"
                                    className={`${cat.accentText} filter drop-shadow-[0_0_8px_currentColor]`}
                                    strokeWidth="3.5"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 22}
                                    strokeDashoffset={(2 * Math.PI * 22) - ((rate / 100) * (2 * Math.PI * 22))}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                  />
                                </svg>
                                <span className="absolute text-[10px] font-mono font-black text-white">
                                  {rate}%
                                </span>
                              </div>
                            </div>

                            <div className="relative z-10 mt-1">
                              <h4 className="text-xs font-black text-white uppercase tracking-wider block leading-none">{cat.name}</h4>
                              <span className="text-[9px] text-slate-400 font-mono tracking-tight block mt-1">
                                {catTasks.length > 0 ? `${completedCat}/${totalCat} Complete` : "Idle Session"}
                              </span>
                            </div>
                          </motion.div>
                        );
                      });
                    })()}
                  </div>

                  {/* MINI TIMEZONE CLOCK BAR */}
                  <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-slate-950/60 flex flex-row items-center justify-between shadow-[0_15px_30px_rgba(0,0,0,0.4)] relative overflow-hidden" id="horizontal-clock-strip">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                        <Clock className="w-4 h-4 animate-spin-slow" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold text-cyan-400/90 tracking-widest block uppercase">GLOBAL REGISTRATION TUNNEL ACTIVE</span>
                        <p className="text-xs font-black font-mono text-white tracking-widest mt-0.5">
                          IST: {currentTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[9px] text-slate-500 uppercase tracking-widest leading-none hidden sm:block">
                      <span>{currentTime.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>

                {/* 4. MOTIVATION SECTION // MIND CONTROL SYSTEM */}
                <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 relative overflow-hidden text-left font-sans z-10" id="homepage-mind-control">
                  {/* Subtle fuchsia/cyan border glow stripe */}
                  <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-violet-500/35 via-cyan-400/35 to-transparent pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-grow space-y-2">
                      <div className="text-[9px] font-mono font-black text-cyan-400/90 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        MIND CONTROL EMISSION ({motivationLanguage})
                      </div>
                      <h4 className="text-xl md:text-2xl font-extrabold italic text-slate-100 font-sans tracking-tight leading-relaxed max-w-xl">
                        "{motivationQuote || "No excuses. Accept absolute ownership of your thoughts and actions."}"
                      </h4>
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                        <span>SYNAPTIC OVERRIDE DEPLOYED</span>
                        <span>•</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`"${motivationQuote || "No excuses. Accept absolute ownership of your thoughts."}" - Roy Routine`);
                            setEmailNotificationToast({
                              message: "Quote copied to matrix board!",
                              submessage: "Transfer telemetry to external nodes completed.",
                              type: "success"
                            });
                          }}
                          className="text-cyan-400/80 hover:text-cyan-300 transition hover:underline cursor-pointer"
                        >
                          COPY TRANSCEIVER
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 min-w-[200px] justify-center">
                      <button
                        onClick={() => {
                          setIsMotivationModalOpen(true);
                          generateModalMotivation(motivationLanguage);
                        }}
                        className="px-5 py-3 bg-gradient-to-r from-cyan-600/80 to-violet-600/80 hover:from-cyan-500 hover:to-violet-500 text-white font-extrabold text-[11px] uppercase tracking-[0.15em] rounded-xl transition duration-300 cursor-pointer shadow-lg shadow-cyan-950/30 active:scale-95 text-center flex items-center justify-center gap-2 border border-white/10"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        OPEN MOTIVATION SYSTEM
                      </button>

                      <div className="flex items-center justify-around bg-slate-950/90 border border-white/5 rounded-xl py-2 px-3">
                        {(["English", "Hindi", "Hinglish"] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={async () => {
                              setMotivationLanguage(lang);
                              setLoadingMotivation(true);
                              await new Promise(resolve => setTimeout(resolve, 200));
                              const englishQuotes = [
                                "The neural matrix detects incomplete vectors. Execute self-mastery today or watch your stats decay.",
                                "In the field of high-performance minds, fatigue is merely an unoptimized subroutine. Terminate it.",
                                "Your streak is not a number; it is a code of honor. Do not rewrite your standards for comfort.",
                                "Comfort is a Trojan horse. Open your directives, lock in your concentration, and destroy procrastination."
                              ];
                              const hindiQuotes = [
                                "अनुशासन ही तुम्हारी सबसे बड़ी शक्ति है। आज के लक्ष्यों को अधूरा मत छोड़ो, उठो और रणक्षेत्र में उतरे!",
                                "समय की रेत बह रही है। यदि आज तुम नहीं रुके, तो कल तुम इतिहास लिखोगे।",
                                "कठिन मार्ग ही तुम्हें सर्वश्रेष्ठ बनाता है। अपने आलस्य को परास्त करो और आगे बढ़ो।"
                              ];
                              const hinglishQuotes = [
                                "Incomplete targets matlab failure path key open hona. Alarm ko nahi, khud ke sapno ko snooze karna band karo.",
                                "Lazy feel karna ek system bug hai. Workout karo, padhai karo, aur is bug ko abhi wipe out karo!",
                                "Streak tootna nahi chahiye! Kal par depend rehna kamzoro ka kaam hai, real champion aaj hi execute karta hai."
                              ];
                              const bank = lang === "English" ? englishQuotes : lang === "Hindi" ? hindiQuotes : hinglishQuotes;
                              const sample = bank[Math.floor(Math.random() * bank.length)];
                              setMotivationQuote(sample);
                              setModalMotivation(sample);
                              setLoadingMotivation(false);
                            }}
                            className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-lg transition cursor-pointer ${
                              motivationLanguage === lang 
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {lang === "English" ? "EN" : lang === "Hindi" ? "HI" : "HGL"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. DIRECT IN-VIEW CHECKLIST */}
                <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-slate-950/20 backdrop-blur-md z-10" id="homepage-active-targets-bento">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="text-cyan-400 w-5 h-5 filter drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]" />
                        Operational Direct Checklist
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono tracking-tight mt-0.5">DIRECT CHECKBOARD INTERACTION // KEEP COHERENCE COMPLIANT</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-900/80 px-3 py-1 rounded-xl border border-white/5">
                        SCORE: <span className="text-cyan-400 font-black">{profile.points} PTS</span>
                      </span>
                    </div>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-slate-950/50" id="homepage-empty-targets">
                      <Brain className="w-10 h-10 text-cyan-500/20 mx-auto mb-3 animate-pulse" />
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Active Routine Compiled Today</p>
                      <p className="text-[10px] text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Trigger <strong className="text-cyan-400 font-extrabold cursor-pointer hover:underline" onClick={() => setActiveTab("routine")}>Start Discipline</strong> and compile customized routines with our AI interface instantly.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3" id="checklist-cards-container">
                      {tasks.map((task) => (
                        <motion.div
                          key={task.id}
                          id={`task-card-${task.id}`}
                          onClick={() => toggleTaskCompletion(task)}
                          whileHover={{ y: -1, scale: 1.002 }}
                          whileTap={{ scale: 0.995 }}
                          className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 backdrop-blur-md ${
                            task.completed 
                              ? "bg-emerald-950/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.02)] hover:bg-emerald-950/10" 
                              : isPunishedMode 
                                ? "bg-fuchsia-950/5 border-fuchsia-500/20 shadow-[0_0_20px_rgba(217,70,239,0.04)] hover:bg-fuchsia-950/10"
                                : "bg-white/[0.01] border-white/5 hover:border-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.04)]"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Glowing Cyber Checkbox visually responsive */}
                            <div className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                              task.completed 
                                ? "bg-gradient-to-tr from-cyan-500 to-violet-500 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]" 
                                : isPunishedMode
                                  ? "border-pink-500/50 bg-pink-950/20 text-pink-400 animate-pulse"
                                  : "border-slate-700 hover:border-cyan-400 bg-slate-950/80"
                            }`}>
                              {task.completed ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : isPunishedMode ? (
                                <AlertTriangle className="w-3 h-3 text-pink-400" />
                              ) : null}
                            </div>

                            <div>
                              <span className={`text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 ${task.completed ? "line-through text-slate-500" : "text-slate-100"}`}>
                                {task.title}
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                                <span className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-md bg-white/5 border border-white/5 text-slate-400 font-mono tracking-wide">
                                  {task.time}
                                </span>
                                <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border font-mono tracking-wide ${
                                  task.category === "Study" 
                                    ? "bg-cyan-500/5 border-cyan-500/10 text-cyan-400" 
                                    : task.category === "Running"
                                      ? "bg-pink-500/5 border-pink-500/10 text-pink-400"
                                      : task.category === "Sleep"
                                        ? "bg-indigo-500/5 border-indigo-500/10 text-indigo-400"
                                        : "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
                                }`}>
                                  {task.category}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <span className={`text-xs font-black font-mono tracking-wider ${task.completed ? "text-emerald-400/90" : "text-cyan-400"}`}>
                              {task.completed ? "+" : ""}{task.points} Pts
                            </span>
                            {task.completed && (
                              <span className="text-[8px] font-mono uppercase text-emerald-500/70 mt-0.5 font-bold tracking-widest animate-pulse">ACTIVE VERIFIED</span>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      <div className="mt-4 flex justify-end pt-3 border-t border-white/5 font-sans">
                        <button
                          id="trigger-daily-assessment-btn"
                          onClick={() => {
                            triggerDailyStatusAssessment();
                            setEmailNotificationToast({
                              message: "Vigilance Audit Started",
                              submessage: "Scanning active checklist elements against current coherence parameters...",
                              type: "success"
                            });
                          }}
                          className="px-4 py-2 bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 hover:border-cyan-400/50 text-[10px] uppercase font-black tracking-widest text-cyan-400 rounded-lg transition duration-200 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.05)] hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95"
                        >
                          Start Diagnostic Audit
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* PREMIUM GLOWING FOOTER */}
                <footer className="mt-4 pb-12 text-center font-mono text-[9px] text-slate-500 tracking-[0.2em] uppercase space-y-1.5 z-10 select-none">
                  <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mx-auto mb-4" />
                  <p>Powered by Roy No Rules • Since 2026</p>
                  <p className="opacity-60 flex items-center justify-center gap-1.5">
                    <span>SECURITY COHERENCE RATIO SECURED</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-ping" />
                    <span>RESTRICTED COG-CON SYSTEM LOCK</span>
                  </p>
                </footer>
              </motion.div>
            )}

            {/* ROUTINE CHECKLIST PANEL */}
            {activeTab === "routine" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col gap-6"
                >
                  {/* Prompt Generator Box */}
                  <div className="glass-panel rounded-2xl p-6 border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                    
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                      <Brain className="text-blue-500 w-5 h-5 animate-pulse" />
                      Generate AI-Powered Daily Routine
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Provide details on your daily schedule and goals. Guardian AI will compile a rigorous structure packed with study targets, physical workouts, and maximum points.
                    </p>

                    {/* Prescribed Core Routine form */}
                    <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                          <Check className="text-blue-400 w-4 h-4 animate-bounce" />
                          Structured Routine Builder
                        </span>
                        <button 
                          id="load-structured-preset-btn"
                          onClick={() => {
                            setRoutineInput(`Generate a highly disciplined time-wise routine starting with wake up at ${structuredWake}. Integrate ${structuredStudy} of focused study sessions, a ${structuredWorkout} block, plus a solid ${structuredRunning} run. Keep hydrated with ${structuredWater} intake, and end the day with a deep ${structuredSleep} wind-down.`);
                          }}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                        >
                          ⚡ Compile Structured Prompt
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">⏰ Wake Up</label>
                          <input 
                            id="structured-wake-input"
                            type="text" 
                            className="w-full text-xs p-2 bg-black/40 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-blue-500/50" 
                            value={structuredWake}
                            onChange={(e) => setStructuredWake(e.target.value)}
                            placeholder="04:30 AM"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">📚 Study Hours</label>
                          <input 
                            id="structured-study-input"
                            type="text" 
                            className="w-full text-xs p-2 bg-black/40 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-blue-500/50" 
                            value={structuredStudy}
                            onChange={(e) => setStructuredStudy(e.target.value)}
                            placeholder="8 Hours"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">💪 Workout</label>
                          <input 
                            id="structured-workout-input"
                            type="text" 
                            className="w-full text-xs p-2 bg-black/40 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-blue-500/50" 
                            value={structuredWorkout}
                            onChange={(e) => setStructuredWorkout(e.target.value)}
                            placeholder="Gym Workout"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">🏃 Running</label>
                          <input 
                            id="structured-running-input"
                            type="text" 
                            className="w-full text-xs p-2 bg-black/40 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-blue-500/50" 
                            value={structuredRunning}
                            onChange={(e) => setStructuredRunning(e.target.value)}
                            placeholder="Morning Running"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">💧 Water Target</label>
                          <input 
                            id="structured-water-input"
                            type="text" 
                            className="w-full text-xs p-2 bg-black/40 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-blue-500/50" 
                            value={structuredWater}
                            onChange={(e) => setStructuredWater(e.target.value)}
                            placeholder="4 Litres"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">🛌 Sleep Target</label>
                          <input 
                            id="structured-sleep-input"
                            type="text" 
                            className="w-full text-xs p-2 bg-black/40 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-blue-500/50" 
                            value={structuredSleep}
                            onChange={(e) => setStructuredSleep(e.target.value)}
                            placeholder="11:00 PM"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <textarea
                        id="ai-prompt-input"
                        value={routineInput}
                        onChange={(e) => setRoutineInput(e.target.value)}
                        placeholder="e.g. I am a NEET aspirant studying intensely for biology, who attends morning hospital training and wants to finish a 30-min run at dusk."
                        className="w-full h-24 p-3 bg-black/30 border border-white/15 rounded-xl text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none font-sans"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      {/* Mood Selector Influence */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">State of Mind:</span>
                        <div className="flex flex-wrap gap-1" id="routine-mood-picker">
                          {Object.values(Mood).map((m) => (
                            <button
                              key={m}
                              onClick={() => setSelectedMood(m)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                selectedMood === m 
                                  ? "bg-blue-600 text-white font-extrabold shadow-sm scale-105" 
                                  : "bg-white/5 text-slate-400 hover:bg-white/10"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        id="generate-routine-trigger"
                        onClick={handleGenerateRoutine}
                        disabled={isGeneratingRoutine}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 glow-primary breathing-glow-btn"
                      >
                        {isGeneratingRoutine ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Composing Tasks...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Compile Checklist
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tasks List rendering */}
                  <div className="glass-panel rounded-2xl p-6 border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                          Today's Discipline Checklist
                        </h3>
                        <p className="text-2xs text-slate-400 font-mono mt-0.5">{getLocalDateString()}</p>
                      </div>
                      
                      {/* Completion Progress circular ring */}
                      <div className="flex items-center gap-3 justify-end">
                        <div className="relative w-12 h-12 flex items-center justify-center" id="progress-ring-container">
                          <svg className="w-12 h-12 transform -rotate-90">
                            <circle
                              cx="24"
                              cy="24"
                              r="18"
                              className="stroke-white/[0.05]"
                              strokeWidth="3.5"
                              fill="transparent"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="18"
                              className="stroke-emerald-500 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              strokeWidth="3.5"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 18}
                              strokeDashoffset={(2 * Math.PI * 18) - ((tasks.length ? (tasks.filter(t => t.completed).length / tasks.length) : 0) * (2 * Math.PI * 18))}
                              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
                            />
                          </svg>
                          <span className="absolute text-[10px] font-black text-emerald-400 font-mono">
                            {Math.round(tasks.length ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-white block">
                            {tasks.filter(t => t.completed).length} / {tasks.length} Done
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 font-bold tracking-wider uppercase block">DISCIPLINE RATE</span>
                        </div>
                      </div>
                    </div>

                    {isGeneratingRoutine ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-4 shimmer-bg">
                            <div className="flex items-center gap-4 w-2/3">
                              <div className="w-6 h-6 rounded border border-white/10 bg-white/5" />
                              <div className="flex-grow space-y-2">
                                <div className="h-4 bg-white/10 rounded w-1/2" />
                                <div className="h-2.5 bg-white/5 rounded w-1/3" />
                              </div>
                            </div>
                            <div className="w-12 h-6 bg-white/10 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl bg-white/2" id="empty-checklist">
                        <Smile className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-300">No active routines compiled yet.</p>
                        <p className="text-2xs text-slate-500 mt-1 max-w-xs mx-auto">Use the prompt box above to generate your custom tracker instantly via Google Gemini.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3" id="checklist-cards-container">
                        {tasks.map((task) => (
                          <motion.div
                            key={task.id}
                            id={`task-card-${task.id}`}
                            onClick={() => toggleTaskCompletion(task)}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -2, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 backdrop-blur-md ${
                              task.completed 
                                ? "bg-emerald-950/15 border-emerald-500/30 task-completed-glow shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:bg-emerald-950/25" 
                                : isPunishedMode 
                                  ? "bg-red-950/15 border-red-500/40 task-missed-shake shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:bg-red-950/25"
                                  : "bg-white/[0.02] border-white/5 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Checkbox circle visual */}
                              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                                task.completed 
                                  ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                  : isPunishedMode
                                    ? "border-red-500 bg-red-950/30 text-red-500"
                                    : "border-slate-500 hover:border-blue-400 bg-black/40"
                              }`}>
                                {task.completed ? (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                    className="flex items-center justify-center"
                                  >
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  </motion.div>
                                ) : isPunishedMode ? (
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                ) : null}
                              </div>
 
                              <div>
                                <span className={`text-sm font-bold tracking-tight transition-all duration-300 ${task.completed ? "line-through text-slate-400" : "text-slate-100"}`}>
                                  {task.title}
                                </span>
                                <div className="flex flex-wrap gap-2.5 mt-2 items-center">
                                  <span className="text-[10px] font-bold uppercase py-0.5 px-2 rounded-lg bg-white/5 border border-white/5 text-slate-300 font-mono tracking-wide">
                                    {task.time}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded-lg border font-mono tracking-wide ${
                                    task.category === "Study" 
                                      ? "bg-blue-500/10 border-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.05)]" 
                                      : task.category === "Running"
                                        ? "bg-orange-500/10 border-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.05)]"
                                        : task.category === "Sleep"
                                          ? "bg-indigo-500/10 border-indigo-500/10 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.05)]"
                                          : "bg-emerald-500/10 border-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                                  }`}>
                                    {task.category}
                                  </span>
                                </div>
                              </div>
                            </div>
 
                            {/* Rewards Points tag */}
                            <div className="text-right flex flex-col items-end">
                              <span className={`text-sm font-black font-mono tracking-wider ${task.completed ? "text-emerald-400" : "text-amber-400"}`}>
                                {task.completed ? "+" : ""}{task.points} Pts
                              </span>
                              {task.completed && (
                                <span className="text-[9px] font-mono uppercase text-emerald-500/70 mt-0.5 font-bold tracking-widest animate-pulse font-extrabold">VERIFIED</span>
                              )}
                              {!task.completed && isPunishedMode && (
                                <span className="text-[9px] font-mono uppercase text-red-500 mt-0.5 font-bold tracking-widest animate-pulse font-extrabold">PENALTY CHANCE</span>
                              )}
                            </div>
                          </motion.div>
                        ))}

                        {/* High-fidelity Day Completion Assessment button triggers EmailJS alerts on task skips */}
                        <div className="mt-6 flex justify-end pt-4 border-t border-white/5 font-sans">
                          <button
                            id="trigger-daily-assessment-btn"
                            onClick={() => {
                              // Perform discipline assessment with real EmailJS dispatch triggers
                              triggerDailyStatusAssessment();
                              setEmailNotificationToast({
                                message: "Discipline Assessment Initiated",
                                submessage: "Scanning active targets status for incomplete study or running checkpoints...",
                                type: "success"
                              });
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-red-650 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.45)] cursor-pointer flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4 animate-bounce" />
                            <span>Submit Targets &amp; Assess Performance</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* FITNESS DASHBOARD & GPS TRACKING PANEL */}
              {activeTab === "fitness" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col gap-6"
                >
                  {/* Header Title */}
                  <div className="glass-panel rounded-2xl p-6 border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                      <CompassIcon className="text-orange-500 w-5 h-5 animate-spin-slow" />
                      GPS Running Tracker & Analytics
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      Start the real GPS Runner tracking to register road runs with exact mathematical metrics and earn direct reward points.
                    </p>
                  </div>

                  {/* Live GPS Track Widget */}
                  <div className="glass-panel rounded-2xl p-6 border-white/5 text-left flex flex-col justify-between max-w-2xl mx-auto w-full">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 ml-1">Live GPS Run Tracker Widget</h4>
                        {isTrackingRun && (
                          <span className="bg-red-600 text-white font-mono text-[9px] font-black px-2.5 py-1 rounded-full animate-pulse uppercase tracking-wider">
                            RECORDING SESSION LOCATION
                          </span>
                        )}
                      </div>

                      <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center justify-around text-center mb-6 min-h-[120px]">
                        <div>
                          <span className="text-2xs text-slate-400 font-extrabold uppercase block tracking-wider">GPS Distance</span>
                          <span className="text-2xl font-black font-mono text-white block mt-2">{gpsDistance} km</span>
                        </div>

                        <div className="h-16 w-[1px] bg-white/10" />

                        <div>
                          <span className="text-2xs text-slate-400 font-extrabold uppercase block tracking-wider">Estimated Velocity</span>
                          <span className="text-2xl font-black font-mono text-white block mt-2">{gpsVelocity} km/h</span>
                        </div>
                      </div>

                      {trackingError && (
                        <div id="gps-error" className="p-3 border border-orange-500/30 bg-orange-950/20 text-orange-400 text-xs rounded-xl mb-4">
                          {trackingError}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {!isTrackingRun ? (
                        <button
                          id="gps-run-start"
                          onClick={startGpsTracking}
                          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 active:scale-95 breath-glow"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          Start Live Run Tracker
                        </button>
                      ) : (
                        <button
                          id="gps-run-stop"
                          onClick={stopGpsTracking}
                          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/15 active:scale-95 animate-pulse"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          Stop & Register Performance Points
                        </button>
                      )}
                    </div>

                    {gpsPointsAwarded > 0 && !isTrackingRun && (
                      <div id="run-reward-toast" className="p-3 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 font-bold font-mono text-[12px] rounded-xl mt-4 text-center leading-normal">
                        🏆 TRANSACTION PROTOCOL MATCHED: Completed +{gpsDistance} KM road run. Awarded +{gpsPointsAwarded} direct loyalty points!
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* REAL-TIME LEADERBOARD PANEL */}
              {activeTab === "leaderboard" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="glass-panel rounded-2xl p-6 border-white/5"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                    <div>
                      <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                        <TrendingUp className="text-blue-500 w-5 h-5" />
                        Live Competitive Leaderboard
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Rankings of Guardian warriors updated synchronously from our active database collections.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-lg">
                      <button
                        onClick={() => setLeaderboardTimeframe("Weekly")}
                        className={`px-3 py-1 text-2xs font-extrabold rounded-md transition ${leaderboardTimeframe === "Weekly" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => setLeaderboardTimeframe("Monthly")}
                        className={`px-3 py-1 text-2xs font-extrabold rounded-md transition ${leaderboardTimeframe === "Monthly" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>

                  {loadingLeaderboard ? (
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="p-4 rounded-xl border border-white/5 bg-white/2 flex items-center justify-between gap-4 shimmer-bg overflow-hidden relative">
                          <div className="flex items-center gap-3 w-3/4">
                            <div className="w-8 h-8 bg-white/5 rounded-full" />
                            <div className="flex-grow space-y-2">
                              <div className="w-1/3 h-3 bg-white/10 rounded" />
                              <div className="w-1/4 h-2 bg-white/5 rounded" />
                            </div>
                          </div>
                          <div className="w-12 h-4 bg-white/5 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 font-sans" id="leaderboard-table-list">
                      {leaderboard.map((u, i) => (
                        <div
                          key={u.uid}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                            u.uid === profile?.uid 
                              ? "bg-blue-600/10 border-blue-500 hover:bg-blue-600/15" 
                              : "bg-white/2 border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Ranking Placement icon */}
                            <div className="w-8 text-center font-black flex items-center justify-center">
                              {i === 0 ? (
                                <span className="text-lg">🥇</span>
                              ) : i === 1 ? (
                                <span className="text-lg">🥈</span>
                              ) : i === 2 ? (
                                <span className="text-lg">🥉</span>
                              ) : (
                                <span className="text-xs font-mono text-slate-500">#{i + 1}</span>
                              )}
                            </div>

                            {/* Avatar & Info */}
                            <div className="flex items-center gap-3">
                              <img 
                                src={u.photoURL} 
                                alt={u.displayName} 
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full border border-white/10 object-cover" 
                              />
                              <div>
                                <span className="text-xs font-extrabold text-white block">
                                  {u.displayName} {u.uid === profile?.uid ? " (You)" : ""}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  {u.guardianRank}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Level Score */}
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-extrabold text-orange-500 uppercase flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
                              {u.streak}d
                            </span>

                            <div className="text-right">
                              <span className="text-sm font-black font-mono text-white block">
                                {u.points}
                              </span>
                              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">
                                Points
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

               {/* AI MOTIVATION SPEECH DIALOG PANEL */}
              {activeTab === "motivation" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="glass-panel rounded-2xl p-6 border-white/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl" />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Smile className="text-indigo-400 w-5.5 h-5.5 animate-pulse" />
                        AI Fortitude Motivation Chamber
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Interact with the high-intensity neural network to calibrate discipline levels.
                      </p>
                    </div>
                  </div>

                  {/* Mood Selector Buttons */}
                  <div className="bg-slate-950/30 p-4 border border-white/5 rounded-xl mb-6 font-sans">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-3">Adjust Active Emotional Mood:</span>
                    <div className="flex flex-wrap gap-2" id="motivation-mood-selector">
                      {Object.values(Mood).map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMood(m)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            selectedMood === m
                              ? "bg-indigo-600 text-white scale-105 shadow-md shadow-indigo-600/20 border border-indigo-400/20"
                              : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/5"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${selectedMood === m ? 'bg-indigo-300 animate-ping' : 'bg-slate-500'}`} />
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Redesigned glowing launch trigger center */}
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-950/40 border border-white/5 rounded-2xl mb-6 text-center relative overflow-hidden font-sans">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
                    
                    <Smile className="w-10 h-10 text-indigo-400/80 mb-3 animate-bounce" />
                    <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-widest mb-1">
                      Guardian Language System
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mb-5 leading-normal">
                      Unlock high-emotional frequency motivations tailored for maximum work ethic.
                    </p>

                    <button
                      id="choose-lang-glowing-btn"
                      onClick={() => {
                        setIsMotivationModalOpen(true);
                        if (!modalMotivation) {
                          setModalMotivation(motivationQuote);
                        }
                      }}
                      className="relative group overflow-hidden px-8 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 hover:from-indigo-500 hover:via-violet-500 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-95 border border-indigo-400/30 flex items-center gap-2.5 shadow-[0_0_15px_rgba(99,102,241,0.25)] cursor-pointer"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Choose Motivation Language</span>
                    </button>
                  </div>

                  {/* Exquisite Static High-Tech Readout Display Panel */}
                  <div className="p-5 bg-black/45 border-l-4 border-indigo-500/80 rounded-xl min-h-[100px] flex flex-col justify-center relative font-mono overflow-hidden">
                    <div className="absolute top-2 right-3 flex items-center gap-1 text-[9px] text-slate-500 font-extrabold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Matrix Display
                    </div>
                    {loadingMotivation ? (
                      <div className="w-full flex flex-col gap-2.5 py-1">
                        <div className="h-3.5 bg-white/10 rounded w-11/12 shimmer-bg" />
                        <div className="h-3.5 bg-white/5 rounded w-3/4 shimmer-bg" />
                      </div>
                    ) : (
                      <div className="text-left font-mono">
                        <span className="text-[9px] text-indigo-400/80 uppercase font-extrabold tracking-widest block mb-2">
                          &gt; CURRENT TRANSMISSION [{motivationLanguage.toUpperCase()}]
                        </span>
                        
                        <p className="text-sm font-bold tracking-wide text-slate-200 leading-relaxed italic font-sans pl-1">
                          "{motivationQuote}"
                        </p>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                          <span>Status: CALIBRATED</span>
                          <span>LEVEL ACCURACY: 99.8%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
               {/* DISCIPLINE HISTORY & AUDIT LOGS CONTROL CENTER */}
              {activeTab === "history" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-6"
                >
                  <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden bg-slate-900/60 shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[90px] pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/10 rounded-full blur-[70px] pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5 mb-5 text-left">
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase block font-bold">Discipline Telemetry OS</span>
                        <h2 className="text-2xl font-black text-white tracking-tight">Discipline History & Streak Logs</h2>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-950/40 border border-purple-500/20 rounded-xl text-2xs font-mono text-purple-400 font-bold uppercase">
                        Telemetry Engine v3.5
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-left">
                      <div className="p-4 bg-slate-950/20 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase block font-bold">Current Focus Streak</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black font-mono text-orange-400">{profile.streak}</span>
                          <span className="text-xs font-bold text-slate-400">days</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-950/20 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase block font-bold">Maximum Record</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black font-mono text-cyan-400">{profile.maxStreak || profile.streak}</span>
                          <span className="text-xs font-bold text-slate-400 font-bold">days</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-950/20 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase block font-bold">Completed Tasks Balance</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black font-mono text-emerald-400">{tasks.filter(t => t.completed).length}</span>
                          <span className="text-xs font-bold text-slate-400">of {tasks.length}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-950/20 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase block font-bold">Willpower Level</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black font-mono text-indigo-400">
                            {tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%
                          </span>
                          <span className="text-xs font-bold text-slate-400">efficiency</span>
                        </div>
                      </div>
                    </div>

                    {/* Completion Stats & Streak Milestone Accomplishments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-6 text-left">
                      {/* Weekly Success Rate distribution */}
                      <div className="p-5 bg-slate-950/30 rounded-2xl border border-white/5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-200 mb-1 font-bold">Weekly Task Matrix Breakdown</h3>
                          <p className="text-xs text-slate-400 leading-normal mb-6">Distribution and performance rate of generated routine discipline units.</p>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300 font-bold">Mental Concentration (Study/Tasks)</span>
                              <span className="text-cyan-400 font-black font-mono">82% Completed</span>
                            </div>
                            <div className="w-full bg-slate-950 border border-white/5 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full" style={{ width: "82%" }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300 font-bold">Cardiorespiratory Physicals (Running/Activity)</span>
                              <span className="text-orange-400 font-black font-mono">
                                90% Completed
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 border border-white/5 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full" style={{ width: "90%" }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300 font-bold">Sleep & Bio-Restorative Cycles</span>
                              <span className="text-purple-400 font-black font-mono">75% Matches</span>
                            </div>
                            <div className="w-full bg-slate-950 border border-white/5 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: "75%" }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Streak history milestones list */}
                      <div className="p-5 bg-slate-950/30 rounded-2xl border border-white/5 text-left flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-200 mb-1 font-bold">Streak History Achievements</h3>
                          <p className="text-xs text-slate-400 leading-normal mb-4">Milestones unlocked along your path towards unbreakable focus and discipline.</p>
                        </div>
                        
                        <div className="space-y-3 mt-2">
                          <div className="flex items-center gap-3 p-2 bg-slate-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-3xs font-black uppercase tracking-wider font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div>
                              <span className="text-slate-200 block text-xs">AURA INITIATE MATCH</span>
                              Successfully created first secure routine program setup.
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-2 bg-slate-950/20 border border-cyan-500/20 text-cyan-400 rounded-xl text-3xs font-black uppercase tracking-wider font-bold">
                            <div className="w-4 h-4 rounded-full bg-cyan-950/30 flex items-center justify-center shrink-0">
                              <Flame className="w-3.5 h-3.5 text-cyan-400" />
                            </div>
                            <div>
                              <span className="text-slate-200 block text-xs">VANGUARD CONSISTENCY STATUS</span>
                              Reached an active continuous streak of 3 consecutive focus days.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outbound logs segment */}
                  <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 text-left bg-slate-950/40">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                          <Mail className="text-blue-400 w-5 h-5 animate-pulse" />
                          Guardian AI Transmission logs
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Monitor active telemetry email pipelines, automated alerts, and Resend delivery status.
                        </p>
                      </div>

                      <button
                        id="clear-logs-btn"
                        onClick={handleClearEmailLog}
                        className="px-3.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-500/10 font-bold text-xs rounded-lg transition self-end sm:self-auto"
                      >
                        Clear Log Center
                      </button>
                    </div>

                    {/* Operational Telemetry Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6 text-left" id="delivery-stats-bento">
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Total Dispatched</span>
                        <span className="text-base font-black font-mono text-white mt-1 block">{sentEmails.length} Outbound</span>
                      </div>
                      <div className="bg-emerald-950/15 border border-emerald-500/10 p-3 rounded-xl">
                        <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wide block">Real Deliveries</span>
                        <span className="text-base font-black font-mono text-emerald-400 mt-1 block">
                          {sentEmails.filter(e => e.status === "Delivered").length} Active
                        </span>
                      </div>
                      <div className="bg-orange-950/15 border border-orange-500/10 p-3 rounded-xl">
                        <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-wide block">Retries In Queue</span>
                        <span className="text-base font-black font-mono text-orange-400 mt-1 block">
                          {sentEmails.filter(e => e.status && typeof e.status === "string" && e.status.startsWith("Retrying")).length} Queued
                        </span>
                      </div>
                      <div className="bg-amber-950/15 border border-amber-500/10 p-3 rounded-xl">
                        <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wide block">Spam Cooldown Blocks</span>
                        <span className="text-base font-black font-mono text-amber-400 mt-1 block">
                          {sentEmails.filter(e => e.status && typeof e.status === "string" && e.status.includes("Blocked")).length} Shielded
                        </span>
                      </div>
                    </div>

                    {/* Telegram Connection Credentials display */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-4.5 mb-6 text-left">
                      <div className="flex-grow">
                        <label className="text-[10px] font-extrabold text-[#38BDF8] uppercase tracking-widest block mb-1">
                          CONNECTED TELEGRAM BOT TARGET CHAT
                        </label>
                        <div className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-slate-300 transition-all font-bold mt-1.5 flex justify-between items-center sm:gap-2">
                          <span className="text-[#38BDF8]">Chat ID: 8661147262</span>
                          <span className="text-[9px] uppercase tracking-wider font-extrabold bg-[#38BDF8]/10 text-[#38BDF8] px-2 py-0.5 rounded border border-[#38BDF8]/20">Target Authorized</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center max-w-sm">
                        <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider block">Discipline Broadcasts</span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                          Dispatches real-time active alert protocols and streak incinerations directly to the secure Telegram communication bridge!
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-center justify-between gap-4 mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-slate-300 font-medium font-bold">Resend Gateway status:</span>
                        <span className="text-xs font-black font-mono text-blue-400">Ready</span>
                      </div>
                      <span className="text-2xs font-mono text-slate-400 font-extrabold uppercase bg-white/5 px-2 py-0.5 rounded">Status: {inboxStatus}</span>
                    </div>

                    {sentEmails.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl bg-white/2" id="empty-inbox">
                        <Mail className="w-9 h-9 text-slate-500 mx-auto mb-3 animate-pulse" />
                        <p className="text-xs font-bold text-slate-300">Outbound transmission logs queue is empty.</p>
                        <p className="text-2xs text-slate-500 mt-1 max-w-xs mx-auto">Emails will catalogue here automatically with feedback states whenever goals fail or recovery challenges are dispatched.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 font-sans" id="simulated-emails-list">
                        {sentEmails.map((email) => {
                          const isDelivered = email.status === "Delivered";
                          const isBlocked = email.status && typeof email.status === "string" && email.status.includes("Blocked");
                          const isRetrying = email.status && typeof email.status === "string" && email.status.startsWith("Retrying");
                          const isFailed = !isDelivered && !isBlocked && !isRetrying;

                          return (
                            <div
                              key={email.id}
                              className={`border rounded-xl p-4.5 text-left transition-all ${
                                isDelivered 
                                  ? "bg-emerald-950/5 border-emerald-500/10" 
                                  : isBlocked 
                                    ? "bg-amber-950/5 border-amber-500/10" 
                                    : isRetrying
                                      ? "bg-orange-950/5 border-orange-500/15 animate-pulse"
                                      : "bg-red-950/5 border-red-500/10"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3 mb-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded ${
                                      email.type === "PUNISHMENT_ACTIVATED" 
                                        ? "bg-red-500/15 text-red-400 border border-red-500/20" 
                                        : email.type === "STREAK_BROKEN"
                                          ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                                          : email.type === "RUNNING_INCOMPLETE"
                                            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                                            : email.type === "STUDY_SKIPPED"
                                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                              : email.type === "ROUTINE_MISSED"
                                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                                : "bg-slate-500/15 text-slate-400 border border-slate-500/10"
                                    }`}>
                                      {email.type || "GENERAL_TELEMETRY"}
                                    </span>
                                    <h4 className="text-xs font-black text-slate-100 tracking-tight">
                                      {email.subject}
                                    </h4>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    Destination Inbox: <span className="text-slate-200 font-bold">{email.email}</span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between">
                                  <span className="text-2xs font-mono text-slate-500">
                                    {new Date(email.timestamp).toLocaleTimeString()}
                                  </span>

                                  {/* Premium custom status badges */}
                                  {isDelivered && (
                                    <span className="bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded font-mono">
                                      ✓✓ DELIVERED
                                    </span>
                                  )}
                                  {isBlocked && (
                                    <span className="bg-amber-950 border border-amber-500/30 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded font-mono">
                                      ⚠ SHIELD BLOCKED
                                    </span>
                                  )}
                                  {isRetrying && (
                                    <span className="bg-orange-950 border border-orange-500/40 text-orange-400 text-[9px] font-black px-2 py-0.5 rounded font-mono flex items-center gap-1">
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                      {email.status.toUpperCase()}
                                    </span>
                                  )}
                                  {isFailed && (
                                    <span className="bg-red-950 border border-red-500/30 text-red-400 text-[9px] font-black px-2 py-0.5 rounded font-mono">
                                      ✗ SYSTEM FAILURE
                                    </span>
                                  )}

                                  {/* Manual force trigger retry buttons on error logs */}
                                  {(isFailed || isBlocked || isRetrying) && (
                                    <button
                                      onClick={() => handleManualRetry(email.id)}
                                      className="p-1 px-2.5 bg-blue-650 hover:bg-blue-600 border border-blue-500/20 text-white font-black text-[9px] uppercase tracking-wider rounded transition-all hover:scale-105 active:scale-95"
                                      title="Manual Dispatch Bypass Cooldown retry loop"
                                    >
                                      FORCE SEND
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 font-sans leading-relaxed block pl-1">
                                <strong>{email.title}</strong> — {email.body}
                              </p>

                              {/* Collapsible Telemetry System Payload Log info */}
                              <div className="mt-3 bg-black/40 border border-white/5 rounded-lg p-2.5 font-mono text-[10px] text-slate-400">
                                <span className="text-slate-500 font-bold block mb-1">SYSTEM API TELEMETRY LOG:</span>
                                <p className="text-slate-300 break-words whitespace-pre-wrap">{email.apiLog || "No logs record bound."}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* GUARDIAN SETTINGS / CONFIGURATOR PANEL */}
              {activeTab === "settings" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col gap-6"
                >
                  {/* Gemini setup card */}
                  <div className="glass-panel rounded-2xl p-6 border-white/5 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Brain className="text-blue-500 w-5 h-5" />
                      Google Gemini API Configuration
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      The core Guardian platform uses our secure full-stack backend pipeline. If you want to supply your own custom Google Developer API credential, enter it here. Done keys are saved locally.
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <input
                        id="custom-apikey-field"
                        type="password"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="Google Developer API Key (AIzaSy...)"
                        className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500/50"
                      />
                      <button
                        id="save-apikey-btn"
                        onClick={handleSaveApiKey}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition"
                      >
                        Register Key
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-2xs text-slate-500 uppercase font-extrabold">Connection State:</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        <span className={`w-1.5 h-1.5 rounded-full ${apiKeyStatus === "Connected" ? "bg-emerald-400 shadow-sm" : "bg-slate-400"}`} />
                        <span className="text-2xs font-bold text-slate-300">{apiKeyStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Telegram & Alert controls */}
                  <div className="glass-panel rounded-2xl p-6 border border-white/10 text-left bg-slate-950/40 relative overflow-hidden shadow-[0_0_25px_rgba(14,165,233,0.1)]">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4 mb-5">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <Send className="text-sky-400 w-5 h-5 animate-pulse" />
                          Telegram Discipline Alert System
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-normal">
                          Advanced automated vigilance dispatcher. Direct integration with Roy No Rules Bot API.
                        </p>
                      </div>
                      
                      {/* Global Enable Switch */}
                      <button
                        onClick={() => setTelegramAlertsEnabled(!telegramAlertsEnabled)}
                        className={`px-4 py-2 rounded-xl border font-black text-2xs uppercase tracking-widest transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                          telegramAlertsEnabled 
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/35 shadow-[0_0_15px_rgba(14,165,233,0.15)]" 
                            : "bg-white/5 text-slate-400 border-white/10"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${telegramAlertsEnabled ? "bg-sky-400 animate-ping" : "bg-slate-500"}`} />
                        {telegramAlertsEnabled ? "Vigilance Active" : "System Offline"}
                      </button>
                    </div>

                    {/* Alert Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      
                      {/* Frequency Setting */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest block mb-1">
                            Alert Frequency
                          </span>
                          <p className="text-[11px] text-slate-400 leading-normal mb-3">
                            Time delay of repeating check alerts if targets remain incomplete for the day.
                          </p>
                        </div>
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 gap-1">
                          {(["30min", "1hr", "2hr"] as const).map((freq) => (
                            <button
                              key={freq}
                              onClick={() => setAlertFrequency(freq)}
                              className={`flex-1 py-1.5 rounded-lg font-black text-2xs uppercase tracking-wider transition-all cursor-pointer ${
                                alertFrequency === freq 
                                  ? "bg-sky-500/15 text-sky-300 border border-sky-500/20" 
                                  : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {freq === "30min" ? "30 Min" : freq === "1hr" ? "1 Hour" : "2 Hours"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Silent Protocol Setup */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block mb-1">
                            Silent Delivery Protocol
                          </span>
                          <p className="text-[11px] text-slate-400 leading-normal mb-3">
                            Mute alert audio & vibration on your phone receiver while keeping vigilance dispatches active.
                          </p>
                        </div>
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 gap-1">
                          <button
                            onClick={() => setTelegramSilentMode(true)}
                            className={`flex-1 py-1.5 rounded-lg font-black text-2xs uppercase tracking-wider transition-all cursor-pointer ${
                              telegramSilentMode 
                                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20" 
                                : "text-slate-500 hover:text-slate-305"
                            }`}
                          >
                            Silent
                          </button>
                          <button
                            onClick={() => setTelegramSilentMode(false)}
                            className={`flex-1 py-1.5 rounded-lg font-black text-2xs uppercase tracking-wider transition-all cursor-pointer ${
                              !telegramSilentMode 
                                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20" 
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Standard Sound
                          </button>
                        </div>
                      </div>

                      {/* Motivation Intensity Selector */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block mb-1">
                            Motivation Intensity
                          </span>
                          <p className="text-[11px] text-slate-400 leading-normal mb-3">
                            Tailor aggression of broadcast messages. Stronger factors utilize stricter tones.
                          </p>
                        </div>
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 gap-1">
                          {(["low", "medium", "high"] as const).map((intensity) => (
                            <button
                              key={intensity}
                              onClick={() => setMotivationIntensity(intensity)}
                              className={`flex-1 py-1.5 rounded-lg font-black text-2xs uppercase tracking-wider transition-all cursor-pointer ${
                                motivationIntensity === intensity 
                                  ? intensity === "high"
                                    ? "bg-red-500/15 text-red-300 border border-red-500/20"
                                    : intensity === "medium"
                                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                                    : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                                  : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {intensity}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Bot Integration Telemetry Details */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between p-4 bg-slate-950/60 rounded-xl border border-white/5">
                      <div className="flex-grow max-w-md">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">
                          TELEMETRY METADATA CONNECTION
                        </label>
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex justify-between items-center text-xs bg-slate-950/70 border border-white/5 rounded-lg px-3 py-1.5 font-mono text-slate-300">
                            <span className="text-slate-500 font-extrabold uppercase text-[9px] tracking-wide">Secure Bot ID</span>
                            <span className="text-sky-400 font-bold">8702263976 (Roy No Rules Bot)</span>
                          </div>
                          <div className="flex justify-between items-center text-xs bg-slate-950/70 border border-white/5 rounded-lg px-3 py-1.5 font-mono text-slate-300">
                            <span className="text-slate-500 font-extrabold uppercase text-[9px] tracking-wide">Target Chat ID</span>
                            <span className="text-sky-400 font-bold">8661147262</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 justify-end self-end sm:self-auto w-full md:w-auto">
                        <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-left mb-1 sm:min-w-[190px]">
                          <span className="text-[9px] font-bold text-slate-500 block uppercase font-mono tracking-widest">SCHEDULING STATE</span>
                          <span className="text-2xs font-extrabold text-slate-300 font-mono mt-1 block">
                            Last Transmit: <span className="text-sky-400">{lastAutoAlertTime > 0 ? new Date(lastAutoAlertTime).toLocaleTimeString() : "None"}</span>
                          </span>
                          <span className="text-2xs font-extrabold text-slate-300 font-mono mt-0.5 block">
                            Automatic loop: <span className="text-emerald-400">ACTIVE (10s sync)</span>
                          </span>
                        </div>

                        <button
                          id="test-telegram-btn"
                          disabled={isTelegramLoading}
                          onClick={sendManualTelegramTestAlert}
                          className={`w-full md:w-auto px-5 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(14,165,233,0.2)] ${isTelegramLoading ? 'opacity-60 cursor-not-allowed select-none' : 'active:scale-95 cursor-pointer'}`}
                        >
                          {isTelegramLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-200" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-sky-200 animate-pulse" />
                              <span>Send Telegram Test Alert</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Performance & Particles Configuration */}
                  <div className="glass-panel rounded-2xl p-6 border-white/5 text-left transition-all duration-300">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-1">
                      <Sparkles className="text-cyan-400 w-5 h-5 animate-pulse" />
                      Ambient Ambiance & Performance Tuning
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Adjust floating active atmosphere particles to align with your device's capabilities. Lowering intensities improves frame rates and reduces battery consumption, especially on lower-end mobile devices.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-white/5 gap-4">
                      <div>
                        <span className="text-xs font-black text-cyan-400 block uppercase tracking-wide">Ambiance Particle Density</span>
                        <p className="text-[11px] text-slate-400 leading-normal mt-1">
                          Current Setting: <span className="font-bold text-white uppercase">{particleDensity}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5 font-sans">
                        {(["off", "low", "medium", "high"] as const).map((density) => (
                          <button
                            key={density}
                            onClick={() => {
                              setParticleDensity(density);
                              localStorage.setItem("guardian_particle_density", density);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider font-extrabold transition-all duration-200 cursor-pointer ${
                              particleDensity === density
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)] scale-[1.02]"
                                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                          >
                            {density}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-6 border-white/5 text-left">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-1">
                      <X className="text-red-500 w-5 h-5" />
                      Simulator Testing Suite
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 tracking-normal">
                      Perfect to test out the visual feedback loop of the discipline engine.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Punishment Simulator */}
                      <div className="p-4 bg-slate-950/30 rounded-xl border border-white/5 text-left">
                        <span className="text-xs font-black text-rose-400 block uppercase">Simulate Punishment Mode</span>
                        <p className="text-[11px] text-slate-400 leading-normal mt-1 mb-3">Forces UI into red flashing emergency mode, breaks streaks, and deducts point milestones instantly.</p>
                        <button
                          id="simulate-punishment-trigger"
                          onClick={triggerGuardianPunish}
                          className="px-3.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/10 font-bold text-xs uppercase tracking-widest rounded-lg"
                        >
                          Trigger Punishment
                        </button>
                      </div>

                      {/* Fresh Profile Trigger */}
                      <div className="p-4 bg-slate-950/30 rounded-xl border border-white/5 text-left">
                        <span className="text-xs font-black text-yellow-400 block uppercase">Gift Points Balance</span>
                        <p className="text-[11px] text-slate-400 leading-normal mt-1 mb-3">Inject +100 point credits immediately to elevate your ranking tier to Vanguard levels.</p>
                        <button
                          id="reward-points-trigger"
                          onClick={async () => {
                            const newP = (profile?.points || 0) + 100;
                            await updateProfileInDocument({ points: newP });
                            triggerSparkles();
                          }}
                          className="px-3.5 py-1.5 bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-500/10 font-bold text-xs uppercase tracking-widest rounded-lg"
                        >
                          Award +100 Points
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </main>
        )}
      </div>

      {/* Floating Bottom Glass Navigation Dock */}
      {profile && (
        <div className="fixed bottom-6 left-0 right-0 mx-auto z-40 max-w-[620px] px-4 font-sans pointer-events-none animate-fade-in">
          <div className="relative pointer-events-auto">
            {/* Main Dock bar */}
            <div className="w-full glass-panel bg-slate-950/85 border border-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex justify-around items-center h-16 relative">
              
              {/* Home button */}
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "home" ? "text-cyan-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Home className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] uppercase tracking-wider font-bold leading-none">Home</span>
                {activeTab === "home" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Dashboard button */}
              <button
                onClick={() => setActiveTab("fitness")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "fitness" ? "text-cyan-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Activity className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] uppercase tracking-wider font-bold leading-none">Dashboard</span>
                {activeTab === "fitness" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Targets button */}
              <button
                onClick={() => setActiveTab("routine")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "routine" ? "text-cyan-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] uppercase tracking-wider font-bold leading-none">Targets</span>
                {activeTab === "routine" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Streak System / Leaderboard button */}
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "leaderboard" ? "text-cyan-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <TrendingUp className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] uppercase tracking-wider font-bold leading-none">Streaks</span>
                {activeTab === "leaderboard" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Motivation button */}
              <button
                onClick={() => setActiveTab("motivation")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "motivation" ? "text-violet-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Brain className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] uppercase tracking-wider font-bold leading-none">Mind</span>
                {activeTab === "motivation" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.9)]" />
                )}
              </button>

              {/* Alerts Logs / History button */}
              <button
                onClick={() => setActiveTab("history")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "history" ? "text-cyan-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <BarChart2 className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] uppercase tracking-wider font-bold leading-none">Alerts</span>
                {activeTab === "history" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Control Settings button */}
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "settings" ? "text-cyan-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Settings className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] uppercase tracking-wider font-bold leading-none">Control</span>
                {activeTab === "settings" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Futuristic Bottom Footer styling */}
      <footer id="main-footer" className="w-full py-10 px-6 text-center z-10 font-sans mt-auto pb-28 md:pb-24">
        <div className="max-w-7xl mx-auto flex flex-col justify-center items-center gap-2">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse pointer-events-none" />
            <p className="relative font-black tracking-[0.18em] uppercase text-[11px] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-200 to-indigo-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.35)] select-none">
              Powered by Roy No Rules
            </p>
          </div>
          <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-1.5 flex items-center gap-2">
            <span>SINCE 2026</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 animate-ping" />
            <span>SECURE TRANSCEIVER ACTIVE</span>
          </div>
        </div>
      </footer>

      {/* Dynamic Popups Hub */}
      <AnimatePresence>
        {isMotivationModalOpen && (
          <div key="motivation-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMotivationModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              id="motivation-modal-backdrop"
            />

            {/* Glowing Aura Spheres in Backdrop */}
            <div className="absolute w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none animate-pulse" />
            <div className="absolute w-[250px] h-[250px] bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Modal Body Container */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-slate-900/90 border border-indigo-500/35 shadow-[0_0_60px_rgba(99,102,241,0.3)] rounded-2xl md:rounded-3xl p-6 md:p-8 backdrop-blur-2xl z-10 text-left overflow-hidden"
              id="motivation-modal-container"
            >
              {/* Spinning gradient neon outer ring */}
              <div className="absolute inset-0 moving-border-gradient opacity-15 blur-sm pointer-events-none -z-10" />
              <div className="absolute inset-[1.5px] bg-slate-950/95 rounded-[15px] md:rounded-[23px] -z-10" />

              {/* Corner decorative bracket aesthetics */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500/60 rounded-tl-2xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500/60 rounded-tr-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500/60 rounded-bl-2xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500/60 rounded-br-2xl pointer-events-none" />

              {/* Close Button at Top Right */}
              <button
                onClick={() => setIsMotivationModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition duration-200 cursor-pointer"
                id="motivation-modal-close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="mb-6 flex items-center gap-3 font-sans">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                  <Brain className="w-5.5 h-5.5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-white uppercase tracking-wider">
                    Guardian AI Motivation Chamber
                  </h3>
                  <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase mt-0.5">
                    RECALIBRATING FORTITUDE COEFFICIENTS
                  </p>
                </div>
              </div>

              {/* Language Selection Grid */}
              <div className="mb-6 font-sans">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-2.5">
                  Select Focus Language:
                </span>
                <div className="grid grid-cols-3 gap-2.5" id="modal-language-options">
                  {(["English", "Hindi", "Hinglish"] as const).map((lang) => {
                    const isSelected = motivationLanguage === lang;
                    return (
                      <button
                        key={lang}
                        onClick={() => {
                          setMotivationLanguage(lang);
                          generateModalMotivation(lang);
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border flex flex-col items-center justify-center gap-1 relative cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-b from-indigo-900/60 to-indigo-950/80 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.02]"
                            : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-white/10"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                        <span className="font-sans text-xs">{lang}</span>
                        <span className="text-[8px] opacity-60 font-mono font-medium lowercase">
                          {lang === "English" ? "standard" : lang === "Hindi" ? "bhartiya" : "conversational"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Display Board Area */}
              <div className="relative mb-6 rounded-2xl bg-black/60 border border-slate-800/80 p-5 md:p-6 min-h-[140px] flex flex-col justify-center items-center overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl" />

                {isGeneratingModalMotivation ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-6 w-full text-center">
                    <div className="relative flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-indigo-300 tracking-widest animate-pulse font-sans">
                        Querying Neural Network...
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Server Pipeline Active
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full relative z-10 font-sans">
                    <div className="text-[9px] font-mono font-bold text-indigo-400/80 mb-2 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Decrypted Fortitude Phrase
                    </div>
                    
                    <p className="text-xs sm:text-sm md:text-base font-black italic tracking-wide text-slate-100 font-sans leading-relaxed">
                      "{modalMotivation || motivationQuote || "Tap language options to initialize transmission."}"
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>STREAK: {profile?.streak || 0} DAYS</span>
                      <span className="uppercase text-indigo-400 font-extrabold">{selectedMood} PROTOCOL ONBOARD</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar Grid with neon button effects */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-2 font-sans" id="modal-interactive-controls">
                {/* COPY */}
                <button
                  onClick={async () => {
                    const text = modalMotivation || motivationQuote;
                    if (!text) return;
                    try {
                      await navigator.clipboard.writeText(text);
                      setEmailNotificationToast({
                        message: "Tactical Quote Copied",
                        submessage: "Motivation template stored in system buffer.",
                        type: "success"
                      });
                    } catch (err) {
                      console.error("Clipboard copy failed:", err);
                    }
                  }}
                  disabled={isGeneratingModalMotivation}
                  className="px-4 py-3 bg-slate-950/60 hover:bg-slate-950/90 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] active:scale-95"
                  id="modal-copy-btn"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>

                {/* SHARE */}
                <button
                  onClick={async () => {
                    const text = modalMotivation || motivationQuote;
                    if (!text) return;
                    const shareText = `🔥 Guardian AI Motivation:\n\n"${text}"\n\nConsistency is power. Keep grinding! 💪`;
                    
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: "Guardian Discipline quote",
                          text: shareText,
                        });
                      } catch (err) {
                        console.log("Share skipped:", err);
                      }
                    } else {
                      try {
                        await navigator.clipboard.writeText(shareText);
                        setEmailNotificationToast({
                          message: "Prepared for Whatsapp/Socials!",
                          submessage: "Formated message copied. Tap paste in Telegram, Instagram or Whatsapp!",
                          type: "success"
                        });
                      } catch (copyErr) {
                        console.error(copyErr);
                      }
                    }
                  }}
                  disabled={isGeneratingModalMotivation}
                  className="px-4 py-3 bg-slate-950/60 hover:bg-slate-950/90 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] active:scale-95"
                  id="modal-share-btn"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                {/* REGENERATE */}
                <button
                  onClick={() => generateModalMotivation()}
                  disabled={isGeneratingModalMotivation}
                  className="col-span-2 md:col-span-1 px-4 py-3 bg-gradient-to-r from-indigo-650 to-indigo-600 hover:from-indigo-600 hover:to-indigo-550 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_18px_rgba(99,102,241,0.35)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:brightness-110"
                  id="modal-regenerate-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingModalMotivation ? "animate-spin" : ""}`} />
                  <span>Regenerate</span>
                </button>
              </div>

              {/* Close Button styling */}
              <div className="mt-5 pt-3.5 border-t border-white/5 flex justify-end font-sans">
                <button
                  onClick={() => setIsMotivationModalOpen(false)}
                  className="px-4 py-2 bg-slate-950/20 hover:bg-slate-950/40 border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200 font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition duration-200 cursor-pointer"
                  id="modal-bottom-close"
                >
                  Close Chamber
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Telegram Quantum Dispatch Loading Overlay */}
        {isTelegramLoading && (
          <motion.div
            key="telegram-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md"
          >
            <div className="relative flex items-center justify-center p-8 rounded-3xl bg-slate-900/40 border border-white/5 shadow-2xl overflow-hidden max-w-xs w-full text-center">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse" />
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-12 h-12 text-sky-400 animate-spin" />
                <p className="text-sm font-black uppercase text-sky-300 tracking-widest animate-pulse font-sans">
                  Transmitting...
                </p>
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                  DISPATCHING VIGILANCE TELEGRAM ALERT VIA SECURE BOT CHAT INTEGRATION
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Telegram Success Popup Modal */}
        {telegramSuccessModal && (
          <motion.div
            key="telegram-success-popup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900/90 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] rounded-3xl p-6 md:p-8 text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-wider mb-2 font-sans leading-tight">
                Roy Routine Telegram Alert Sent Successfully
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans">
                The rigid monitoring notification check was safely completed and broadcasted to Telegram. Perfect connection.
              </p>
              <button
                onClick={() => setTelegramSuccessModal(false)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition duration-200 active:scale-95 shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_18px_rgba(16,185,129,0.35)] cursor-pointer"
              >
                Dismiss Verification
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Telegram Failure Popup Modal */}
        {telegramFailureModal && (
          <motion.div
            key="telegram-failure-popup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900/90 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.25)] rounded-3xl p-6 md:p-8 text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-wider mb-2 font-sans leading-tight">
                Discipline Alert Broadcast Failed
              </h3>
              <p className="text-xs text-red-400/90 mb-3 font-mono uppercase tracking-widest text-[9px]">
                Error: {telegramModalError || "Spam throttle Active"}
              </p>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans">
                Could not connect to Telegram Bot API. Please check internet connection, authorization tokens or egress firewall.
              </p>
              <button
                onClick={() => setTelegramFailureModal(false)}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition duration-150 active:scale-95 shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
              >
                Acknowledge Failure
              </button>
            </motion.div>
          </motion.div>
        )}

        {showTelegramConnectModal && (
          <motion.div
            key="telegram-connect-setup-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900/90 border border-sky-500/30 shadow-[0_0_50px_rgba(14,165,233,0.2)] rounded-3xl p-6 md:p-8 overflow-hidden text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 to-transparent pointer-events-none" />
              
              <button 
                onClick={() => {
                  stopTelegramPolling();
                  setShowTelegramConnectModal(false);
                }}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                <Send className="w-6 h-6 -rotate-12 translate-x-[-1px]" />
              </div>

              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2 font-sans">
                Telegram Link Integration
              </h3>
              
              {telegramConnected ? (
                <div className="space-y-4 my-4">
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 justify-center text-emerald-400 font-mono text-xs uppercase tracking-widest font-black mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Neural Link Secure
                    </div>
                    <p className="text-xs text-slate-300 font-sans">
                      Your app is connected to <b>@{botUsername}</b>!
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-2">
                      TELEGRAM CHAT_ID: <span className="text-slate-300 font-bold">{telegramChatId}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={sendManualTelegramTestAlert}
                      disabled={isTelegramLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-550 hover:to-sky-450 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTelegramLoading ? 'animate-spin' : ''}`} />
                      Send System Diagnostic Check
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Disconnect Telegram bot authorization? You will stop receiving routine alerts.")) {
                          setTelegramConnected(false);
                          setTelegramChatId("");
                          setEmailNotificationToast({
                            message: "Telegram Link Severed",
                            submessage: "Auth keys revoked successfully.",
                            type: "success"
                          });
                        }
                      }}
                      className="w-full py-2.5 bg-rose-950/20 border border-rose-500/25 text-rose-450 hover:bg-rose-900/30 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
                    >
                      Revoke Authorization Node
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 my-4">
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Synchronize your Roy Routine checklist with our live bot to receive real-time discipline alert warnings and reports.
                  </p>

                  {isVerifyingTelegram ? (
                    <div className="p-6 bg-slate-950/40 border border-sky-500/20 rounded-2xl space-y-4 relative overflow-hidden">
                      <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-sky-500/20" />
                        <div className="absolute inset-0 rounded-full border border-t-sky-400 animate-spin" />
                        <Send className="w-4 h-4 text-sky-400 -rotate-12 translate-x-[-1px]" />
                      </div>
                      
                      <div className="text-center">
                        <h4 className="text-xs font-black text-sky-400 font-mono uppercase tracking-widest animate-pulse mb-1">
                          Neural Handshake Active
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Awaiting commands from Telegram...
                        </p>
                        <p className="text-[9px] text-slate-600 font-mono leading-relaxed mt-2 uppercase">
                          Scan Sync Code: <b>{telegramRegKey}</b>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={stopTelegramPolling}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition border border-white/5 cursor-pointer"
                      >
                        Abort Listener
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-left bg-slate-950/20 border border-white/5 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-black font-mono">1</span>
                          <span className="text-[11px] text-slate-350 leading-relaxed font-mono">Click the button below to launch our official <b>@{botUsername}</b> channel.</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-black font-mono">2</span>
                          <span className="text-[11px] text-slate-350 leading-relaxed font-mono">Tap the <b>START</b> prompt within your Telegram UI. Once detected, we will instantly link your account safely.</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const link = `https://t.me/${botUsername}?start=${telegramRegKey}`;
                          window.open(link, "_blank");
                          startTelegramPolling(telegramRegKey);
                        }}
                        className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-550 hover:to-blue-550 text-white font-extrabold text-sm uppercase tracking-widest rounded-xl transition border border-sky-400/20 hover:border-sky-400/40 cursor-pointer shadow-[0_4px_15px_rgba(14,165,233,0.15)] flex items-center justify-center gap-2"
                      >
                        <Send className="w-4.5 h-4.5 text-white -rotate-12 translate-x-[-1px]" />
                        Connect Telegram Bot Setup
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {emailNotificationToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-xl border backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-start gap-3 text-left ${
              emailNotificationToast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                : "bg-red-950/90 border-red-500/30 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
            }`}
          >
            <div className={`p-1.5 rounded-lg flex-shrink-0 ${
              emailNotificationToast.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}>
              {emailNotificationToast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              )}
            </div>
            <div className="flex-grow">
              <h4 className="text-xs font-extrabold uppercase tracking-widest">
                {emailNotificationToast.message}
              </h4>
              {emailNotificationToast.submessage && (
                <p className="text-[11px] opacity-80 leading-normal mt-1 font-sans">
                  {emailNotificationToast.submessage}
                </p>
              )}
            </div>
            <button
              onClick={() => setEmailNotificationToast(null)}
              className="text-slate-400 hover:text-white transition duration-150 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
