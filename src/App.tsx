import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Lightbulb,
  Thermometer,
  Droplets,
  Settings,
  FileText,
  Cpu,
  Wifi,
  DollarSign,
  AlertTriangle,
  Send,
  Mic,
  Bot,
  Play,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  Copy,
  ChevronRight,
  RefreshCw,
  Bell,
  Clock,
  Shield,
  Zap,
  Volume2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

import { SmartHomeState, AppSettings, ActivityLog, SidebarTab } from './types';
import { hardwareCosts, projectTimeline, mermaidFlowchartCode, mermaidBlockDiagramCode } from './data';
import { getArduinoCode } from './arduinoCode';

// Setup Mock Historial sensor data for chart initializing
const initialChartData = [
  { time: '10:00', temperature: 26.5, humidity: 65, load: 12 },
  { time: '11:00', temperature: 27.2, humidity: 63, load: 15 },
  { time: '12:00', temperature: 28.5, humidity: 60, load: 30 },
  { time: '13:00', temperature: 29.1, humidity: 58, load: 45 },
  { time: '14:00', temperature: 28.8, humidity: 59, load: 45 },
  { time: '15:00', temperature: 27.6, humidity: 62, load: 20 },
];

export default function App() {
  // Navigation & View tab
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');

  // App API & credentials variables
  const [settings, setSettings] = useState<AppSettings>({
    wifiSSID: 'Kost_Damai_WiFi',
    wifiPass: 'kopi_hitam_pahit_123',
    botToken: '7394850285:AAFlk_vE-Y88ILLY2859385qk_test',
    chatId: '548301290',
    firebaseUrl: 'https://smart-home-io4-default-rtdb.firebaseio.com',
    firebaseAuth: 'AIzaSyA38X_d7948271049285038102985390',
    activeApiMode: 'local_express'
  });

  // IoT State reflecting the required database schema
  const [state, setState] = useState<SmartHomeState>({
    relay: {
      relay1: false,
      relay2: false,
      relay3: false,
      relay4: false,
    },
    sensor: {
      temperature: 27.4,
      humidity: 62.0,
      last_update: new Date().toISOString().replace('T', ' ').substring(0, 19),
    },
    esp32: {
      status: 'online',
      wifi_signal: '-65 dBm (Baik)',
      ip_address: '192.168.1.144',
    },
    command: {
      source: 'web',
      last_command: 'Sistem diaktifkan',
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }
  });

  // Logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Chart data state
  const [chartData, setChartData] = useState(initialChartData);

  // Triggering Simulation states
  const [simWifiStatus, setSimWifiStatus] = useState<boolean>(true);
  const [simTemp, setSimTemp] = useState<number>(27.4);
  const [simHum, setSimHum] = useState<number>(62.0);

  // Custom User Automation Rules
  const [automationRules, setAutomationRules] = useState<Array<{
    id: string;
    temperatureThreshold: number;
    condition: 'greater' | 'less';
    targetRelay: 1 | 2 | 3 | 4;
    action: boolean; // true = ON, false = OFF
    label: string;
    active: boolean;
  }>>([
    {
      id: 'rule-1',
      temperatureThreshold: 30,
      condition: 'greater',
      targetRelay: 1,
      action: true,
      label: 'Nyalakan Lampu 1 (Kipas Angin) jika Suhu > 30°C',
      active: true
    }
  ]);

  // Schedule timer state
  const [timerRelay, setTimerRelay] = useState<1 | 2 | 3 | 4>(1);
  const [timerDuration, setTimerDuration] = useState<number>(10);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerCountdown, setTimerCountdown] = useState<number>(0);

  // Chat window state (Simulated Telegram interface)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'bot';
    text: string;
    time: string;
  }>>([
    {
      id: 'msg-start-1',
      sender: 'bot',
      text: '🤖 Halo Veryn! Saya adalah bot asisten Smart Home IoT Anda.\nUntuk mendaftarkan menu utama silakan gunakan perintah /start.',
      time: '14:50'
    }
  ]);

  // Notifications banner popup
  const [notification, setNotification] = useState<string | null>(null);

  // Refs for auto-scrolling telegram browser chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // 1. POLLING SATELLITE TO SYNC WITH SERVER VIA API ENDPOINTS
  const fetchSystemData = async () => {
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      if (json.success) {
        setState(json.data);
      }

      const resLogs = await fetch('/api/logs');
      const jsonLogs = await resLogs.json();
      if (jsonLogs.success) {
        setActivityLogs(jsonLogs.logs);
      }
    } catch (e) {
      // In case we are in isolated runtime, fallback to browser state
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 1500);
    return () => clearInterval(interval);
  }, []);

  // Sync simulated state sliders to the API
  useEffect(() => {
    const pushSimData = async () => {
      if (!simWifiStatus) return; // Don't push if ESP is simulated offline

      try {
        await fetch('/api/iot/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sensor: {
              temperature: simTemp,
              humidity: simHum
            },
            esp32: {
              status: 'online',
              wifi_signal: '-65 dBm (Sangat Baik)',
              ip_address: '192.168.1.144'
            }
          })
        });
      } catch (err) {
        // Fallback or ignore
      }
    };
    pushSimData();
  }, [simTemp, simHum, simWifiStatus]);

  // Dynamic graph update over time
  useEffect(() => {
    const graphInterval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const loadPower = (state.relay.relay1 ? 15 : 0) + 
                       (state.relay.relay2 ? 15 : 0) + 
                       (state.relay.relay3 ? 40 : 0) + 
                       (state.relay.relay4 ? 60 : 0);

      setChartData(prev => {
        const next = [...prev, {
          time: timeStr,
          temperature: Number(simTemp.toFixed(1)),
          humidity: Number(simHum.toFixed(1)),
          load: loadPower
        }];
        if (next.length > 8) next.shift();
        return next;
      });

      // Execute Automation rules actively in the background
      automationRules.forEach(rule => {
        if (!rule.active) return;
        const currentTemp = simTemp;
        let triggered = false;

        if (rule.condition === 'greater' && currentTemp > rule.temperatureThreshold) {
          triggered = true;
        } else if (rule.condition === 'less' && currentTemp < rule.temperatureThreshold) {
          triggered = true;
        }

        const relayKey = `relay${rule.targetRelay}` as keyof typeof state.relay;
        const isCurrentlyState = state.relay[relayKey];

        if (triggered && isCurrentlyState !== rule.action) {
          // Trigger rule action
          handleRelayToggle(rule.targetRelay, rule.action, 'voice');
          showNotification(`🚀 Aturan Otomasi "${rule.label}" Terpicu!`);
        }
      });
    }, 4000);

    return () => clearInterval(graphInterval);
  }, [simTemp, simHum, state.relay, automationRules]);

  // Handle Relay Toggling
  const handleRelayToggle = async (relayIndex: 1 | 2 | 3 | 4, value: boolean, source: 'web' | 'telegram' | 'voice' = 'web') => {
    setLoading(true);
    try {
      const res = await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relayIndex, status: value, source })
      });
      const data = await res.json();
      if (data.success) {
        setState(data.data);
      }
    } catch (e) {
      // Offline fallback state update
      setState(prev => {
        const nr = { ...prev.relay, [`relay${relayIndex}`]: value };
        return {
          ...prev,
          relay: nr,
          command: {
            source,
            last_command: `${value ? 'MENYALAKAN' : 'MEMATIKAN'} Lampu ${relayIndex}`,
            updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
          }
        };
      });
    } finally {
      setLoading(false);
    }
  };

  // Turn All Relays Off
  const handleAllOff = async (source: 'web' | 'telegram' | 'voice' = 'web') => {
    try {
      const res = await fetch('/api/all-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
      const data = await res.json();
      if (data.success) {
        setState(data.data);
        showNotification('🔌 Seluruh relay berhasil dinonaktifkan.');
      }
    } catch (e) {
      setState(prev => ({
        ...prev,
        relay: { relay1: false, relay2: false, relay3: false, relay4: false },
        command: {
          source,
          last_command: 'Mematikan Semua Lampu',
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      }));
    }
  };

  // Trigger Patterns
  const handlePattern = async (pattern: 1 | 2, source: 'web' | 'telegram' | 'voice' = 'web') => {
    try {
      await fetch('/api/variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern, source })
      });
      showNotification(`🎭 Pola Variasi Lampu ${pattern} dikirim ke ESP32.`);
    } catch (e) {
      showNotification(`Simulation: Running Pattern ${pattern}`);
    }
  };

  // Helper trigger notifications popup
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Simulated countdown timer function
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerCountdown > 0) {
      interval = setInterval(() => {
        setTimerCountdown(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            // Toggle relay when timer completes
            const rKey = `relay${timerRelay}` as keyof typeof state.relay;
            const targetState = !state.relay[rKey];
            handleRelayToggle(timerRelay, targetState, 'web');
            showNotification(`⏱️ Timer Selesai! Lampu ${timerRelay} diubah ke ${targetState ? 'ON' : 'OFF'}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerCountdown, timerRelay, state.relay]);

  const startTimer = () => {
    setTimerCountdown(timerDuration);
    setTimerActive(true);
    showNotification(`⏱️ Timer diatur: Lampu ${timerRelay} akan berubah status dalam ${timerDuration} detik.`);
  };

  const cancelTimer = () => {
    setTimerActive(false);
    setTimerCountdown(0);
    showNotification(`⏱️ Timer dibatalkan.`);
  };

  // Simulated Telegram Chat Handler
  const handleSendTelegramMessage = async (textToSend?: string) => {
    const textMsg = textToSend || chatInput;
    if (!textMsg.trim()) return;

    // Add user message to state bubble
    const userMsg = {
      id: `msg-${Date.now()}-user`,
      sender: 'user' as const,
      text: textMsg,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');

    // Scroll to bottom
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // POST to simulated webhook endpoint on our server
    try {
      const res = await fetch('/api/telegram-webhook-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textMsg })
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(() => {
          const botReply = {
            id: `msg-${Date.now()}-bot`,
            sender: 'bot' as const,
            text: data.reply,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          };
          setChatMessages(prev => [...prev, botReply]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          fetchSystemData(); // Sync states directly
        }, 800);
      }
    } catch (e) {
      // Local fallback simulator response
      setTimeout(() => {
        const botReply = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot' as const,
          text: `🤖 [SIMULATOR OFFLINE CHAT]\nPerintah "${textMsg}" diterima. Hubungkan backend untuk mengaktifkan real webhook sync.`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, botReply]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, 500);
    }
  };

  const addAutomationRule = (threshold: number, condition: 'greater' | 'less', relay: 1 | 2 | 3 | 4, action: boolean) => {
    const newRule = {
      id: `rule-${Date.now()}`,
      temperatureThreshold: threshold,
      condition,
      targetRelay: relay,
      action,
      label: `Automasi: ${action ? 'ON' : 'OFF'} Lampu ${relay} jika Suhu ${condition === 'greater' ? '>' : '<'} ${threshold}°C`,
      active: true
    };
    setAutomationRules(prev => [...prev, newRule]);
    showNotification('💡 Aturan otomasi baru berhasil didaftarkan.');
  };

  const deleteRule = (id: string) => {
    setAutomationRules(prev => prev.filter(r => r.id !== id));
    showNotification('🗑️ Aturan otomasi dihapus.');
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row print-container">
      
      {/* 1. SIDEBAR NAVIGATION - Hidden during paper printout */}
      <aside className="w-full md:w-68 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 no-print">
        {/* Title and Branding */}
        <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-md leading-tight text-white">IOT Relay Bot</h1>
              <span className="text-xs text-slate-400 font-mono tracking-wider block">v1.2-STABLE</span>
            </div>
          </div>
        </div>

        {/* Dynamic Status Indicator */}
        <div className="p-4 mx-3 my-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full relative flex`}>
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${state.esp32.status === 'online' && simWifiStatus ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${state.esp32.status === 'online' && simWifiStatus ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-200">ESP32 Core State</p>
              <p className="text-[10px] text-slate-400 font-mono leading-none">{state.esp32.ip_address}</p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${state.esp32.status === 'online' && simWifiStatus ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900' : 'bg-rose-950/80 text-rose-400 border border-rose-900'}`}>
            {state.esp32.status === 'online' && simWifiStatus ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Tab Selection Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'devices', label: 'Relay & Devices', icon: Lightbulb },
            { id: 'sensor', label: 'Sensor Charts', icon: Thermometer },
            { id: 'automation', label: 'Otomasi & Pola', icon: Zap },
            { id: 'report', label: 'Kode Arduino', icon: Cpu },
            { id: 'settings', label: 'Settings & Bot', icon: Settings }
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as SidebarTab)}
                id={`sidebar-tab-${item.id}`}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 opacity-50 ${active ? 'block' : 'hidden'}`} />
              </button>
            );
          })}
        </nav>

        {/* Embedded Core Hardware Simulator Control */}
        <div className="p-4 m-3 bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 leading-none">
              <Cpu className="w-3.5 h-3.5" /> HARDWARE SIMULATOR
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500 uppercase leading-none font-semibold">WiFi Status</span>
              <button 
                onClick={() => {
                  setSimWifiStatus(!simWifiStatus);
                  showNotification(`ESP32 WiFi simulated ${!simWifiStatus ? 'ONLINE' : 'OFFLINE'}`);
                }}
                className={`w-7 h-4 rounded-full relative transition-colors ${simWifiStatus ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${simWifiStatus ? 'translate-x-3' : ''}`}></span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 flex items-center gap-1">🌡️ Sim Temperatur</span>
                <span className="font-mono text-white font-bold">{simTemp.toFixed(1)}°C</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="45" 
                step="0.2"
                value={simTemp}
                disabled={!simWifiStatus}
                onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg cursor-ew-resize disabled:opacity-40" 
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 flex items-center gap-1">💧 Sim Kelembaban</span>
                <span className="font-mono text-white font-bold">{simHum.toFixed(1)}%</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="95" 
                step="0.5"
                value={simHum}
                disabled={!simWifiStatus}
                onChange={(e) => setSimHum(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-ew-resize disabled:opacity-40" 
              />
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR PANEL - Hidden during print */}
        <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between no-print shadow-sm font-sans z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2 capitalize">
              {activeTab === 'dashboard' && 'Beranda IoT Kontrol'}
              {activeTab === 'devices' && 'Administrasi Relay & Beban Listrik'}
              {activeTab === 'sensor' && 'Pusat Analisis & Statistik DHT'}
              {activeTab === 'automation' && 'Otomasi Berbasis Aturan'}
              {activeTab === 'report' && 'Generator Kode Arduino IDE'}
              {activeTab === 'settings' && 'Setelan Jaringan & Simulasi Bot'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications quick drawer wrapper */}
            <div className="relative group">
              <button 
                id="noti-btn"
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg relative transition-all"
                title="Recent activity logs history"
              >
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                <Bell className="w-5 h-5 text-slate-600" />
              </button>
              {/* Dropdown popup */}
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-xl shadow-xl py-3 px-4 hidden group-hover:block hover:block z-50">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                  <span className="font-semibold text-xs text-slate-700">Aktivitas Terakhir</span>
                  <span className="text-[10px] text-blue-500 font-mono font-bold">50 Logs</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {activityLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="text-[11px] leading-tight pb-1.5 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-700">{log.source}</span>
                        <span>{log.timestamp.split(' ')[1]}</span>
                      </div>
                      <p className="text-slate-600">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick stats on topbar */}
            <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold border-r border-slate-200 pr-3 font-mono">
                <Thermometer className="w-4 h-4" /> {state.sensor.temperature.toFixed(1)}°C
              </div>
              <div className="flex items-center gap-1.5 text-cyan-600 font-bold font-mono">
                <Droplets className="w-4 h-4" /> {state.sensor.humidity.toFixed(1)}%
              </div>
            </div>

            {/* User identification card */}
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-none">Veryn</p>
                <p className="text-[10px] text-amber-600 leading-none mt-1 font-mono">QUIZ IoT ASSESSOR</p>
              </div>
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold rounded-lg flex items-center justify-center shadow-md">
                VR
              </div>
            </div>
          </div>
        </header>

        {/* NOTIFICATION FLOATING TOAST POPUP */}
        {notification && (
          <div className="fixed top-4 right-4 bg-slate-900 border border-slate-800 text-white font-medium text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce no-print">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* SCROLLABLE VIEW CANVAS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ========================================== */}
          {/* A. TAB VIEW: DASHBOARD */}
          {/* ========================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 font-sans">
              {/* Welcome Smart Home Card */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-2xl text-white p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-48">
                <div className="absolute -right-8 -bottom-8 opacity-10 bg-white p-24 rounded-full"></div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest font-mono text-white/90">
                      SISTEM KONTROL IoT AKTIF
                    </span>
                    <span className="text-xs text-blue-100 font-mono">
                      Kamis, 28 Mei 2026 - 14:53 WIB
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-display leading-tight mb-2">
                    Selamat Siang, Veryn!
                  </h3>
                  <p className="text-slate-200 text-sm max-w-lg leading-relaxed">
                    Sistem pemantauan ruangan dan 4-relay terintegrasi dengan Telegram Bot dalam keadaan online. 
                    {simTemp > 30 ? ' Suhu terpantau cukup tinggi, disarankan menyalakan kipas/pendingin.' : ' Suhu ruangan terpantau sejuk dan kondusif.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-white/10 pt-4 bg-white/5 -mx-6 -mb-6 p-6">
                  <div>
                    <span className="text-[10px] text-blue-200 block uppercase font-mono mb-1">Wi-Fi SSID</span>
                    <span className="text-sm font-semibold text-white font-mono">{settings.wifiSSID}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-200 block uppercase font-mono mb-1">Sinyal Node</span>
                    <span className="text-sm font-semibold text-white font-mono">{state.esp32.wifi_signal}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-200 block uppercase font-mono mb-1">Koneksi Awan</span>
                    <span className="text-sm font-semibold text-emerald-400 font-mono">Firebase Connected</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-200 block uppercase font-mono mb-1">Update Terakhir</span>
                    <span className="text-sm font-semibold text-white font-mono">{state.sensor.last_update.split(' ')[1]} WIB</span>
                  </div>
                </div>
              </div>

              {/* Gauge Indicators block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temperature Card Indicator */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
                  <div className="space-y-4">
                    <span className="text-xs text-rose-500 font-mono font-bold tracking-wider uppercase block">Sensor Temperatur</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-800 font-display transition-all">
                        {state.sensor.temperature.toFixed(1)}
                      </span>
                      <span className="text-xl font-bold text-slate-400 font-mono">°C</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Suhu dari sensor digital DHT11/22 terhubung pin GPIO4.
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center w-28 h-28">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Grey Circle */}
                      <circle cx="56" cy="56" r="48" fill="transparent" stroke="#f1f5f9" strokeWidth="8"/>
                      {/* Temperature Color Arc */}
                      <circle 
                        cx="56" 
                        cy="56" 
                        r="48" 
                        fill="transparent" 
                        stroke="#f43f5e" 
                        strokeWidth="8"
                        strokeDasharray={301.6}
                        strokeDashoffset={301.6 - (301.6 * Math.min(state.sensor.temperature, 50)) / 50}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <Thermometer className="w-8 h-8 text-rose-500 animate-pulse" />
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold mt-1">HOT TEMP</span>
                    </div>
                  </div>
                </div>

                {/* Humidity Card Indicator */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
                  <div className="space-y-4">
                    <span className="text-xs text-cyan-500 font-mono font-bold tracking-wider uppercase block">Kelembaban Udara</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-800 font-display transition-all">
                        {state.sensor.humidity.toFixed(1)}
                      </span>
                      <span className="text-xl font-bold text-slate-400 font-mono">%</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Persentase kandungan air udara dibaca periodik.
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center w-28 h-28">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Grey Circle */}
                      <circle cx="56" cy="56" r="48" fill="transparent" stroke="#f1f5f9" strokeWidth="8"/>
                      {/* Humidity progress circle */}
                      <circle 
                        cx="56" 
                        cy="56" 
                        r="48" 
                        fill="transparent" 
                        stroke="#06b6d4" 
                        strokeWidth="8"
                        strokeDasharray={301.6}
                        strokeDashoffset={301.6 - (301.6 * state.sensor.humidity) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <Droplets className="w-8 h-8 text-cyan-500" />
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold mt-1">HUMID STATE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Relay Controller Section */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-50 pb-4">
                  <div>
                    <h4 className="text-md font-bold font-display text-slate-800">Kontrol Lampu & Output Relay</h4>
                    <p className="text-xs text-slate-500">Gunakan tombol di bawah ini untuk mengubah kondisi relay secara instan (Sinkron ke database cloud).</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleAllOff()}
                      className="px-4 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all border border-rose-200"
                    >
                      MATIKAN SEMUA RELAY
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 1, name: 'Lampu Teras (Relay 1)', type: 'active_low', desc: 'Selasar Depan / Kipas' },
                    { id: 2, name: 'Lampu Keluarga (Relay 2)', type: 'active_low', desc: 'Kamar Utama Tengah' },
                    { id: 3, name: 'Lampu Dapur (Relay 3)', type: 'active_low', desc: 'Samping Wastafel' },
                    { id: 4, name: 'Lampu Kamar (Relay 4)', type: 'active_low', desc: 'Beban Outdoor AC' }
                  ].map(relayItem => {
                    const relayKey = `relay${relayItem.id}` as keyof typeof state.relay;
                    const isOn = state.relay[relayKey];
                    return (
                      <div 
                        key={relayItem.id}
                        id={`relay-card-${relayItem.id}`}
                        className={`p-4 rounded-xl border transition-all duration-300 ${
                          isOn 
                            ? 'bg-emerald-50/50 border-emerald-200 shadow-sm shadow-emerald-100' 
                            : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2.5 rounded-lg transition-colors ${isOn ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Lightbulb className={`w-5 h-5 ${isOn ? 'animate-pulse' : ''}`} />
                          </div>
                          <button
                            onClick={() => handleRelayToggle(relayItem.id as 1|2|3|4, !isOn, 'web')}
                            disabled={loading}
                            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                              isOn ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <div className={`bg-white w-5.5 h-5.5 rounded-full shadow-md transform transition-transform duration-300 ${
                              isOn ? 'translate-x-5.5' : ''
                            }`}></div>
                          </button>
                        </div>
                        <h5 className="text-sm font-bold text-slate-800 leading-tight">{relayItem.name}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">{relayItem.desc}</p>
                        <div className="flex items-center gap-1.5 mt-3.5 pt-2 border-t border-slate-50">
                          <span className={`w-2 h-2 rounded-full ${isOn ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></span>
                          <span className={`text-[10px] font-mono leading-none font-bold ${isOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                            STATE: {isOn ? 'ON (ACTIVE)' : 'OFF (IDLE)'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Variations and Last API interaction */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Patterns Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold font-display text-slate-800 flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-600" /> Pola Variasi Lampu (Quiz)
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Menjalankan tugas spesifik Quiz. Pola sekuensial akan mengontrol relay satu-persatu secara berkala.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => handlePattern(1)}
                      className="w-full flex items-center justify-between text-left p-3.5 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all font-sans text-xs group"
                    >
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-blue-600">Variasi Lampu 1</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Berurutan sekuensial Relay 1-4 lalu mati.</p>
                      </div>
                      <Play className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                    </button>

                    <button
                      onClick={() => handlePattern(2)}
                      className="w-full flex items-center justify-between text-left p-3.5 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all font-sans text-xs group"
                    >
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-indigo-600">Variasi Lampu 2</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Berkedip silang: Relay (1,3) & (2,4) bergantian.</p>
                      </div>
                      <Play className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                    </button>
                  </div>
                </div>

                {/* Cloud & Broker command status info */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm col-span-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                      <h4 className="text-sm font-bold font-display text-slate-800">Logger Sinkronisasi Database / API</h4>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase font-bold">REAL-TIME BRIDGE</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans mb-4">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold leading-none">Last Action Command</span>
                        <p className="font-bold text-slate-800 font-mono text-[11px] truncate uppercase">{state.command.last_command || 'No commands recorded'}</p>
                        <span className="text-[9px] text-slate-400 block pt-1 border-t border-slate-100 mt-1">Command Timestamp: {state.command.updated_at}</span>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold leading-none">Command Trigger Source</span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                          {state.command.source === 'telegram' && <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded font-mono text-[9px] font-bold">TELEGRAM CLIENT</span>}
                          {state.command.source === 'voice' && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-mono text-[9px] font-bold">TELEGRAM VOICE</span>}
                          {state.command.source === 'web' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-mono text-[9px] font-bold">WEB CONSOLE</span>}
                        </div>
                        <span className="text-[9px] text-slate-400 block pt-1 border-t border-slate-100 mt-1">Target Cloud: Firebase RTDB JSON</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity console log snippet */}
                  <div className="bg-slate-900 rounded-xl text-slate-300 p-4 font-mono text-[11px] overflow-hidden">
                    <p className="text-slate-500 border-b border-slate-800 pb-1 flex justify-between">
                      <span>⚡ CONSOLE REALTIME LOGS:</span>
                      <span className="text-blue-400 animate-pulse">● LIVE SYNC</span>
                    </p>
                    <div className="space-y-1 mt-2 max-h-16 overflow-y-auto">
                      {activityLogs.slice(0, 3).map(log => (
                        <p key={log.id} className="truncate">
                          <span className="text-slate-500">[{log.timestamp.split(' ')[1]}]</span>{' '}
                          <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-rose-400' : 'text-slate-300'}>
                            {log.source}: {log.message}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* B. TAB VIEW: DEVICES */}
          {/* ========================================== */}
          {activeTab === 'devices' && (
            <div className="space-y-6 font-sans">
              
              {/* Safety AC 220V Warning - Highlighted in Indonesian */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-4 shadow-sm">
                <AlertTriangle className="w-10 h-10 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-900 text-sm">⚠️ PERINGATAN KESELAMATAN TEKNIS TEGANGAN AC 220V</h4>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Penggunaan relay 4 channel dengan arus listrik PLN AC 220V berisiko tinggi terhadap sengatan listrik dan hubungan singkat. 
                    Selalu gunakan isolasi kabel yang benar, simpan rakitan dalam kotak sasis (box pelindung), dan mintalah pengawasan asisten praktikum atau teknisi elektro saat melakukan pengujian demo kampus. 
                    <strong> Untuk pengujian laboratorium yang direkomendasikan secara aman, gunakan lampu DC 5V/12V.</strong>
                  </p>
                </div>
              </div>

              {/* Extensive device table / widgets */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 1 & 2 Columns: Large Relay detailing */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-md font-bold font-display text-slate-800 mb-4">Administrasi Rincian Beban Terminal Relay</h3>
                    
                    <div className="space-y-4">
                      {[
                        { id: 1, label: 'Lampu Teras Depan', activePower: '15 Watt (LED)', voltage: '220V AC', gpio: 'GPIO 16', type: 'Active LOW' },
                        { id: 2, label: 'Lampu Ruang Keluarga', activePower: '15 Watt (LED)', voltage: '220V AC', gpio: 'GPIO 17', type: 'Active LOW' },
                        { id: 3, label: 'Lampu Dapur Belakang', activePower: '40 Watt (Fluorescent)', voltage: '220V AC', gpio: 'GPIO 18', type: 'Active LOW' },
                        { id: 4, label: 'Lampu Kamar Tidur', activePower: '60 Watt (Incandescent)', voltage: '220V AC', gpio: 'GPIO 19', type: 'Active LOW' }
                      ].map(relay => {
                        const rKey = `relay${relay.id}` as keyof typeof state.relay;
                        const isOn = state.relay[rKey];
                        return (
                          <div key={relay.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-xl ${isOn ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-slate-200 text-slate-400'}`}>
                                <Lightbulb className={`w-5 h-5 ${isOn ? 'animate-bounce' : ''}`} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                  {relay.label}
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono font-bold uppercase">{relay.gpio}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Daya Estimasi: <span className="font-semibold text-slate-700 font-mono">{relay.activePower}</span> | Tegangan: <span className="font-semibold text-slate-700 font-mono">{relay.voltage}</span>
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 justify-end border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono ${isOn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                {isOn ? 'ACTIVE (ON)' : 'STANDBY (OFF)'}
                              </span>
                              <button
                                onClick={() => handleRelayToggle(relay.id as 1|2|3|4, !isOn, 'web')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isOn 
                                    ? 'bg-rose-500 text-white hover:bg-rose-600' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                              >
                                {isOn ? 'MATIKAN' : 'NYALAKAN'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3 Column: Dynamic Automation scheduling and Live Usage calc */}
                <div className="space-y-6">
                  
                  {/* Power Cost Calculator Calculator widget */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-sm font-bold font-display text-slate-800 flex items-center gap-1.5 mb-2">
                      <Zap className="w-4 h-4 text-amber-500" /> Biaya & Konsumsi Listrik Virtual
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Akumulasi kalkulasi penggunaan Watt-Hours dari relay aktif berdasarkan tarif Indonesia (Rp 1.444 per KWh).
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 font-sans">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Total Daya Terpasang:</span>
                        <span className="font-mono font-bold text-slate-800">130 W</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Daya Aktif Saat Ini:</span>
                        <span className="font-mono font-bold text-emerald-600 text-[13px]">
                          {(state.relay.relay1 ? 15 : 0) + 
                           (state.relay.relay2 ? 15 : 0) + 
                           (state.relay.relay3 ? 40 : 0) + 
                           (state.relay.relay4 ? 60 : 0)} Watt
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2.5">
                        <span className="text-slate-500">Estimasi KWh / Hari:</span>
                        <span className="font-mono font-bold text-slate-800">1.82 KWh</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Estimasi Biaya:</span>
                        <span className="font-mono font-extrabold text-blue-600 text-md">
                          {formatRupiah(
                            Math.round(
                              ((state.relay.relay1 ? 15 : 0) + 
                              (state.relay.relay2 ? 15 : 0) + 
                              (state.relay.relay3 ? 40 : 0) + 
                              (state.relay.relay4 ? 60 : 0)) * 1.444 * 0.024
                            ) || 1500
                          )} / Hari
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Countdown Timer trigger */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-sm font-bold font-display text-slate-800 flex items-center gap-1.5 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" /> Penjadwal Hitung Mundur (Timer)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Mengubah status relay secara otomatis setelah hitung mundur selesai.
                    </p>

                    <div className="space-y-3.5 text-xs font-sans">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Pilih Target Relay Lampu</label>
                        <select 
                          value={timerRelay}
                          onChange={(e) => setTimerRelay(parseInt(e.target.value) as 1|2|3|4)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-blue-500"
                        >
                          <option value="1">Lampu Teras (Relay 1)</option>
                          <option value="2">Lampu Keluarga (Relay 2)</option>
                          <option value="3">Lampu Dapur (Relay 3)</option>
                          <option value="4">Lampu Kamar (Relay 4)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Durasi Mundur (Detik)</label>
                        <input 
                          type="number" 
                          min="5" 
                          max="3600"
                          value={timerDuration}
                          onChange={(e) => setTimerDuration(parseInt(e.target.value) || 5)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-blue-500" 
                        />
                      </div>

                      {timerActive ? (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-center space-y-2">
                          <p className="leading-none text-xs">Mengeksekusi Lampu {timerRelay} dalam:</p>
                          <p className="text-2xl font-black font-mono tracking-wider animate-pulse text-blue-700">{timerCountdown}s</p>
                          <button 
                            onClick={cancelTimer}
                            className="w-full py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-200"
                          >
                            BATALKAN TIMER
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={startTimer}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all"
                        >
                          AKTIFKAN TIMER SEKARANG
                        </button>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* C. TAB VIEW: SENSOR */}
          {/* ========================================== */}
          {activeTab === 'sensor' && (
            <div className="space-y-6 font-sans">
              
              {/* Climate diagnostic bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] text-slate-400 block font-bold leading-none font-mono mb-1">SUHU TERTINGGI</span>
                  <p className="text-2xl font-bold font-display text-rose-600 font-mono">31.2 °C <span className="text-xs text-slate-400 block pt-1 font-sans font-normal">Pukul 13:20 WIB</span></p>
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] text-slate-400 block font-bold leading-none font-mono mb-1">SUHU TERENDAH</span>
                  <p className="text-2xl font-bold font-display text-blue-600 font-mono">22.4 °C <span className="text-xs text-slate-400 block pt-1 font-sans font-normal">Pukul 04:15 WIB</span></p>
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] text-slate-400 block font-bold leading-none font-mono mb-1">RATA-RATA KELEMBABAN</span>
                  <p className="text-2xl font-bold font-display text-cyan-600 font-mono">61.5 % <span className="text-xs text-slate-400 block pt-1 font-sans font-normal">Sangat Nyaman (Indoor)</span></p>
                </div>
              </div>

              {/* Main Weather line graph using Recharts */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-md font-bold font-display text-slate-800">Grafik Trend Telemetry Real-Time</h3>
                    <p className="text-xs text-slate-500">Membaca dan memetakan plot fluktuasi periodik temperatur & kelembaban dari Node ESP32.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                    <span className="text-xs text-slate-600 mr-4">Suhu (°C)</span>
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    <span className="text-xs text-slate-600">Kelembaban (%)</span>
                  </div>
                </div>

                <div className="w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }} />
                      <Legend style={{ fontSize: '11px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        activeDot={{ r: 8 }} 
                        name="Temperatur (°C)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="humidity" 
                        stroke="#06b6d4" 
                        strokeWidth={3}
                        name="Kelembaban (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sandbox Presets - Simulating Environments */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold font-display text-slate-800 mb-2">Simulasi Sandbox Cuaca Terprogram</h3>
                <p className="text-xs text-slate-500 mb-4">Gunakan preset di bawah untuk memodifikasi telemetry sensor secara instan untuk menguji behavior sistem otomasi.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: '☀️ Siang Hari Terik', temp: 34.5, hum: 42.0 },
                    { label: '🌧️ Hujan Deras Dingin', temp: 22.0, hum: 88.0 },
                    { label: '❄️ Ruangan AC Mewah', temp: 18.0, hum: 55.0 },
                    { label: '🏡 Cuaca Normal Nyaman', temp: 27.2, hum: 61.5 }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSimTemp(preset.temp);
                        setSimHum(preset.hum);
                        showNotification(`Preset diaktifkan: ${preset.label} (${preset.temp}°C, ${preset.hum}%)`);
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl text-center transition-all font-sans text-xs font-bold text-slate-700"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* D. TAB VIEW: AUTOMATION */}
          {/* ========================================== */}
          {activeTab === 'automation' && (
            <div className="space-y-6 font-sans">
              
              {/* Automation guidelines */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Rule Creator */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit">
                  <h3 className="text-sm font-bold font-display text-slate-800 mb-2">Buat Aturan Otomasi Baru</h3>
                  <p className="text-xs text-slate-500 mb-4">ESP32 akan memproses kondisi dan menyalakan/mematikan saklar relay otomatis.</p>
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const temp = parseFloat((form.elements.namedItem('threshold') as HTMLInputElement).value) || 30;
                    const cond = (form.elements.namedItem('condition') as HTMLSelectElement).value as 'greater' | 'less';
                    const rel = parseInt((form.elements.namedItem('relay') as HTMLSelectElement).value) as 1|2|3|4;
                    const act = (form.elements.namedItem('action') as HTMLSelectElement).value === 'true';
                    
                    addAutomationRule(temp, cond, rel, act);
                  }} className="space-y-3.5 text-xs font-sans">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Treshold Suhu Ruangan</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          name="threshold"
                          defaultValue={30} 
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none" 
                        />
                        <span className="font-bold text-slate-400">°C</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Kondisi Pemicu</label>
                      <select name="condition" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none">
                        <option value="greater">Lebih Besar Dari (&gt;)</option>
                        <option value="less">Lebih Kecil Dari (&lt;)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Target Relay</label>
                      <select name="relay" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none">
                        <option value="1">Lampu Teras (Relay 1)</option>
                        <option value="2">Lampu Keluarga (Relay 2)</option>
                        <option value="3">Lampu Dapur (Relay 3)</option>
                        <option value="4">Lampu Kamar (Relay 4)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Aksi yang Dijalankan</label>
                      <select name="action" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none">
                        <option value="true">Nyalakan Perangkat (ON)</option>
                        <option value="false">Matikan Perangkat (OFF)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                    >
                      TAMBAHKAN KE DAFTAR ATURAN
                    </button>
                  </form>
                </div>

                {/* Automation Rules Table/List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="text-sm font-bold font-display text-slate-800 mb-4">Daftar Pemicu Otomasi yang Terdaftar</h3>
                  
                  {automationRules.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Belum ada aturan otomatis yang terdaftar. Gunakan formulir di samping untuk menambahkan.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {automationRules.map(rule => (
                        <div key={rule.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs gap-4">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded-full font-bold font-mono ${rule.action ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                              {rule.action ? 'ACTION: RELAY ON' : 'ACTION: RELAY OFF'}
                            </span>
                            <p className="font-bold text-slate-700 text-[13px] pt-1">{rule.label}</p>
                            <p className="text-[10px] text-slate-400">Trigger: Sensor DHT 🌡️ GPIO4 &middot; Threshold aktif</p>
                          </div>
                          
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-100"
                            title="Hapus aturan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Variation documentation info */}
                  <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Penjelasan Teknis Pola Variasi Lampu</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-50/80 text-xs text-blue-900 leading-relaxed">
                        <span className="font-bold text-blue-950 block mb-1">Pola Variasi 1 (Running Sequential)</span>
                        Relay akan menyala berurutan dari Relay 1 sampai Relay 4 selama 600ms masing-masing sekon. Setelah siklus satu putaran selesai, semua relay akan dimatikan otomatis secara aman demi perlindungan daya sirkuit.
                      </div>

                      <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-50/80 text-xs text-indigo-900 leading-relaxed">
                        <span className="font-bold text-indigo-950 block mb-1">Pola Variasi 2 (Kombinasi Flashing)</span>
                        Beroperasi dengan men-strobe relay dalam bentuk kombinasi berpasangan gantian. Relay 1 dan 3 menyala sedangkan relay 2 dan 4 mati selama 500ms, dilanjutkan dengan pemadaman silang berulang 4 putaran sekuensial.
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* E. TAB VIEW: ARDUINO CODE GENERATOR */}
          {/* ========================================== */}
          {activeTab === 'report' && (
            <div className="space-y-6 font-sans">
              
              {/* Info & Action Panel */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-md font-bold font-display text-slate-800 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-blue-600" /> Generator Kode Sumber Arduino IDE
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Kode C++ di bawah ini di-generate secara dinamis menggunakan nilai SSID Wi-Fi, password, token Telegram Bot, dan Chat ID yang Anda konfigurasi di menu **Settings**.
                    </p>
                  </div>
                  <div className="flex gap-2.5 shrink-0">
                    <button
                      onClick={() => {
                        const codeStr = getArduinoCode(settings);
                        navigator.clipboard.writeText(codeStr);
                        showNotification('📋 Kode Arduino disalin ke clipboard!');
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Copy className="w-4 h-4" /> Salin Kode .ino
                    </button>
                    <button
                      onClick={() => {
                        const codeStr = getArduinoCode(settings);
                        const blob = new Blob([codeStr], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `smart_home_esp32_relay.ino`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showNotification('💾 File smart_home_esp32_relay.ino berhasil diunduh!');
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Unduh Kode .ino
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold font-mono">WIFI SSID</span>
                    <span className="font-semibold text-slate-800 font-mono mt-0.5 block truncate">{settings.wifiSSID}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold font-mono">TELEGRAM TOKEN</span>
                    <span className="font-semibold text-slate-800 font-mono mt-0.5 block truncate">{settings.botToken}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold font-mono">TELEGRAM CHAT ID</span>
                    <span className="font-semibold text-slate-800 font-mono mt-0.5 block truncate">{settings.chatId}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold font-mono">FIREBASE ENDPOINT</span>
                    <span className="font-semibold text-slate-800 font-mono mt-0.5 block truncate">{settings.firebaseUrl}</span>
                  </div>
                </div>
              </div>

              {/* Code Editor Container */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500 block"></span>
                      <span className="w-3 h-3 rounded-full bg-amber-500 block"></span>
                      <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono pl-2">smart_home_esp32_relay.ino</span>
                  </div>
                  <span className="text-[10.5px] font-mono text-blue-400 uppercase font-bold tracking-wider">C++ / Arduino Sketches</span>
                </div>

                <div className="p-6 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] leading-relaxed whitespace-pre select-all bg-slate-950 scrollbar-thin">
                  {getArduinoCode(settings)}
                </div>
              </div>

              {/* Tips / Notes Card */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-950 flex gap-3">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600 h-fit">
                  <Lightbulb className="w-5 h-5 text-blue-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-blue-950 text-[13px]">Petunjuk Pengompilasian & Upload board ESP32:</p>
                  <p className="text-blue-800 leading-relaxed text-xs">
                    1. Buka software Arduino IDE, lalu buat Sketch baru dan tempel seluruh baris kode di atas.<br />
                    2. Pastikan Anda telah memasang library dependency penting: <code>UniversalTelegramBot</code> oleh Brian Lomas (v1.3.0), <code>ArduinoJson</code> oleh Benoit Blanchon (v6+), dan <code>DHT sensor library</code> oleh Adafruit.<br />
                    3. Atur port komunikasi dan pilih model board: <strong>ESP32 Dev Module</strong> pada menu Tools &gt; Board.<br />
                    4. Tekan tombol **Upload (Tanda Panah Kanan)** untuk mentransfer program ke mikrokontroler ESP32 Anda.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* F. TAB VIEW: SETTINGS & LIVE BOT CHAT */}
          {/* ========================================== */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 font-sans">
              
              {/* Form Config panel */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                <div>
                  <h4 className="font-bold font-display text-slate-800 text-md">Setelan Jaringan &amp; Token Kredensial</h4>
                  <p className="text-xs text-slate-500 mt-1">Ubah variable di bawah ini. Semua nilai akan langsung mensinkronkan rincian kode Arduino (.ino) secara real-time.</p>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  
                  {/* Wi-Fi SSID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Wi-Fi SSID Jaringan</label>
                      <input 
                        type="text" 
                        value={settings.wifiSSID}
                        onChange={(e) => setSettings({ ...settings, wifiSSID: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 font-mono focus:border-blue-500 focus:outline-none" 
                        placeholder="SSID wifi lab/rumah"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Wi-Fi Password Pasangan</label>
                      <input 
                        type="password" 
                        value={settings.wifiPass}
                        onChange={(e) => setSettings({ ...settings, wifiPass: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 font-mono focus:border-blue-500 focus:outline-none" 
                        placeholder="WiFi security key"
                      />
                    </div>
                  </div>

                  {/* Telegram Credentials configuration with helpful text */}
                  <div className="space-y-3.5 border-t border-slate-50 pt-4">
                    <span className="text-[11px] font-mono font-bold text-sky-600 block uppercase">KREDENSIAL TELEGRAM BOT</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-500 mb-1 font-semibold">Telegram Bot Token (BotFather Token)</label>
                        <input 
                          type="text" 
                          value={settings.botToken}
                          onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 font-mono focus:border-blue-500 focus:outline-none" 
                          placeholder="API:bot_token"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1 font-semibold">Telegram Chat ID Pemilik</label>
                        <input 
                          type="text" 
                          value={settings.chatId}
                          onChange={(e) => setSettings({ ...settings, chatId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 font-mono focus:border-blue-500 focus:outline-none" 
                          placeholder="Your telegram numeric ID"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Firebase Realtime settings */}
                  <div className="space-y-3.5 border-t border-slate-50 pt-4">
                    <span className="text-[11px] font-mono font-bold text-amber-600 block uppercase">SINKRONISASI CLOUD DATABASE (FIREBASE URL)</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-500 mb-1 font-semibold">Firebase RTDB Endpoint URL</label>
                        <input 
                          type="text" 
                          value={settings.firebaseUrl}
                          onChange={(e) => setSettings({ ...settings, firebaseUrl: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 font-mono focus:border-blue-500 focus:outline-none" 
                          placeholder="https://your-project-id.firebaseio.com"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1 font-semibold">Database Secrets (Auth Token)</label>
                        <input 
                          type="password" 
                          value={settings.firebaseAuth}
                          onChange={(e) => setSettings({ ...settings, firebaseAuth: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 font-mono focus:border-blue-500 focus:outline-none" 
                          placeholder="Firebase Secret Auth Token"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => {
                        showNotification('💾 Seluruh konfigurasi IoT tersimpan & ter-sinkronisasi!');
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                    >
                      SIMPAN KONFIGURASI IoT
                    </button>
                  </div>

                </div>

                {/* Helpful Instruction Guides */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">BANTUAN SETUP KONEKTIVITAS TELEGRAM BOT</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans leading-relaxed text-slate-600">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1">📍 Cara Membuat Bot Telegram:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Buka aplikasi Telegram, cari akun <strong>@BotFather</strong>.</li>
                        <li>Kirim perintah <code>/newbot</code>.</li>
                        <li>Tentukan nama bot &amp; username unik (misal: <code>MyHubHomeBot</code>).</li>
                        <li>Salin token token API yang dikirimkan ke kolom TOKEN di atas.</li>
                      </ol>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1">🔑 Mendapatkan CHAT ID Anda:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Cari bot helper <strong>@myidbot</strong> pada kolom cari Telegram.</li>
                        <li>Tekan atau kirim perintah <code>/getid</code> ke IDBot.</li>
                        <li>Bot akan membalas dengan deretan nomor ID unik (misal: <code>548301290</code>).</li>
                        <li>Isi pada kolom CHAT ID di atas demi membatasi akses orang asing.</li>
                      </ol>
                    </div>
                  </div>
                </div>

              </div>

              {/* Telegram bot interactive test widget cell */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Smartphone styled Bot simulator */}
                <div className="bg-slate-900 rounded-3xl border-8 border-slate-800 shadow-2xl h-[560px] flex flex-col justify-between overflow-hidden relative font-sans">
                  
                  {/* Phone Speaker & Camera notch top decoration */}
                  <div className="absolute top-0 inset-x-0 h-[24px] bg-slate-950 flex justify-center items-center z-10">
                    <span className="w-14 h-4 bg-slate-900 rounded-b-xl flex items-center justify-around px-2">
                      <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                      <span className="w-8 h-1 bg-slate-800 rounded-full"></span>
                    </span>
                  </div>

                  {/* Phone header screen mock */}
                  <div className="bg-slate-820 p-3 pt-7 border-b border-slate-800 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <div className="w-8.5 h-8.5 bg-sky-600 rounded-full flex items-center justify-center text-white font-bold shadow shadow-sky-500/10">
                        <Bot className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs leading-none">Smart Home IoT Bot</h4>
                        <span className="text-[10px] text-sky-400 font-medium leading-none mt-1 inline-block">bot asisten online</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">14:53 PM</span>
                  </div>

                  {/* Messaging chat panel */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 scrollbar-thin">
                    {chatMessages.map(msg => (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === 'user' ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start'
                        }`}
                      >
                        <div 
                          className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.sender === 'user' 
                              ? 'bg-sky-600 text-white rounded-br-none shadow shadow-sky-900/15 font-sans' 
                              : 'bg-slate-800 text-slate-200 rounded-bl-none shadow shadow-slate-950/20 font-mono'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">{msg.time}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Text-based VOICE shortcuts suggestions bar */}
                  <div className="px-3 py-1.5 bg-slate-950 flex gap-1.5 overflow-x-auto text-[10px] border-t border-slate-850 whitespace-nowrap">
                    {[
                      { l: '🎙️ TANYA SUHU', t: 'Berapa temperatur' },
                      { l: '💡 NYALAKAN ALL', t: 'Nyalakan semua lampu' },
                      { l: '🔌 MATIKAN ALL', t: 'Matikan semua lampu' },
                      { l: '💡 NYALAKAN LAMPU 1', t: 'Nyalakan lampu 1' },
                      { l: '🎭 VARIASI 1', t: 'Nyalakan variasi 1' }
                    ].map((shortcut, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendTelegramMessage(shortcut.t)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2 py-1 rounded-full transition-colors font-sans"
                      >
                        {shortcut.l}
                      </button>
                    ))}
                  </div>

                  {/* Custom Keyboard Chat input row */}
                  <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendTelegramMessage();
                      }}
                      placeholder="Ketik perintah atau gunakan Voice..." 
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    
                    {/* Simulated Voice Typing Button feedback */}
                    <button
                      onClick={() => {
                        const voiceCommand = 'Nyalakan semua lampu';
                        setChatInput(voiceCommand);
                        showNotification('🎙️ Keyboard mikrofon didengar: "Nyalakan semua lampu" (Teks disalin)');
                      }}
                      className="p-2.5 bg-sky-950 text-sky-400 hover:bg-sky-900 rounded-xl transition-all border border-sky-900"
                      title="Simulate smartphone voice keyboard dictation"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleSendTelegramMessage()}
                      className="p-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all"
                      title="Kirim pesan"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  );
}
