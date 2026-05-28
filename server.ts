import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface IoTState {
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

interface ActivityLog {
  id: string;
  timestamp: string;
  source: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

// In-Memory Database State matching the required Firebase Schema
let smartHomeDb: IoTState = {
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
    wifi_signal: '-65 dBm (Good)',
    ip_address: '192.168.1.144',
  },
  command: {
    source: 'web',
    last_command: 'Sistem diaktifkan',
    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
  },
};

let logs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    source: 'System Scheduler',
    type: 'info',
    message: 'Layanan Cloud Gateway IoT diaktifkan.',
  },
  {
    id: 'log-2',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    source: 'ESP32 Device',
    type: 'success',
    message: 'ESP32 tersambung ke WiFi. IP: 192.168.1.144, Sinyal: -65 dBm.',
  },
];

function addLog(source: string, type: 'info' | 'success' | 'warning' | 'error', message: string) {
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    source,
    type,
    message,
  };
  logs.unshift(newLog);
  if (logs.length > 50) logs.pop();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Get status
  app.get('/api/status', (req, res) => {
    res.json({
      success: true,
      data: smartHomeDb,
    });
  });

  // API: Get activity logs
  app.get('/api/logs', (req, res) => {
    res.json({
      success: true,
      logs,
    });
  });

  // API: Control Relay
  app.post('/api/relay', (req, res) => {
    const { relayIndex, status, source = 'web' } = req.body;
    const rKey = `relay${relayIndex}` as keyof typeof smartHomeDb.relay;
    
    if (rKey in smartHomeDb.relay) {
      const prevStatus = smartHomeDb.relay[rKey];
      smartHomeDb.relay[rKey] = !!status;
      smartHomeDb.sensor.last_update = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      smartHomeDb.command = {
        source: source as 'web' | 'telegram' | 'voice',
        last_command: `${status ? 'MENYALAKAN' : 'MEMATIKAN'} Lampu ${relayIndex}`,
        updated_at: smartHomeDb.sensor.last_update,
      };

      const sourceLabel = source === 'telegram' ? 'Telegram Bot' : source === 'voice' ? 'Voice Typing' : 'Web Console';
      if (prevStatus !== !!status) {
        addLog(
          sourceLabel,
          status ? 'success' : 'info',
          `Perintah diterima: ${status ? 'Menyalakan' : 'Mematikan'} Lampu ${relayIndex}.`
        );
      }

      res.json({
        success: true,
        message: `Relay ${relayIndex} berhasil diubah menjadi ${status ? 'ON' : 'OFF'}`,
        data: smartHomeDb,
      });
    } else {
      res.status(400).json({ success: false, error: 'Relay index tidak valid' });
    }
  });

  // API: Trigger Variation
  app.post('/api/variation', (req, res) => {
    const { pattern, source = 'web' } = req.body;
    
    smartHomeDb.sensor.last_update = new Date().toISOString().replace('T', ' ').substring(0, 19);
    smartHomeDb.command = {
      source: source as 'web' | 'telegram' | 'voice',
      last_command: `Menjalankan Variasi ${pattern}`,
      updated_at: smartHomeDb.sensor.last_update,
    };

    const sourceLabel = source === 'telegram' ? 'Telegram Bot' : source === 'voice' ? 'Voice Typing' : 'Web Console';
    addLog(sourceLabel, 'success', `Mulai menjalankan pola Lampu Variasi ${pattern}.`);

    // In a physical environment, the ESP32 would trigger the sequence.
    // In our live synced simulation, let's step-run the variation patterns:
    if (pattern === 1) {
      smartHomeDb.relay = { relay1: true, relay2: true, relay3: true, relay4: true };
      addLog('ESP32 Device', 'info', 'Variasi 1: Semua Lampu Aktif (Running sequential cycle...)');
    } else if (pattern === 2) {
      smartHomeDb.relay = { relay1: true, relay2: false, relay3: true, relay4: false };
      addLog('ESP32 Device', 'info', 'Variasi 2: Kombinasi Gantian (Relay 1, 3 ON / Relay 2, 4 OFF)');
    }

    res.json({
      success: true,
      message: `Pola Variasi ${pattern} diperintahkan.`,
      data: smartHomeDb,
    });
  });

  // API: Turn All Relays Off
  app.post('/api/all-off', (req, res) => {
    const { source = 'web' } = req.body;

    smartHomeDb.relay = {
      relay1: false,
      relay2: false,
      relay3: false,
      relay4: false,
    };
    smartHomeDb.sensor.last_update = new Date().toISOString().replace('T', ' ').substring(0, 19);
    smartHomeDb.command = {
      source: source as 'web' | 'telegram' | 'voice',
      last_command: 'Mematikan Semua Lampu',
      updated_at: smartHomeDb.sensor.last_update,
    };

    const sourceLabel = source === 'telegram' ? 'Telegram Bot' : source === 'voice' ? 'Voice Typing' : 'Web Console';
    addLog(sourceLabel, 'warning', 'Perintah diterima: MEMATIKAN SEMUA RELAY/LAMPU.');

    res.json({
      success: true,
      message: 'Semua relay berhasil dinonaktifkan.',
      data: smartHomeDb,
    });
  });

  // API Endpoint representing standard ESP32 interface (Bi-directional MQTT alternative polling)
  // ESP32 polls this to update its local relay outputs based on Cloud state OR report sensor telemetry.
  app.post('/api/iot/sync', (req, res) => {
    const { relay, sensor, esp32 } = req.body;
    
    // ESP32 sends telemetry update
    if (sensor) {
      smartHomeDb.sensor.temperature = Number(sensor.temperature) || smartHomeDb.sensor.temperature;
      smartHomeDb.sensor.humidity = Number(sensor.humidity) || smartHomeDb.sensor.humidity;
      smartHomeDb.sensor.last_update = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
    
    if (esp32) {
      smartHomeDb.esp32.status = 'online';
      smartHomeDb.esp32.wifi_signal = esp32.wifi_signal || smartHomeDb.esp32.wifi_signal;
      smartHomeDb.esp32.ip_address = esp32.ip_address || smartHomeDb.esp32.ip_address;
    }

    // If ESP32 actively reports local state switch (e.g. from physical button or Telegram)
    if (relay) {
      if (relay.relay1 !== undefined) smartHomeDb.relay.relay1 = !!relay.relay1;
      if (relay.relay2 !== undefined) smartHomeDb.relay.relay2 = !!relay.relay2;
      if (relay.relay3 !== undefined) smartHomeDb.relay.relay3 = !!relay.relay3;
      if (relay.relay4 !== undefined) smartHomeDb.relay.relay4 = !!relay.relay4;

      if (req.body.commandSource) {
        smartHomeDb.command = {
          source: req.body.commandSource,
          last_command: req.body.lastCommand || 'Sync ESP32',
          updated_at: smartHomeDb.sensor.last_update,
        };
      }
    }

    // Return the current state so the ESP32 knows if the dashboard made changes
    res.json({
      success: true,
      relay: smartHomeDb.relay,
      command: smartHomeDb.command,
    });
  });

  // REST API simulated Telegram Webhook endpoint for testing Bot command triggers
  app.post('/api/telegram-webhook-simulate', (req, res) => {
    const { text, username = 'QuizStudent' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Pesan teks kosong' });
    }

    const commandText = text.trim();
    let replyText = '';
    let matched = true;

    addLog('Telegram Bot', 'info', `Penerimaan pesan teks/suara: "${commandText}" dari @${username}`);

    const cmdLower = commandText.toLowerCase();

    // Check voice command conversions or direct commands
    if (cmdLower === '/start') {
      replyText = `📌 *MENU UTAMA BOT SMART HOME*
Silakan pilih perintah di bawah:
⚡ */status* - Cek Sensor & Relay
🌡️ */sensor* - Cek Suhu & Kelembapan
💡 */all_on* - Nyalakan semua lampu
🔌 */all_off* - Matikan semua lampu

💡 *Kontrol Relay Individual:*
/lampu1_on | /lampu1_off
/lampu2_on | /lampu2_off
/lampu3_on | /lampu3_off
/lampu4_on | /lampu4_off

🎭 *Pola Lampu Variasi:*
/variasi1 - Jalankan Pola Variasi 1
/variasi2 - Jalankan Pola Variasi 2

🎙️ *Bisa menggunakan Voice-to-text Keyboard:*
- "Nyalakan lampu"
- "Matikan lampu"
- "Berapa Temperatur"
- "Berapa Kelembapan"
- "Nyalakan Variasi 1"`;
    } else if (cmdLower === '/status') {
      replyText = `📊 *STATUS UTAMA SMART HOME*
- Lampu 1: ${smartHomeDb.relay.relay1 ? '🟢 ON' : '🔴 OFF'}
- Lampu 2: ${smartHomeDb.relay.relay2 ? '🟢 ON' : '🔴 OFF'}
- Lampu 3: ${smartHomeDb.relay.relay3 ? '🟢 ON' : '🔴 OFF'}
- Lampu 4: ${smartHomeDb.relay.relay4 ? '🟢 ON' : '🔴 OFF'}

🌡️ Suhu: *${smartHomeDb.sensor.temperature}°C*
💧 Kelembapan: *${smartHomeDb.sensor.humidity}%*
⏱️ Update: _${smartHomeDb.sensor.last_update}_
📶 Sinyal: ${smartHomeDb.esp32.wifi_signal}`;
    } else if (cmdLower === '/sensor' || cmdLower.includes('temperatur') || cmdLower.includes('kelembapan') || cmdLower.includes('suhu') || cmdLower.includes('kelembaban')) {
      replyText = `🌡️ *INFO SENSOR DHT11/22*
- Suhu Ruangan: *${smartHomeDb.sensor.temperature}°C*
- Kelembapan Udara: *${smartHomeDb.sensor.humidity}%*
- Indeks Kenyamanan: Nyaman`;
    } else if (cmdLower === '/lampu1_on' || cmdLower === 'nyalakan lampu 1') {
      smartHomeDb.relay.relay1 = true;
      replyText = '🟢 Lampu 1 BERHASIL diaktifkan.';
      addLog('Telegram Bot', 'success', 'Lampu 1 diaktifkan via Bot.');
    } else if (cmdLower === '/lampu1_off' || cmdLower === 'matikan lampu 1') {
      smartHomeDb.relay.relay1 = false;
      replyText = '🔴 Lampu 1 BERHASIL dimatikan.';
      addLog('Telegram Bot', 'info', 'Lampu 1 dimatikan via Bot.');
    } else if (cmdLower === '/lampu2_on' || cmdLower === 'nyalakan lampu 2') {
      smartHomeDb.relay.relay2 = true;
      replyText = '🟢 Lampu 2 BERHASIL diaktifkan.';
      addLog('Telegram Bot', 'success', 'Lampu 2 diaktifkan via Bot.');
    } else if (cmdLower === '/lampu2_off' || cmdLower === 'matikan lampu 2') {
      smartHomeDb.relay.relay2 = false;
      replyText = '🔴 Lampu 2 BERHASIL dimatikan.';
      addLog('Telegram Bot', 'info', 'Lampu 2 dimatikan via Bot.');
    } else if (cmdLower === '/lampu3_on' || cmdLower === 'nyalakan lampu 3') {
      smartHomeDb.relay.relay3 = true;
      replyText = '🟢 Lampu 3 BERHASIL diaktifkan.';
      addLog('Telegram Bot', 'success', 'Lampu 3 diaktifkan via Bot.');
    } else if (cmdLower === '/lampu3_off' || cmdLower === 'matikan lampu 3') {
      smartHomeDb.relay.relay3 = false;
      replyText = '🔴 Lampu 3 BERHASIL dimatikan.';
      addLog('Telegram Bot', 'info', 'Lampu 3 dimatikan via Bot.');
    } else if (cmdLower === '/lampu4_on' || cmdLower === 'nyalakan lampu 4') {
      smartHomeDb.relay.relay4 = true;
      replyText = '🟢 Lampu 4 BERHASIL diaktifkan.';
      addLog('Telegram Bot', 'success', 'Lampu 4 diaktifkan via Bot.');
    } else if (cmdLower === '/lampu4_off' || cmdLower === 'matikan lampu 4') {
      smartHomeDb.relay.relay4 = false;
      replyText = '🔴 Lampu 4 BERHASIL dimatikan.';
      addLog('Telegram Bot', 'info', 'Lampu 4 dimatikan via Bot.');
    } else if (cmdLower === '/all_on' || cmdLower === 'nyalakan semua lampu' || cmdLower === 'nyalakan lampu') {
      smartHomeDb.relay = { relay1: true, relay2: true, relay3: true, relay4: true };
      replyText = '🟢 SELURUH 4 LAMPU berhasil diaktifkan.';
      addLog('Telegram Bot', 'success', 'Seluruh lampu diaktifkan via Bot.');
    } else if (cmdLower === '/all_off' || cmdLower === 'matikan semua lampu' || cmdLower === 'matikan lampu') {
      smartHomeDb.relay = { relay1: false, relay2: false, relay3: false, relay4: false };
      replyText = '🔴 SELURUH Lampu berhasil dinonaktifkan.';
      addLog('Telegram Bot', 'warning', 'Seluruh lampu dimatikan via Bot.');
    } else if (cmdLower === '/variasi1' || cmdLower === 'nyalakan variasi 1') {
      smartHomeDb.relay = { relay1: true, relay2: true, relay3: true, relay4: true };
      replyText = '🎭 Pola Variasi 1 sedang dijalankan oleh ESP32.';
      addLog('Telegram Bot', 'success', 'Variasi 1 dimulai via Bot.');
    } else if (cmdLower === '/variasi2' || cmdLower === 'nyalakan variasi 2') {
      smartHomeDb.relay = { relay1: true, relay2: false, relay3: true, relay4: false };
      replyText = '🎭 Pola Variasi 2 sedang dijalankan oleh ESP32.';
      addLog('Telegram Bot', 'success', 'Variasi 2 dimulai via Bot.');
    } else {
      matched = false;
      replyText = `🤔 Perintah "${commandText}" tidak dipahami.\nHubungi /start untuk petunjuk list teks/suara.`;
    }

    if (matched) {
      smartHomeDb.sensor.last_update = new Date().toISOString().replace('T', ' ').substring(0, 19);
      smartHomeDb.command = {
        source: 'telegram',
        last_command: commandText,
        updated_at: smartHomeDb.sensor.last_update,
      };
    }

    res.json({
      success: true,
      reply: replyText,
      data: smartHomeDb,
    });
  });

  // Vite integration for asset rendering in dev environment
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Home IoT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
