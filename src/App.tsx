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
  ChevronUp
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

  // Core App States
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentTheme, setCurrentTheme] = useState<TimeTheme>(TimeTheme.NIGHT);
  const [activeTab, setActiveTab] = useState<"home" | "routine" | "fitness" | "motivation" | "leaderboard" | "history" | "settings">("home");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Routine Form & Tasks states
  const [routineInput, setRoutineInput] = useState("");
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedMood, setSelectedMood] = useState<Mood>(Mood.MOTIVATED);
  const [motivationQuote, setMotivationQuote] = useState("Rise and hold your ground. Discipline is your weapon.");
  const [motivationLanguage, setMotivationLanguage] = useState<"English" | "Hindi" | "Hinglish">("English");
  const [loadingMotivation, setLoadingMotivation] = useState(false);

  // Gemini Setup state
  const [customApiKey, setCustomApiKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<"Not Configured" | "Connected" | "Error">("Not Configured");

  // Google Fit Simulation Dashboard states
  const [fitConnecting, setFitConnecting] = useState(false);
  const [isSimulatingSteps, setIsSimulatingSteps] = useState(false);

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
      if (!telegramAlertsEnabled || !profile || tasks.length === 0) return;

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

            // Call telegram send API
            const response = await fetch("https://api.telegram.org/bot8702263976:AAHkSItI-2YDwqo7URhSIwPTf4a0Z_yRK94/sendMessage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: "8661147262",
                text: formattedMessage,
                parse_mode: "HTML",
                disable_notification: telegramSilentMode
              })
            });

            const data = await response.json();
            const isOk = response.ok && data.ok;

            // Log
            const newLog = {
              id: `tg_auto_${Date.now()}`,
              email: "Telegram Chat ID: 8661147262",
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

            const response = await fetch("https://api.telegram.org/bot8702263976:AAHkSItI-2YDwqo7URhSIwPTf4a0Z_yRK94/sendMessage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: "8661147262",
                text: alertBodyFormatted,
                parse_mode: "HTML",
                disable_notification: telegramSilentMode
              })
            });

            const data = await response.json();
            const isOk = response.ok && data.ok;

            // Log
            const newLog = {
              id: `tg_auto_${Date.now()}`,
              email: "Telegram Chat ID: 8661147262",
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

  // Auth Observer Integration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsSandboxMode(false);
        await syncUserProfile(currentUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

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

  // Load user tasks from Firestore
  const loadUserTasks = (userId: string) => {
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

  // Perform Google Sign-In with popup
  const handleGoogleLogin = async () => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setIsSandboxMode(false);
    } catch (err: any) {
      console.error("Popup login failed: ", err);
      // In sandbox frames Popup might be blocked, offer clean anonymous bypass
      setAuthError("Sign-in process intercepted by iframe security. Initiating Secure Sandbox Mode.");
      setTimeout(() => {
        triggerSandboxMode();
      }, 1500);
    } finally {
      setLoadingAuth(false);
    }
  };

  const triggerSandboxMode = () => {
    setAuthError(null);
    loadSandboxFallback();
  };

  const handleLogout = async () => {
    if (isSandboxMode) {
      setProfile(null);
      setUser(null);
      return;
    }
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
    if (isSandboxMode || !profile) {
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

    if (isSandboxMode) {
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

      if (isSandboxMode || !profile) {
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
    const missed = tasks.filter(t => !t.completed).length;
    try {
      const response = await fetch("/api/motivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: selectedMood,
          streak: profile?.streak || 1,
          language: motivationLanguage,
          missedCount: missed,
          clientApiKey: customApiKey
        })
      });
      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json && json.quote) {
            setMotivationQuote(json.quote);
            setModalMotivation(json.quote);
          }
        } catch (parseErr) {
          console.warn("JSON parse failed in handleFetchMotivation, applying default fallback.", parseErr);
          const fallback = "Power belongs to those who show up. Continue the discipline.";
          setMotivationQuote(fallback);
          setModalMotivation(fallback);
        }
      }
    } catch (err) {
      console.error("Motivation API load failed", err);
    } finally {
      setLoadingMotivation(false);
    }
  };

  // Generate customized AI Motivation quote inside the interactive modal
  const generateModalMotivation = async (lang?: "English" | "Hindi" | "Hinglish") => {
    const selectedLang = lang || motivationLanguage;
    setIsGeneratingModalMotivation(true);
    const missed = tasks.filter(t => !t.completed).length;
    try {
      const response = await fetch("/api/motivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: selectedMood,
          streak: profile?.streak || 1,
          language: selectedLang,
          missedCount: missed,
          clientApiKey: customApiKey
        })
      });
      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json && json.quote) {
            setModalMotivation(json.quote);
            setMotivationQuote(json.quote);
          } else {
            throw new Error("Missing quote field");
          }
        } catch (parseErr) {
          console.warn("JSON parse failed in modal motivation:", parseErr);
          const fallback = "You limit yourself. Breakdown the walls and build discipline.";
          setModalMotivation(fallback);
          setMotivationQuote(fallback);
        }
      } else {
        const fallback = "You limit yourself. Breakdown the walls and build discipline.";
        setModalMotivation(fallback);
        setMotivationQuote(fallback);
      }
    } catch (err) {
      console.error("Modal motivation API call failed:", err);
      const fallback = "The mirror of discipline does not lie. Work harder today.";
      setModalMotivation(fallback);
      setMotivationQuote(fallback);
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

  // Fetch real/sandboxed Google Fit steps and stats from Express backend
  const fetchFitStatusFromServer = async () => {
    try {
      const res = await fetch("/api/fit/steps");
      if (res.ok) {
        const data = await res.json();
        
        // Check if there is active connection
        if (data.isFitConnected) {
          // Check for auto routine task completions
          let autoCompletedRunning = false;
          const ongoingTasks = [...tasks];
          for (const t of ongoingTasks) {
            if (t.category === "Running" && !t.completed && data.steps >= 5000) {
              t.completed = true;
              t.completedAt = new Date().toISOString();
              autoCompletedRunning = true;
              
              if (!isSandboxMode && profile) {
                await updateDoc(doc(db, "users", profile.uid, "tasks", t.id), {
                  completed: true,
                  completedAt: t.completedAt
                });
              }
            }
          }

          if (autoCompletedRunning) {
            triggerSparkles();
            sendTelegramAlert(
              "🏃 Running Routine Auto-Completed via Google Fit Sync!",
              "Discipline Detected!",
              `Google Fit reported ${data.steps} total steps today. Your running/fitness routine section was mathematically verified and marked completed.`
            );
          }

          await updateProfileInDocument({
            isFitConnected: true,
            fitSteps: data.steps,
            fitCalories: data.calories,
            fitDistance: data.distance,
            fitActiveMinutes: Math.round(data.steps / 110)
          });
        } else {
          await updateProfileInDocument({
            isFitConnected: false
          });
        }
      }
    } catch (e) {
      console.error("Failed to query Google Fit status from backend", e);
    }
  };

  // Run initial fetch on mount/profile load
  useEffect(() => {
    if (profile) {
      fetchFitStatusFromServer();
    }
  }, [profile?.uid, tasks.length]);

  // Setup message listener to catch OAUTH_AUTH_SUCCESS from our callback popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        fetchFitStatusFromServer();
        triggerSparkles();
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [profile, tasks]);

  // Handle manual/Google Fit sensor connection
  const toggleGoogleFitConnection = async () => {
    if (profile?.isFitConnected) {
      // Call disconnect endpoint
      try {
        await fetch("/api/fit/disconnect", { method: "POST" });
        await updateProfileInDocument({
          isFitConnected: false,
          fitSteps: 0,
          fitDistance: 0,
          fitCalories: 0,
          fitActiveMinutes: 0
        });
      } catch (err) {
        console.error("Disconnect error", err);
      }
    } else {
      setFitConnecting(true);
      try {
        const res = await fetch("/api/auth/google/url");
        if (res.ok) {
          const { url } = await res.json();
          // Open popup!
          const authWindow = window.open(url, "oauth_popup", "width=600,height=750");
          if (!authWindow) {
            alert("Please allow popups for this site to link Google Fit.");
          }
        }
      } catch (err) {
        console.error("Auth URL load error", err);
      } finally {
        setFitConnecting(false);
      }
    }
  };

  // Sync / Increment Google Fit simulation steps manually
  const simulateFitnessIncrement = async () => {
    if (!profile?.isFitConnected || isSimulatingSteps) return;
    setIsSimulatingSteps(true);
    
    try {
      const res = await fetch("/api/fit/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: 1500 })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Check for auto routine task completions
        let autoCompletedRunning = false;
        const ongoingTasks = [...tasks];
        for (const t of ongoingTasks) {
          if (t.category === "Running" && !t.completed && data.steps >= 5000) {
            t.completed = true;
            t.completedAt = new Date().toISOString();
            autoCompletedRunning = true;
            
            if (!isSandboxMode && profile) {
              await updateDoc(doc(db, "users", profile.uid, "tasks", t.id), {
                completed: true,
                completedAt: t.completedAt
              });
            }
          }
        }

        if (autoCompletedRunning) {
          triggerSparkles();
          sendTelegramAlert(
            "🏃 Running Routine Auto-Completed via Google Fit Sync!",
            "Discipline Detected!",
            `Google Fit reported ${data.steps} total steps today. Your running/fitness routine section was mathematically verified and marked completed.`
          );
        }

        await updateProfileInDocument({
          fitSteps: data.steps,
          fitDistance: data.distance,
          fitCalories: data.calories,
          fitActiveMinutes: Math.round(data.steps / 110),
          points: (profile.points || 0) + 15 // bonus points for moving
        });
      }
    } catch (err) {
      console.error("Simulated steps increase failed", err);
    } finally {
      setIsSimulatingSteps(false);
    }
  };

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
    setIsTelegramLoading(true);
    setInboxStatus("Dispatching...");

    let formattedMessage = "";
    if (type === "ROUTINE_MISSED" || type === "PUNISHMENT_ACTIVATED") {
      formattedMessage = `⚠ <b>Roy Routine Alert</b>\nToday's discipline target was missed.\n\n🔥 Your streak is weakening.\n⚡ Complete pending tasks now.\n🏆 Discipline creates legends.\n🚀 Come back stronger today.`;
    } else if (type === "STREAK_BROKEN") {
      formattedMessage = `🔥 <b>Roy Routine Alert: STREAK DESTROYED</b>\n\n${subject}\n\n⚡ ${body}\n\n🏆 Discipline creates legends.\n🚀 Come back stronger today.`;
    } else if (type === "TEST") {
      formattedMessage = `🔔 <b>Roy Routine - Telegram Test Alert</b>\n\n✅ Status: Telegram Alert System is now Online and active!\n⚙ Sync Code: 8702263976-8661147262\n⚡ Real-time secure telemetry dispatcher verified.`;
    } else if (type === "SUCCESS") {
      formattedMessage = `🌟 <b>Roy Routine - Target Completed</b>\n\n🎉 ${subject}\n\n🏆 <i>${title}</i>\n🚀 ${body}`;
    } else {
      formattedMessage = `⚠ <b>Roy Routine - Update</b>\n\n⚙ <b>Category:</b> ${type}\n⚡ <b>Report:</b> ${subject}\n\n<i>${body}</i>`;
    }

    try {
      const response = await fetch("https://api.telegram.org/bot8702263976:AAHkSItI-2YDwqo7URhSIwPTf4a0Z_yRK94/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "8661147262",
          text: formattedMessage,
          parse_mode: "HTML"
        })
      });

      const data = await response.json();
      const isOk = response.ok && data.ok;

      const newTelegramLog = {
        id: `tg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        email: "Telegram Chat ID: 8661147262",
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
        setTelegramModalError(data.description || "Telegram API rejected the send.");
        setTelegramFailureModal(true);
        setEmailNotificationToast({
          message: "Telegram Service Failure",
          submessage: data.description || "API rejection.",
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

                {/* Google Fit connected badge */}
                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-2xl transition shadow-xl ${
                    profile.isFitConnected ? "bg-emerald-950/20 border-emerald-500/20" : "bg-white/[0.02] border-white/10"
                  }`}
                >
                  <Heart className={`w-4.5 h-4.5 ${profile.isFitConnected ? "text-red-500 fill-red-500 animate-pulse" : "text-slate-500"}`} />
                  <div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none">GOOGLE FIT SYNC</div>
                    <div className={`text-[11px] font-black uppercase tracking-wide mt-0.5 ${profile.isFitConnected ? "text-emerald-400" : "text-slate-500"}`}>
                      {profile.isFitConnected ? "ACTIVE PROTOCOL" : "UNBOUNDED"}
                    </div>
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
                    {profile.isFitConnected && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0A0A0C] rounded-full" />
                    )}
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
                    className="p-2 ml-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
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

        {/* Guest / Non-Authenticated Welcome Experience */}
        <AnimatePresence>
          {!profile && !loadingAuth && (
            <motion.div 
              id="google-login-screen"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel rounded-3xl p-8 max-w-xl mx-auto my-12 text-center border-white/5 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 bg-rose-500" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20 bg-indigo-500" />
              
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/40 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <ShieldAlert className="text-blue-400 w-8 h-8" />
              </div>
              
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                ENTER THE SANCTUM
              </h2>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Guardian AI is a premium discipline compiler. Connect your account to generate custom study plans, auto-sync outdoor runs, maintain real streaks, and compete on the Global Leaderboard.
              </p>

              {authError && (
                <div id="auth-error-notif" className="mt-4 p-3 bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold leading-relaxed">
                  {authError}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  id="google-auth-trigger"
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google" className="w-5 h-5 bg-white p-0.5 rounded-full" />
                  Sign In with Google Auth
                </button>
                
                <button
                  id="sandbox-auth-trigger"
                  onClick={triggerSandboxMode}
                  className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-extrabold text-sm rounded-xl border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  Instant Developer Workspace Login
                </button>
              </div>

              <div className="mt-6 text-2xs text-slate-500 uppercase tracking-widest font-extrabold">
                Zero Configuration Sandbox Fallback Mode Enabled
              </div>
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-6 text-left"
              >
                {/* Cinematic Hero Card (Hero Guardian section) */}
                <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-500/20 to-purple-500/5 rounded-full blur-[90px] pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/10 rounded-full blur-[70px] pointer-events-none" />
                  
                  {/* Retro Grid Background inside hero card */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.015)_1px,_transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,_#000_70%,_transparent_100%)] opacity-40 pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        Guardian AI Companion Active
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-none text-white font-sans bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-200">
                        WILLPOWER MATRIX v2 // {profile.displayName.toUpperCase()}
                      </h2>
                      
                      {/* Interactive dynamic emotional feedback display */}
                      <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-slate-300 leading-relaxed font-sans max-w-lg">
                        <span className="text-[10px] uppercase font-mono tracking-widest font-extrabold text-cyan-400 block mb-1">
                          Live Guardian Coherence Telemetry
                        </span>
                        {(() => {
                          const done = tasks.filter(t => t.completed).length;
                          const total = tasks.length;
                          const rate = total ? Math.round((done / total) * 100) : 0;
                          if (isPunishedMode) {
                            return (
                              <span className="text-red-400 font-bold block">
                                "DEFICIT WARNING: Consistency index ruined. Stop the inertia and rebuild consistency immediately."
                              </span>
                            );
                          }
                          if (total === 0) {
                            return (
                              <span className="text-slate-400 block">
                                "The system queue is currently idle. Input a prompt to compile a rigorous list of daily actions."
                              </span>
                            );
                          }
                          if (rate >= 80) {
                            return (
                              <span className="text-emerald-400 font-bold block">
                                "Coherence profile outstanding. Your self-command is near absolute. Do not regress. Forge onwards."
                              </span>
                            );
                          }
                          if (rate > 0) {
                            return (
                              <span className="text-purple-400 font-bold block">
                                "Discipline index active. Continue execution targets until final routine termination is met."
                              </span>
                            );
                          }
                          return (
                            <span className="text-orange-400 font-bold block">
                              "Stagnation warning. Your active routine remains unchecked. Rise up and start now."
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        <div className="flex items-center gap-2 py-1 px-2.5 bg-black/40 border border-white/5 rounded-xl text-2xs font-mono text-slate-400 uppercase font-black">
                          <span className="text-cyan-400">RANK:</span> {profile.guardianRank}
                        </div>
                        <div className="flex items-center gap-2 py-1 px-2.5 bg-black/40 border border-white/5 rounded-xl text-2xs font-mono text-slate-400 uppercase font-black">
                          <span className="text-emerald-400">HEARTBEAT:</span> SECURE
                        </div>
                      </div>
                    </div>

                    {/* Floating Guardian Aura Animation inside hero layout */}
                    <div className="flex flex-col items-center justify-center relative w-28 h-28 md:w-32 md:h-32 flex-shrink-0" id="guardian-aura-node">
                      {/* Concentric spinning rings */}
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-500/15 animate-spin-slow" />
                      <div className="absolute inset-2.5 rounded-full border border-double border-indigo-500/25 animate-spin" style={{ animationDirection: "reverse", animationDuration: "10s" }} />
                      
                      {/* Pulsing aura glow dynamically mapping active completion states */}
                      <div className={`absolute inset-5 rounded-full transition-all duration-1000 blur-md ${
                        isPunishedMode 
                          ? "bg-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.6)]" 
                          : (() => {
                              const done = tasks.filter(t => t.completed).length;
                              const total = tasks.length;
                              const r = total ? Math.round((done / total) * 100) : 0;
                              if (r >= 80) return "bg-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-pulse";
                              if (r > 0) return "bg-purple-500/35 shadow-[0_0_20px_rgba(168,85,247,0.5)]";
                              return "bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.45)] animate-pulse";
                            })()
                      }`} />
                      
                      {/* Center core emitter node */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center relative z-10 border transition-all duration-1000 ${
                        isPunishedMode
                          ? "bg-red-950 border-red-500/70 text-red-400"
                          : (() => {
                              const done = tasks.filter(t => t.completed).length;
                              const total = tasks.length;
                              const r = total ? Math.round((done / total) * 100) : 0;
                              if (r >= 80) return "bg-emerald-950 border-emerald-500/70 text-emerald-400";
                              if (r > 0) return "bg-purple-950 border-purple-500/70 text-purple-400";
                              return "bg-cyan-950 border-cyan-500/70 text-cyan-400";
                            })()
                      }`} id="node-consciousness-core">
                        <Activity className={`w-4.5 h-4.5 ${isPunishedMode ? "animate-bounce" : "animate-pulse"}`} />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Quick Metrics & Daily Progress Bento (Pristine requested rows only) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                  {/* Live Indian Time & Date */}
                  <div className="glass-panel rounded-2xl p-5 border border-white/5 bg-slate-900/40 flex flex-col justify-between" id="ist-timezone-card">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Secure Time Protocols</span>
                      <Clock className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                    </div>
                    <div>
                      <span className="text-2xs font-mono font-bold text-cyan-400 tracking-wider block">INDIAN STANDARD TIME (IST)</span>
                      <h3 className="text-xl font-black font-mono text-white tracking-widest mt-1 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                        {currentTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {currentTime.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Daily Streak Indicator */}
                  <div className="glass-panel rounded-2xl p-5 border border-white/5 bg-slate-900/40 flex flex-col justify-between" id="active-streak-multiplier-card">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Streak Control Matrix</span>
                      <Flame className="text-orange-500 w-4 h-4 streak-fire-anim" />
                    </div>
                    <div>
                      <span className="text-2xs font-mono font-bold text-orange-400 tracking-wider block">CONSISTENCY STREAK</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black font-mono text-orange-400">
                          {profile.streak} Days
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">ACTIVE</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mt-1 leading-none">
                        MAX STREAK: {profile.maxStreak || profile.streak} DAYS
                      </span>
                    </div>
                  </div>

                  {/* Today's Daily Progress Ring */}
                  <div className="glass-panel rounded-2xl p-5 border border-white/5 bg-slate-900/40 flex flex-col justify-between" id="discipline-meter-card">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Integrity Coefficient</span>
                      <CheckCircle2 className="text-emerald-500 w-4 h-4 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="18" className="stroke-white/[0.05]" strokeWidth="3.5" fill="transparent" />
                          <circle
                            cx="24"
                            cy="24"
                            r="18"
                            className="stroke-emerald-500 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            strokeWidth="3.5"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 18}
                            strokeDashoffset={(2 * Math.PI * 18) - ((tasks.length ? (tasks.filter(t => t.completed).length / tasks.length) : 0) * (2 * Math.PI * 18))}
                          />
                        </svg>
                        <span className="absolute text-[10px] font-black text-emerald-400 font-mono">
                          {Math.round(tasks.length ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">
                          {tasks.filter(t => t.completed).length} of {tasks.length} Done
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 tracking-wider uppercase font-bold">RECOVERY SAFETY MULTIPLIER</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotional AI Motivation Card with direct language buttons & popup chamber */}
                <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 relative overflow-hidden text-left font-sans" id="homepage-ai-motivator">
                  <div className="absolute -right-36 -top-36 w-72 h-72 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-cyan-500/30 via-indigo-500/30 to-transparent pointer-events-none" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-grow space-y-2">
                      <div className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                        AI MOTIVATIONAL SENSORY EMISSION ({motivationLanguage})
                      </div>
                      <p className="text-sm md:text-base font-black italic text-slate-100 font-sans tracking-tight leading-relaxed max-w-xl">
                        "{motivationQuote || "Discipline equals freedom. There are no shortcuts."}"
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                        GENERATED BY SECURE NEURAL FLOW PIPELINE
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 min-w-[200px] justify-center">
                      <button
                        onClick={() => {
                          setIsMotivationModalOpen(true);
                          if (generateModalMotivation) {
                            setModalMotivation(""); 
                            generateModalMotivation(motivationLanguage);
                          }
                        }}
                        className="px-4.5 py-2.5 bg-gradient-to-r from-indigo-650 to-indigo-600 hover:from-indigo-600 hover:to-indigo-550 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-indigo-650/10 hover:shadow-indigo-650/20 active:scale-95 text-center flex items-center justify-center gap-2"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        Choose Motivation Language
                      </button>

                      <div className="flex items-center justify-around bg-black/40 border border-white/5 rounded-xl py-2 px-3">
                        {(["English", "Hindi", "Hinglish"] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={async () => {
                              setMotivationLanguage(lang);
                              setLoadingMotivation(true);
                              try {
                                const response = await fetch(`/api/motivation?language=${lang}`);
                                if (response.ok) {
                                  const text = await response.text();
                                  try {
                                    const d = JSON.parse(text);
                                    if (d && d.quote) {
                                      setMotivationQuote(d.quote);
                                    }
                                  } catch (parseErr) {
                                    console.warn("JSON parse failed in language select:", parseErr);
                                  }
                                }
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setLoadingMotivation(false);
                              }
                            }}
                            className={`text-[9.5px] font-black uppercase py-0.5 px-2 rounded transition cursor-pointer ${
                              motivationLanguage === lang 
                                ? "bg-indigo-550 text-white border border-indigo-500/30" 
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {lang === "English" ? "EN" : lang === "Hindi" ? "HI" : "Hinglish"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Action Shortcut Buttons Grid (Quick start buttons) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-2 font-sans" id="home-shortcuts-toolbar">
                  <button
                    onClick={() => setActiveTab("routine")}
                    className="p-5 bg-slate-900/30 hover:bg-slate-900/60 transition border border-white/5 hover:border-cyan-500/20 rounded-2xl text-left cursor-pointer group hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] active:scale-97 flex flex-col justify-between"
                  >
                    <Brain className="w-5 h-5 text-cyan-400 mb-4 group-hover:scale-110 transition" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Daily Targets</h4>
                      <span className="text-[10px] text-slate-500 font-mono tracking-tight block mt-0.5">Control Daily Checks</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("fitness")}
                    className="p-5 bg-slate-900/30 hover:bg-slate-900/60 transition border border-white/5 hover:border-orange-500/20 rounded-2xl text-left cursor-pointer group hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] active:scale-97 flex flex-col justify-between"
                  >
                    <Activity className="w-5 h-5 text-orange-400 mb-4 group-hover:scale-110 transition" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Progress Analytics</h4>
                      <span className="text-[10px] text-slate-500 font-mono tracking-tight block mt-0.5">Track &amp; Analyze Progress</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("history")}
                    className="p-5 bg-slate-900/30 hover:bg-slate-900/60 transition border border-white/5 hover:border-purple-500/20 rounded-2xl text-left cursor-pointer group hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] active:scale-97 flex flex-col justify-between"
                  >
                    <BarChart2 className="w-5 h-5 text-purple-400 mb-4 group-hover:scale-110 transition" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Discipline Alerts</h4>
                      <span className="text-[10px] text-slate-500 font-mono tracking-tight block mt-0.5">View Transmission Logs</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("settings")}
                    className="p-5 bg-slate-900/30 hover:bg-slate-900/60 transition border border-white/5 hover:border-emerald-500/20 rounded-2xl text-left cursor-pointer group hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] active:scale-97 flex flex-col justify-between"
                  >
                    <Settings className="w-5 h-5 text-emerald-400 mb-4 group-hover:scale-110 transition" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider block">Guardian Settings</h4>
                      <span className="text-[10px] text-slate-500 font-mono tracking-tight block mt-0.5">Discipline Transmissions</span>
                    </div>
                  </button>
                </div>
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
                      GPS Running Track & Google Fit Integrator
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      Connect Google Fit to automatically synchronize daily activity sensors. Or start the real GPS Runner tracking to register road runs with exact mathematical metrics and earn direct reward points.
                    </p>

                    {/* Fit OAuth Button Controls */}
                    <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-dashed border-white/10 rounded-xl bg-white/2">
                      <div className="flex items-center gap-3">
                        <Activity className="text-orange-400 w-8 h-8" />
                        <div>
                          <span className="text-xs font-extrabold text-white block">Google Fit Sync Status</span>
                          <span className={`text-2xs font-mono font-bold ${profile.isFitConnected ? "text-emerald-400" : "text-slate-500"}`}>
                            {profile.isFitConnected ? "CONNECTED • REAL-TIME FETCHING" : "DISCONNECTED • UNHEALTHY MULTIPLIERS"}
                          </span>
                        </div>
                      </div>

                      <button
                        id="google-fit-link-trigger"
                        onClick={toggleGoogleFitConnection}
                        disabled={fitConnecting}
                        className={`px-4 py-2 text-xs font-extrabold uppercase rounded-lg transition active:scale-95 flex items-center gap-2 ${
                          profile.isFitConnected 
                            ? "bg-red-950/30 text-red-400 hover:bg-red-950/50 border border-red-500/20" 
                            : "bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-500/20"
                        }`}
                      >
                        {fitConnecting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Binding Google Scope...
                          </>
                        ) : profile.isFitConnected ? (
                          "Disconnect Google Fit"
                        ) : (
                          "Link Google Fit"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Two columns: 1. Google Fit Metrics card, 2. GPS Live tracking */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Synchronized Metrics dashboard */}
                    <div className="glass-panel rounded-2xl p-5 border-white/5 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 mb-3 ml-1">Synced Sensor Stats</h4>
                        
                        <div className="grid grid-cols-2 gap-3" id="fitness-metrics-grid">
                          <div className="bg-white/2 p-3.5 border border-white/5 rounded-xl text-left" id="fit-steps-card">
                            <span className="text-2xs text-slate-500 font-extrabold uppercase block leading-none">Steps Tracking</span>
                            <span className="text-lg font-black font-mono text-white mt-1.5 block leading-none">
                              {profile.fitSteps || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-2 block leading-none">Target: 6000 Steps</span>
                          </div>

                          <div className="bg-white/2 p-3.5 border border-white/5 rounded-xl text-left" id="fit-dist-card">
                            <span className="text-2xs text-slate-500 font-extrabold uppercase block leading-none">Running KM</span>
                            <span className="text-lg font-black font-mono text-white mt-1.5 block leading-none">
                              {profile.fitDistance || 0} km
                            </span>
                            <span className="text-[10px] text-slate-400 mt-2 block leading-none">Target: 5.0 KM</span>
                          </div>

                          <div className="bg-white/2 p-3.5 border border-white/5 rounded-xl text-left" id="fit-cal-card">
                            <span className="text-2xs text-slate-500 font-extrabold uppercase block leading-none">Calories Burned</span>
                            <span className="text-lg font-black font-mono text-white mt-1.5 block leading-none">
                              {profile.fitCalories || 0} cal
                            </span>
                          </div>

                          <div className="bg-white/2 p-3.5 border border-white/5 rounded-xl text-left" id="fit-mins-card">
                            <span className="text-2xs text-slate-500 font-extrabold uppercase block leading-none">Active Minutes</span>
                            <span className="text-lg font-black font-mono text-white mt-1.5 block leading-none">
                              {profile.fitActiveMinutes || 0} mins
                            </span>
                          </div>
                        </div>
                      </div>

                      {profile.isFitConnected && (
                        <button
                          id="increment-steps-simulator"
                          onClick={simulateFitnessIncrement}
                          disabled={isSimulatingSteps}
                          className="w-full mt-4 py-2.5 bg-gradient-to-r from-orange-600/30 to-rose-600/30 hover:from-orange-600/40 hover:to-rose-600/40 text-orange-400 border border-orange-500/20 font-bold text-xs uppercase rounded-xl transition"
                        >
                          {isSimulatingSteps ? "Simulating Pedestrian Step Sensor..." : "Simulate Walking Increment (+2500 steps)"}
                        </button>
                      )}
                    </div>

                    {/* Live GPS Track Widget */}
                    <div className="glass-panel rounded-2xl p-5 border-white/5 text-left flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 ml-1">Live GPS Track</h4>
                          {isTrackingRun && (
                            <span className="bg-red-600 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                              RECORDING LOCATION
                            </span>
                          )}
                        </div>

                        <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-around text-center mb-4 min-h-[100px]">
                          <div>
                            <span className="text-2xs text-slate-500 font-extrabold uppercase block">GPS Distance</span>
                            <span className="text-2xl font-black font-mono text-white block mt-1">{gpsDistance} km</span>
                          </div>

                          <div className="h-10 w-[1px] bg-white/10" />

                          <div>
                            <span className="text-2xs text-slate-500 font-extrabold uppercase block">Velocity</span>
                            <span className="text-2xl font-black font-mono text-white block mt-1">{gpsVelocity} km/h</span>
                          </div>
                        </div>

                        {trackingError && (
                          <div id="gps-error" className="p-2 border border-orange-500/30 bg-orange-950/20 text-orange-400 text-2xs rounded-lg mb-3">
                            {trackingError}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!isTrackingRun ? (
                          <button
                            id="gps-run-start"
                            onClick={startGpsTracking}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 active:scale-95 breath-glow"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            Start Run Tracker
                          </button>
                        ) : (
                          <button
                            id="gps-run-stop"
                            onClick={stopGpsTracking}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 active:scale-95 animate-pulse"
                          >
                            <Square className="w-4 h-4 fill-white" />
                            Stop & Apply Points
                          </button>
                        )}
                      </div>

                      {gpsPointsAwarded > 0 && !isTrackingRun && (
                        <div id="run-reward-toast" className="p-2.5 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 font-bold font-mono text-[11px] rounded-lg mt-3 text-center leading-none">
                          CONGRATULATIONS: Completed +{gpsDistance} KM | Awarded +{gpsPointsAwarded} Points!
                        </div>
                      )}
                    </div>
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
                                {profile.isFitConnected ? "94%" : "0% UNLINKED"}
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 border border-white/5 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full" style={{ width: profile.isFitConnected ? "94%" : "15%" }} />
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

                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5">
                        {(["off", "low", "medium", "high"] as const).map((density) => (
                          <button
                            key={density}
                            onClick={() => {
                              setParticleDensity(density);
                              localStorage.setItem("guardian_particle_density", density);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-2xs uppercase tracking-wider font-extrabold transition-all duration-200 cursor-pointer ${
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

                  {/* Simulator Sandbox Tools */}
                  <div className="glass-panel rounded-2xl p-6 border-white/5 text-left">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-1">
                      <X className="text-red-500 w-5 h-5" />
                      Simulator Testing Suite
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 trailing-normal">
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
        <div className="fixed bottom-6 left-0 right-0 mx-auto z-40 max-w-[640px] px-4 font-sans pointer-events-none animate-fade-in">
          <div className="relative pointer-events-auto">
            {/* Main Dock bar */}
            <div className="w-full glass-panel bg-slate-950/85 border border-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex justify-around items-center h-16 relative">
              
              {/* Home button */}
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center justify-center w-14 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "home" ? "text-cyan-450 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Home className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] uppercase tracking-wider font-bold leading-none">Dashboard</span>
                {activeTab === "home" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-450 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Routine button */}
              <button
                onClick={() => setActiveTab("routine")}
                className={`flex flex-col items-center justify-center w-14 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "routine" ? "text-cyan-450 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Brain className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] uppercase tracking-wider font-bold leading-none font-sans">Targets</span>
                {activeTab === "routine" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-450 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Fitness button */}
              <button
                onClick={() => setActiveTab("fitness")}
                className={`flex flex-col items-center justify-center w-14 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "fitness" ? "text-cyan-450 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Activity className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] uppercase tracking-wider font-bold leading-none">Analytics</span>
                {activeTab === "fitness" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-450 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Motivation button */}
              <button
                onClick={() => setActiveTab("motivation")}
                className={`flex flex-col items-center justify-center w-14 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "motivation" ? "text-indigo-400 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Smile className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] uppercase tracking-wider font-bold leading-none">AI Motivation</span>
                {activeTab === "motivation" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-450 shadow-[0_0_10px_rgba(99,102,241,0.9)]" />
                )}
              </button>

              {/* Leaderboard/Streak stats button */}
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`flex flex-col items-center justify-center w-14 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "leaderboard" ? "text-cyan-450 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <TrendingUp className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] uppercase tracking-wider font-bold leading-none">Streak System</span>
                {activeTab === "leaderboard" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-450 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* History Button / Alerts */}
              <button
                onClick={() => setActiveTab("history")}
                className={`flex flex-col items-center justify-center w-14 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "history" ? "text-cyan-450 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <BarChart2 className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] uppercase tracking-wider font-bold leading-none">Alerts Logs</span>
                {activeTab === "history" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-450 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>

              {/* Settings button */}
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all duration-300 cursor-pointer relative ${
                  activeTab === "settings" ? "text-cyan-450 font-extrabold scale-105" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Settings className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] uppercase tracking-wider font-bold leading-none">Settings</span>
                {activeTab === "settings" && (
                  <motion.div layoutId="dock-active-dot" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-450 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
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
