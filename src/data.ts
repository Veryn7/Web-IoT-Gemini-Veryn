import { SmartHomeState } from './types';

export interface CostItem {
  id: string;
  item: string;
  specification: string;
  qty: number;
  price: number;
  category: 'hardware' | 'software' | 'operational';
}

export interface TimelinePhase {
  id: string;
  phase: string;
  duration: string;
  progress: number;
  tasks: string[];
}

export const hardwareCosts: CostItem[] = [
  { id: '1', item: 'ESP32 DevKit V1 Board', specification: 'CP2102 USB, Dual-Core 38-Pins', qty: 1, price: 65000, category: 'hardware' },
  { id: '2', item: 'Sensor Suhu Kelembaban DHT11', specification: 'Single-bus digital temperature & humidity', qty: 1, price: 18000, category: 'hardware' },
  { id: '3', item: 'Relay Module 4-Channel 5V DC', specification: 'Optocoupler isolation, 10A 250VAC Active LOW', qty: 1, price: 32000, category: 'hardware' },
  { id: '4', item: 'Power Adapter 5V 2A + Cable', specification: 'Micro USB cable with AC adapter socket', qty: 1, price: 25000, category: 'hardware' },
  { id: '5', item: 'Breadboard SYB-120 830-points', specification: 'Protoboard line connector', qty: 1, price: 15000, category: 'hardware' },
  { id: '6', item: 'Kabel Jumper Du Pont 30cm', specification: 'Male-to-Female, Female-to-Female Mix (40pcs)', qty: 1, price: 12000, category: 'hardware' },
  { id: '7', item: 'Lampu Demo LED 5V DC + Resistor', specification: 'LED indicator for mini testbed', qty: 4, price: 8000, category: 'hardware' },
  { id: '8', item: 'Firebase Cloud Database / RTDB', specification: 'Spark Free Tier Package (No Limit Client Sim)', qty: 1, price: 0, category: 'software' },
  { id: '9', item: 'Telegram Bot API Wrapper', specification: 'UniversalTelegramBot library, Open Source', qty: 1, price: 0, category: 'software' },
  { id: '10', item: 'Layanan Hosting Vercel / Replit', specification: 'Smart Dashboard Deployment Server', qty: 1, price: 0, category: 'software' },
  { id: '11', item: 'Paket Data WiFi & Internet', specification: 'Kuota ISP Seluler Kontrol Jarak Jauh', qty: 1, price: 50000, category: 'operational' },
];

export const projectTimeline: TimelinePhase[] = [
  {
    id: 'p1',
    phase: 'Analisis Kebutuhan & Desain',
    duration: 'Minggu 1 (Hari 1-3)',
    progress: 100,
    tasks: ['Mendefinisikan kebutuhan relay input/output', 'Perancangan topologi & skema database Firebase', 'Pembuatan mockup layout dashboard & skenario bot'],
  },
  {
    id: 'p2',
    phase: 'Pembelian Alat & Perakitan',
    duration: 'Minggu 1 (Hari 4-6)',
    progress: 100,
    tasks: ['Pembelian modul ESP32, DHT11, relay, adaptor', 'Merakit skema pengkabelan pada breadboard', 'Uji coba daya mandiri lampu indikator LED'],
  },
  {
    id: 'p3',
    phase: 'Pemrograman ESP32 (Arduino)',
    duration: 'Minggu 1 - 2 (Hari 7-10)',
    progress: 100,
    tasks: ['Konfigurasi driver WiFi & library telegram bot', 'Implementasi logger pembacaan periodik DHT11/22', 'Menulis algoritme kontrol active-LOW & sekuens variasi'],
  },
  {
    id: 'p4',
    phase: 'Pembuatan Web Dashboard',
    duration: 'Minggu 2 (Hari 11-13)',
    progress: 100,
    tasks: ['Inisialisasi project React/TypeScript & Tailwind', 'Integrasi endpoint REST API HTTP/Firebase SDK', 'Penyusunan chart Recharts responsif & monitor log'],
  },
  {
    id: 'p5',
    phase: 'Uji Coba & Kalibrasi',
    duration: 'Minggu 2 (Hari 14-16)',
    progress: 100,
    tasks: ['Uji coba sinkronisasi delay respons Telegram-ke-Web', 'Kalibrasi presisi temperatur DHT & kelembaban', 'Pengujian error handling saat sambungan WiFi terputus'],
  },
  {
    id: 'p6',
    phase: 'Deployment & Dokumentasi',
    duration: 'Minggu 3 (Hari 17-20)',
    progress: 100,
    tasks: ['Publish web ke Vercel/Replit prod server', 'Penyusunan Laporan Quiz & perakitan berkas PDF laporan'],
  },
];

export const mermaidFlowchartCode = `flowchart TD
    Start([Mulai]) --> InitWiFi[Inisialisasi WiFi & Telegram Bot Client]
    InitWiFi --> InitPins[Set Pin Relay OUTPUT & DHT11.begin]
    InitPins --> Loop[Loop Program ESP32]
    
    %% Siklus Telegram Check
    Loop --> CheckBot{Apakah ada pesan dari Telegram?}
    CheckBot -- "Ya (1 Detik)" --> GetUpdates[Ambil Update Pesan]
    GetUpdates --> AuthBot{Apakah Chat ID terdaftar?}
    AuthBot -- Tidak --> AlertStranger[Kirim Balasan: Akses Ditolak] --> Loop
    AuthBot -- Ya --> ParseMsg[Urai Pesan Teks / Pesan Suara Keyboard]
    ParseMsg --> ControlRelay[Eksekusi controlRelay / allOff / variasi]
    ControlRelay --> SendBotNotify[Kirim Pesan Konfirmasi Aksi ke User]
    SendBotNotify --> SyncFirebaseUpload[Kirim Data Status Terbaru ke Cloud Database]
    
    %% Siklus Cuaca/Sensor & Firebase
    Loop --> CheckSensorTimer{Apakah interval DHT terpenuhi? (5 Detik)}
    CheckSensorTimer -- Ya --> ReadDHT[Baca Kelembaban & Suhu DHT11/22]
    ReadDHT --> SyncWithCloud[Hubungkan REST API / Firebase RTDB]
    SyncWithCloud --> FetchDashboardCmd[Ambil Perintah Penyetelan Relay dari Web Dashboard]
    FetchDashboardCmd --> CompareState{Perintah Web != Status Fisik?}
    CompareState -- Ya --> ExecuteWebCmd[Ubah Keadaan Relay sesuai Perintah Web] --> SendBotNotify
    CompareState -- Tidak --> FinishSync[Update Berhasil & Simpan Riwayat]
    FinishSync --> Loop
    
    CheckBot -- Tidak --> CheckSensorTimer
    CheckSensorTimer -- Tidak --> Loop`;

export const mermaidBlockDiagramCode = `graph LR
    subgraph Pengguna [User Interface & Controlling Interface]
        Web[Web Dashboard - React/TypeScript]
        Tele[Telegram Bot App - Android/iOS Client]
    end

    subgraph FirebaseCloud [Cloud & Integrator Layer]
        API[REST API Server / Firebase Realtime Database]
    end

    subgraph Hardware [Physical Hardware Node]
        ESP32[Mikrokontroler ESP32 DevKit V1]
        DHT[Sensor DHT11 / DHT22]
        Relay[Modul Relay 4-Channel 5V]
        Lampu[Beban: 4 Lampu / Perangkat Demo]
    end

    %% Hubungan Sinyal & Data
    Web -- "Write Command / Read Status (JSON HTTP)" --> API
    Tele -- "Send text/voice command" --> ESP32
    API -- "Bi-directional Sync (JSON HTTP/Poll)" --> ESP32
    
    DHT -- "Membaca Suhu/Kelembaban (Data Digital GPIO)" --> ESP32
    ESP32 -- "Ubah Sinyal Digital (LOW/HIGH)" --> Relay
    Relay -- "Saklar Daya Otomatis (NO/NC Contacts)" --> Lampu`;
