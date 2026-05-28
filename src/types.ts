export interface SmartHomeState {
  relay: {
    relay1: boolean;
    relay2: boolean;
    relay3: boolean;
    relay4: boolean;
  };
  sensor: {
    temperature: number;
    humidity: number;
    last_update: string;
  };
  esp32: {
    status: 'online' | 'offline';
    wifi_signal: string;
    ip_address: string;
  };
  command: {
    source: 'web' | 'telegram' | 'voice';
    last_command: string;
    updated_at: string;
  };
}

export interface AppSettings {
  wifiSSID: string;
  wifiPass: string;
  botToken: string;
  chatId: string;
  firebaseUrl: string;
  firebaseAuth: string;
  activeApiMode: 'firebase' | 'local_express';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  source: 'Web Console' | 'Telegram Bot' | 'Voice Typing' | 'ESP32 Device' | 'System Scheduler';
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export type SidebarTab = 'dashboard' | 'devices' | 'sensor' | 'automation' | 'report' | 'settings';
