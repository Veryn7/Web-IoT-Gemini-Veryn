import { AppSettings } from './types';

export function getArduinoCode(settings: AppSettings): string {
  const ssid = settings.wifiSSID || 'ISI_NAMA_WIFI';
  const pass = settings.wifiPass || 'ISI_PASSWORD_WIFI';
  const token = settings.botToken || 'ISI_TOKEN_BOT_TELEGRAM';
  const chatid = settings.chatId || 'ISI_CHAT_ID_TELEGRAM';
  const fburl = settings.firebaseUrl || 'https://your-project-id-default-rtdb.firebaseio.com';
  const fbauth = settings.firebaseAuth || 'ISI_DATABASE_SECRET';

  return `/**
 * PROYEK: Smart Home IoT 4-Relay Telegram Bot & Web Dashboard
 * FILENAME: smart_home_telegram_web_esp32.ino
 * DEVISI: Mahasiswa Sistem IoT - Quiz Smart Home
 * DESKRIPSI:
 *   Mengontrol 4 Relay (Lampu 1-4) dan membaca sensor Suhu/Kelembaban DHT11/22.
 *   Konektivitas ganda terintegrasi dengan Telegram Bot (UniversalTelegramBot)
 *   serta sinkronisasi real-time ke Firebase Realtime Database / REST Cloud API.
 * 
 * LISENSI: Apache-2.0
 */

#define BLYNK_PRINT Serial
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include "DHT.h"

// --- KONFIGURASI WIFI & LAYANAN CLOUD ---
#define WIFI_SSID "${ssid}"
#define WIFI_PASSWORD "${pass}"

// Token Telegram Bot (Hubungi BotFather untuk mendapatkannya)
#define BOT_TOKEN "${token}"
// Chat ID Anda (Gunakan bot @myidbot atau @RawDataBot)
#define CHAT_ID "${chatid}"

// Konfigurasi API Firebase / Web App Gateway
// Jika menggunakan REST API, URL ini ditargetkan ke server Web Dashboard Anda
#define API_GATEWAY_URL "https://your-app-url-on-cloud.run.app/api/iot/sync"
#define FIREBASE_DATABASE_URL "${fburl}"
#define FIREBASE_AUTH "${fbauth}"

// --- KONFIGURASI PIN OUT/IN ESP32 ---
#define DHT_PIN 4          // Pin sensor DHT11/DHT22 (GPIO4)
#define DHT_TYPE DHT11     // Ubah menjadi DHT22 jika menggunakan DHT21/DHT22

#define RELAY_1 16         // Relay Lampu 1 (GPIO16)
#define RELAY_2 17         // Relay Lampu 2 (GPIO17)
#define RELAY_3 18         // Relay Lampu 3 (GPIO18)
#define RELAY_4 19         // Relay Lampu 4 (GPIO19)

// --- LOGIKA UTAMA RELAY ACTIVE LOW ---
// LOW = Relay Menyala (ON), HIGH = Relay Mati (OFF).
// Jika modul relay Anda berjenis active HIGH, silakan tukar logika RELAY_ON & RELAY_OFF berikut ini.
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// --- INISIALISASI VARIABEL GLOBAL ---
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClientSecure client;
UniversalTelegramBot bot(BOT_TOKEN, client);

// Timer Millis Non-Blocking
unsigned long lastTimeBotRan = 0;
const unsigned long BOT_MTBS = 1000; // Cek pesan Telegram setiap 1 detik

unsigned long lastTimeDHTRan = 0;
const unsigned long DHT_INTERVAL = 5000; // Membaca sensor & update cloud setiap 5 detik

// Status Relay Saat Ini
bool relay1_status = false;
bool relay2_status = false;
bool relay3_status = false;
bool relay4_status = false;

// Nilai Sensor DHT
float current_temp = 0.0;
float current_hum = 0.0;

// Flag Status Pola Variasi Lampu Aktif
bool variation1_active = false;
bool variation2_active = false;

// Deklarasi fungsi-fungsi program
void handleNewMessages(int numNewMessages);
void syncWithCloud();
void controlRelay(int relayNum, bool state);
void variation1();
void variation2();
void allOff();

void setup() {
  Serial.begin(115200);
  Serial.println("--- MEMULAI SISTEM IOT SMART HOME ---");

  // Konfigurasi Pin Relay sebagai Output
  pinMode(RELAY_1, OUTPUT);
  pinMode(RELAY_2, OUTPUT);
  pinMode(RELAY_3, OUTPUT);
  pinMode(RELAY_4, OUTPUT);

  // Pastikan keadaan awal semua Lampu mati (HIGH untuk Active LOW)
  allOff();

  // Memulai sensor DHT
  dht.begin();

  // Koneksi WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  Serial.print("Menyambungkan ke WiFi: ");
  Serial.println(WIFI_SSID);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi terhubung!");
  Serial.print("Alamat IP ESP32: ");
  Serial.println(WiFi.localIP());

  // Setelan keamanan HTTPS (Abaikan validasi sertifikat SSL agar hemat memori)
  client.setInsecure();
  
  // Kirim pesan startup sukses ke Telegram
  bot.sendMessage(CHAT_ID, "🚀 *Sistem Smart Home ESP32 Aktif!*\\nHubungi /start untuk daftar perintah.", "Markdown");
}

void loop() {
  // 1. NON-BLOCKING CHECK PESAN TELEGRAM BOT (Setiap 1 detik)
  if (millis() - lastTimeBotRan > BOT_MTBS) {
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    while(numNewMessages) {
      Serial.println("Menerima respons pesan dari Telegram");
      handleNewMessages(numNewMessages);
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    }
    lastTimeBotRan = millis();
  }

  // 2. NON-BLOCKING BACA SENSOR & SINKRONISASI KE CLOUD DATABASE (Setiap 5 detik)
  if (millis() - lastTimeDHTRan > DHT_INTERVAL) {
    // Membaca nilai suhu & kelembaban dht
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (isnan(t) || isnan(h)) {
      Serial.println("Gagal membaca sensor DHT11/22!");
    } else {
      current_temp = t;
      current_hum = h;
      Serial.print("Suhu: "); Serial.print(current_temp); Serial.print("C");
      Serial.print(" | Kelembaban: "); Serial.print(current_hum); Serial.println("%");
    }

    // Melakukan sinkronisasi state dua arah ke REST API Cloud / Firebase
    syncWithCloud();
    lastTimeDHTRan = millis();
  }

  // 3. JALANKAN LOGIKA PROGRAM BILA VARIASI SEDANG AKTIF
  if (variation1_active) {
    variation1();
  } else if (variation2_active) {
    variation2();
  }
}

// --- FUNGSI UTAMA KONTROL RELAY ---
void controlRelay(int relayNum, boolean state) {
  int pin = 0;
  switch (relayNum) {
    case 1: pin = RELAY_1; relay1_status = state; break;
    case 2: pin = RELAY_2; relay2_status = state; break;
    case 3: pin = RELAY_3; relay3_status = state; break;
    case 4: pin = RELAY_4; relay4_status = state; break;
  }
  
  if (pin != 0) {
    digitalWrite(pin, state ? RELAY_ON : RELAY_OFF);
    
    // Kirim konfirmasi notifikasi ke pengguna Telegram
    String msg = "💡 *Lampu " + String(relayNum) + "* telah " + (state ? "🟢 *DIURBAN/AKTIF*" : "🔴 *DINONAKTIFKAN*");
    bot.sendMessage(CHAT_ID, msg, "Markdown");
    
    Serial.print("Relay "); Serial.print(relayNum); Serial.println(state ? " ON" : " OFF");
  }
}

// --- FUNGSI TURN OFF ALL RELAY ---
void allOff() {
  digitalWrite(RELAY_1, RELAY_OFF);
  digitalWrite(RELAY_2, RELAY_OFF);
  digitalWrite(RELAY_3, RELAY_OFF);
  digitalWrite(RELAY_4, RELAY_OFF);
  
  relay1_status = false;
  relay2_status = false;
  relay3_status = false;
  relay4_status = false;
  
  variation1_active = false;
  variation2_active = false;
  
  Serial.println("Seluruh relay dimatikan.");
}

// --- PROGRAM VARIASI LAMPU 1 ---
// Pola: Menyala berurutan dari Relay 1 sampai 4 bergantian dengan delay, lalu semua mati.
void variation1() {
  allOff();
  bot.sendMessage(CHAT_ID, "🎭 *Memulai Pola Variasi 1 (Running Cycle)*", "Markdown");
  
  for (int i = 1; i <= 4; i++) {
    int curPin = (i == 1) ? RELAY_1 : (i == 2) ? RELAY_2 : (i == 3) ? RELAY_3 : RELAY_4;
    digitalWrite(curPin, RELAY_ON);
    delay(600); // Penundaan pendek sekuensial
    digitalWrite(curPin, RELAY_OFF);
  }
  
  bot.sendMessage(CHAT_ID, "🎭 *Pola Variasi 1 Selesai!*", "Markdown");
  variation1_active = false; // Kembalikan ke normal
}

// --- PROGRAM VARIASI LAMPU 2 ---
// Pola: Lampu berkedip pola kombinasi (Relay 1&3 ON, Relay 2&4 OFF bergantian berulang)
void variation2() {
  bot.sendMessage(CHAT_ID, "🎭 *Memulai Pola Variasi 2 (Kombinasi Flashing)*", "Markdown");
  
  for (int loopCount = 0; loopCount < 4; loopCount++) {
    // Kombinasi A (1 & 3 ON, 2 & 4 OFF)
    digitalWrite(RELAY_1, RELAY_ON);
    digitalWrite(RELAY_2, RELAY_OFF);
    digitalWrite(RELAY_3, RELAY_ON);
    digitalWrite(RELAY_4, RELAY_OFF);
    delay(500);

    // Kombinasi B (1 & 3 OFF, 2 & 4 ON)
    digitalWrite(RELAY_1, RELAY_OFF);
    digitalWrite(RELAY_2, RELAY_ON);
    digitalWrite(RELAY_3, RELAY_OFF);
    digitalWrite(RELAY_4, RELAY_ON);
    delay(500);
  }
  
  allOff();
  bot.sendMessage(CHAT_ID, "🎭 *Pola Variasi 2 Selesai!*", "Markdown");
  variation2_active = false; // Kembalikan ke normal
}

// --- INTEGRASI WEB DASHBOARD (REST API GATEWAY / FIREBASE SYNC) ---
void syncWithCloud() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure syncClient;
    syncClient.setInsecure();
    
    // Siapkan data JSON untuk diunggah
    StaticJsonDocument<500> jsonDoc;
    
    // Mengakumulasi State Relay saat ini
    JsonObject relayObj = jsonDoc.createNestedObject("relay");
    relayObj["relay1"] = relay1_status;
    relayObj["relay2"] = relay2_status;
    relayObj["relay3"] = relay3_status;
    relayObj["relay4"] = relay4_status;
    
    // Mengumpulkan Data Telemetry Sensor
    JsonObject sensorObj = jsonDoc.createNestedObject("sensor");
    sensorObj["temperature"] = current_temp;
    sensorObj["humidity"] = current_hum;
    
    // Detailing Informasi ESP32
    JsonObject espObj = jsonDoc.createNestedObject("esp32");
    espObj["status"] = "online";
    espObj["wifi_signal"] = String(WiFi.RSSI()) + " dBm";
    espObj["ip_address"] = WiFi.localIP().toString();

    String requestBody;
    serializeJson(jsonDoc, requestBody);
    
    // POST request ke Gateway Dashboard
    HTTPClient http;
    http.begin(syncClient, API_GATEWAY_URL);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(requestBody);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Sync Sukses. Respons Cloud:");
      Serial.println(response);
      
      // Parse perintah eksternal yang diinput dari Web Dashboard
      StaticJsonDocument<300> resDoc;
      deserializeJson(resDoc, response);
      
      if (resDoc.containsKey("relay")) {
        // Update relay berdasarkan instruksi dashboard bila terdapat perbedaan
        boolean w_r1 = resDoc["relay"]["relay1"];
        boolean w_r2 = resDoc["relay"]["relay2"];
        boolean w_r3 = resDoc["relay"]["relay3"];
        boolean w_r4 = resDoc["relay"]["relay4"];
        
        if (w_r1 != relay1_status) { digitalWrite(RELAY_1, w_r1 ? RELAY_ON : RELAY_OFF); relay1_status = w_r1; }
        if (w_r2 != relay2_status) { digitalWrite(RELAY_2, w_r2 ? RELAY_ON : RELAY_OFF); relay2_status = w_r2; }
        if (w_r3 != relay3_status) { digitalWrite(RELAY_3, w_r3 ? RELAY_ON : RELAY_OFF); relay3_status = w_r3; }
        if (w_r4 != relay4_status) { digitalWrite(RELAY_4, w_r4 ? RELAY_ON : RELAY_OFF); relay4_status = w_r4; }
      }
    } else {
      Serial.print("Error saat sinkronisasi Cloud: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}

// --- HANDLER TELEGRAM BOT UTAMA & VOICE-TO-TEXT ---
void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "⚠️ Akses Ditolak! Anda bukan pemilik Smart Home.", "");
      continue;
    }
    
    String text = bot.messages[i].text;
    String from_name = bot.messages[i].from_name;
    
    Serial.print("Pesan masuk: ");
    Serial.println(text);
    
    text.trim();
    String cmdLower = text;
    cmdLower.toLowerCase();

    // 1. PARSING COMMAND STANDAR
    if (cmdLower == "/start") {
      String welcome = "🌟 *Halo " + from_name + "! Selamat Datang di Smart Home IoT*\\n\\n";
      welcome += "Gunakan tombol menu atau ketik perintah untuk mengontrol relay.\\n\\n";
      welcome += "📋 *Daftar Perintah:*\\n";
      welcome += "⚡ /status - Tampilkan seluruh status\\n";
      welcome += "🌡️ /sensor - Lihat pembacaan DHT\\n";
      welcome += "💡 /all_on - Hidupkan seluruh lampu\\n";
      welcome += "🔌 /all_off - Matikan seluruh lampu\\n\\n";
      welcome += "🎙️ *Mendukung Voice-to-Text:*\\n";
      welcome += "Ketik \"Nyalakan lampu\" atau \"Matikan lampu\" dari keyboard rekam suara Anda.";
      
      bot.sendMessage(chat_id, welcome, "Markdown");
    } 
    else if (cmdLower == "/status") {
      String statusMsg = "📊 *STATUS SISTEM SMART HOME*\\n";
      statusMsg += "💡 Lampu 1: " + String(relay1_status ? "🟢 ON" : "🔴 OFF") + "\\n";
      statusMsg += "💡 Lampu 2: " + String(relay2_status ? "🟢 ON" : "🔴 OFF") + "\\n";
      statusMsg += "💡 Lampu 3: " + String(relay3_status ? "🟢 ON" : "🔴 OFF") + "\\n";
      statusMsg += "💡 Lampu 4: " + String(relay4_status ? "🟢 ON" : "🔴 OFF") + "\\n\\n";
      statusMsg += "🌡️ Suhu: *" + String(current_temp) + "°C*\\n";
      statusMsg += "💦 Kelembaban: *" + String(current_hum) + "%*";
      
      bot.sendMessage(chat_id, statusMsg, "Markdown");
    }
    else if (cmdLower == "/sensor") {
      String sensorMsg = "🌡️ *Pembacaan DHT11/22:*\\n";
      sensorMsg += "- Suhu: *" + String(current_temp) + "°C*\\n";
      sensorMsg += "- Kelembaban: *" + String(current_hum) + "%*";
      bot.sendMessage(chat_id, sensorMsg, "Markdown");
    }
    // 2. KONTROL LAMPU INDIVIDUAL
    else if (cmdLower == "/lampu1_on" || cmdLower == "nyalakan lampu 1") {
      controlRelay(1, true);
    } 
    else if (cmdLower == "/lampu1_off" || cmdLower == "matikan lampu 1") {
      controlRelay(1, false);
    }
    else if (cmdLower == "/lampu2_on" || cmdLower == "nyalakan lampu 2") {
      controlRelay(2, true);
    } 
    else if (cmdLower == "/lampu2_off" || cmdLower == "matikan lampu 2") {
      controlRelay(2, false);
    }
    else if (cmdLower == "/lampu3_on" || cmdLower == "nyalakan lampu 3") {
      controlRelay(3, true);
    } 
    else if (cmdLower == "/lampu3_off" || cmdLower == "matikan lampu 3") {
      controlRelay(3, false);
    }
    else if (cmdLower == "/lampu4_on" || cmdLower == "nyalakan lampu 4") {
      controlRelay(4, true);
    } 
    else if (cmdLower == "/lampu4_off" || cmdLower == "matikan lampu 4") {
      controlRelay(4, false);
    }
    // 3. OPERASI GLOBAL & POLA VARIASI
    else if (cmdLower == "/all_on" || cmdLower == "nyalakan semua lampu" || cmdLower == "nyalakan lampu") {
      controlRelay(1, true);
      controlRelay(2, true);
      controlRelay(3, true);
      controlRelay(4, true);
      bot.sendMessage(chat_id, "🟢 *Seluruh lampu dinyalakan!*", "Markdown");
    }
    else if (cmdLower == "/all_off" || cmdLower == "matikan semua lampu" || cmdLower == "matikan lampu") {
      allOff();
      bot.sendMessage(chat_id, "🔴 *Seluruh lampu dimatikan!*", "Markdown");
    }
    else if (cmdLower == "/variasi1" || cmdLower == "nyalakan variasi 1") {
      variation1_active = true;
    }
    else if (cmdLower == "/variasi2" || cmdLower == "nyalakan variasi 2") {
      variation2_active = true;
    }
    // 4. VOICE TYPING FALLBACKS
    else if (cmdLower.includes("temperatur") || cmdLower.includes("kelembapan")) {
      String sensorMsg = "🌡️ *Informasi Cuaca Smart Home:*\\n";
      sensorMsg += "Suhu: " + String(current_temp) + "C. Kelembaban: " + String(current_hum) + "%";
      bot.sendMessage(chat_id, sensorMsg, "");
    }
    else {
      bot.sendMessage(chat_id, "🤔 Maaf, perintah tidak dikenali. Ketik /start untuk bantuan.", "");
    }
  }
}
`;
}
