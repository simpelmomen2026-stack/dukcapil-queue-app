/**
 * SI-ANTRI DUKCAPIL - Core Application Engine & RBAC Authentication Manager
 * Kabupaten Kepulauan Sangihe Edition - Exact Google Sheet 'petugas' Sync
 */

const STORAGE_KEY = 'dukcapil_queue_data_v1';
const CHANNEL_NAME = 'dukcapil_queue_channel';
const AUTH_SESSION_KEY = 'dukcapil_user_session_v1';
const GOOGLE_SHEET_ID = '169cLHhc22o4az0BfJY_OLRmMZDVOtaJ0eaD2y1chQfU';
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwaPsDHSsBtQAseheW1rmx7BVMsIX4U4X_wr7LRZLdou4OjfwfE4p7cS75qJcJf33pg/exec';

/**
 * Send background sync request to Google Apps Script Web App
 */
async function syncTicketToGoogleSheet(action, data) {
  if (!GOOGLE_APPS_SCRIPT_URL) return;
  try {
    const payload = {
      action: action,
      ...data,
      timestamp: new Date().toISOString()
    };
    await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log(`📡 [GAS Sync Sent] Action: ${action}`, data);
  } catch (err) {
    console.warn('⚠️ Google Apps Script sync warning:', err);
  }
}


// Exact Petugas Accounts from Google Sheet (https://docs.google.com/spreadsheets/d/169cLHhc22o4az0BfJY_OLRmMZDVOtaJ0eaD2y1chQfU)
const defaultPetugasList = [
  { username: 'admin', password: '123456', name: 'Davidson Djarang', role: 'admin', loket: 'ALL' },
  { username: 'Fransin', password: '123456', name: 'Fransin Makaminan', role: 'Operator A', loket: '1' },
  { username: 'Haryati', password: '123456', name: 'Haryati Sambai', role: 'Operator A', loket: '2' },
  { username: 'Rina', password: '123456', name: 'Rina Taidi', role: 'Operator A', loket: '3' },
  { username: 'Sergio', password: '123456', name: 'Sergio Banua', role: 'Operator A', loket: '4' },
  { username: 'Seane', password: '123456', name: 'Seane Lawere', role: 'Operator B', loket: '5' },
  { username: 'Jeklin', password: '123456', name: 'Jagulien Buisan', role: 'Operator B', loket: '6' },
  { username: 'Sosto', password: '123456', name: 'Fransosto Damasing', role: 'Operator C', loket: '7' },
  { username: 'Yan', password: '123456', name: 'Yan Tinungki', role: 'Operator C', loket: '8' }
];

// Default Application State Structure (3 Categories A, B, C & 8 Lokets)
const defaultState = {
  settings: {
    instansiName: 'DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL',
    subTitle: 'KABUPATEN KEPULAUAN SANGIHE',
    runningText: 'Selamat datang di Dinas Kependudukan dan Pencatatan Sipil Kabupaten Kepulauan Sangihe. Harap menyiapkan berkas persyaratan NIK / Kartu Keluarga sebelum menuju ke Loket Petugas.',
    voiceEnabled: true,
    totalLoket: 8,
    logoUrl: 'images/logo-sangihe.png'
  },
  operatingHours: [
    { day: 'Senin', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { day: 'Selasa', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { day: 'Rabu', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { day: 'Kamis', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { day: 'Jumat', isOpen: true, openTime: '08:00', closeTime: '11:30' },
    { day: 'Sabtu', isOpen: true, openTime: '08:00', closeTime: '12:00' }
  ],
  categories: [
    { code: 'A', name: 'Pengurusan Dokumen Kependudukan', desc: 'Permohonan baru, perubahan data, dan pengurusan seluruh berkas kependudukan', color: '#3b82f6' },
    { code: 'B', name: 'Pengambilan Dokumen', desc: 'Pengambilan fisik dokumen Kartu Keluarga, Akta Kelahiran/Kematian, SKPWNI, dll', color: '#10b981' },
    { code: 'C', name: 'Pengambilan KTP / KIA', desc: 'Loket khusus pengambilan fisik KTP-el yang sudah dicetak dan Kartu Identitas Anak', color: '#8b5cf6' }
  ],
  lokets: {
    1: { id: 1, name: 'Loket 1', activeTicket: null, categoryFilter: 'ALL', status: 'READY' },
    2: { id: 2, name: 'Loket 2', activeTicket: null, categoryFilter: 'ALL', status: 'READY' },
    3: { id: 3, name: 'Loket 3', activeTicket: null, categoryFilter: 'ALL', status: 'READY' },
    4: { id: 4, name: 'Loket 4', activeTicket: null, categoryFilter: 'ALL', status: 'READY' },
    5: { id: 5, name: 'Loket 5', activeTicket: null, categoryFilter: 'ALL', status: 'READY' },
    6: { id: 6, name: 'Loket 6', activeTicket: null, categoryFilter: 'ALL', status: 'READY' },
    7: { id: 7, name: 'Loket 7', activeTicket: null, categoryFilter: 'ALL', status: 'READY' },
    8: { id: 8, name: 'Loket 8', activeTicket: null, categoryFilter: 'ALL', status: 'READY' }
  },
  counters: { A: 0, B: 0, C: 0 },
  tickets: [],
  lastCalledTicket: null
};

class AuthEngine {
  constructor() {
    this.petugasList = [...defaultPetugasList];
    this.loadPetugasFromSheet();
  }

  // Attempt reading remote Google Sheet 'petugas' tab dynamically
  async loadPetugasFromSheet() {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv`;
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        const lines = text.split('\n');
        const parsed = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 5 && cols[0] && cols[1]) {
            parsed.push({
              username: cols[0],
              password: cols[1],
              name: cols[2] || cols[0],
              role: cols[3] || 'Operator A',
              loket: cols[4] || 'ALL'
            });
          }
        }

        if (parsed.length > 0) {
          this.petugasList = parsed;
          console.log('✅ Live sync data petugas dari Google Sheet:', parsed.length, 'user');
        }
      }
    } catch (e) {
      console.warn('Menggunakan data petugas fallback:', e);
    }
  }

  // Authenticate user by username & password (Case-insensitive username)
  async login(username, password) {
    await this.loadPetugasFromSheet();
    const user = this.petugasList.find(
      p => p.username.toLowerCase() === username.trim().toLowerCase() && String(p.password).trim() === String(password).trim()
    );

    if (user) {
      const session = {
        username: user.username,
        name: user.name,
        role: user.role, // 'admin', 'Operator A', 'Operator B', 'Operator C'
        loket: user.loket || 'ALL',
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }
    return { success: false, message: 'Username atau password salah! Periksa data di Sheet Petugas.' };
  }

  getCurrentUser() {
    try {
      const data = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  logout() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }
}

class QueueEngine {
  constructor() {
    this.state = this.loadState();
    this.channel = null;
    this.audioCtx = null;
    this.isAudioUnlocked = false;
    
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        this.handleRemoteMessage(event.data);
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.state = this.loadState();
        this.notifyUI('LOCAL_STORAGE_CHANGE');
      }
    });

    this.listeners = [];

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }

  loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.settings.totalLoket = 8;
        parsed.categories = defaultState.categories;
        if (!parsed.operatingHours || !Array.isArray(parsed.operatingHours) || parsed.operatingHours.length === 0) {
          parsed.operatingHours = defaultState.operatingHours;
        }
        for (let i = 1; i <= 8; i++) {
          if (!parsed.lokets[i]) {
            parsed.lokets[i] = { id: i, name: 'Loket ' + i, activeTicket: null, categoryFilter: 'ALL', status: 'READY' };
          }
        }
        parsed.settings.subTitle = 'KABUPATEN KEPULAUAN SANGIHE';
        parsed.settings.logoUrl = 'images/logo-sangihe.png';
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load queue state:', e);
    }
    this.saveState(defaultState);
    return JSON.parse(JSON.stringify(defaultState));
  }

  saveState(stateToSave) {
    this.state = stateToSave || this.state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save queue state:', e);
    }
  }

  broadcast(type, payload = {}) {
    this.saveState();
    const msg = { type, payload, timestamp: Date.now() };
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    this.notifyUI(type, payload);
  }

  handleRemoteMessage(data) {
    this.state = this.loadState();
    this.notifyUI(data.type, data.payload);
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyUI(type, payload) {
    this.listeners.forEach(cb => cb(type, payload, this.state));
  }

  // --- ACTIONS ---
  generateTicket(catCode, token = '') {
    const code = catCode.toUpperCase();
    this.state.counters[code] = (this.state.counters[code] || 0) + 1;
    const numSeq = this.state.counters[code];
    const ticketNumber = `${code}-${String(numSeq).padStart(3, '0')}`;

    const categoryObj = this.state.categories.find(c => c.code === code);
    const newTicket = {
      id: 'T_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      number: ticketNumber,
      categoryCode: code,
      categoryName: categoryObj ? categoryObj.name : code,
      token: token || '-',
      status: 'WAITING',
      timestamp: new Date().toISOString(),
      calledByLoket: null
    };

    this.state.tickets.push(newTicket);
    this.broadcast('TICKET_CREATED', { ticket: newTicket });
    syncTicketToGoogleSheet('ADD_TICKET', { ticket: newTicket });
    return newTicket;
  }

  callNextTicket(loketId, categoryFilter = 'ALL') {
    const waitingTickets = this.state.tickets.filter(t => {
      if (t.status !== 'WAITING') return false;
      if (categoryFilter !== 'ALL' && t.categoryCode !== categoryFilter) return false;
      return true;
    });

    if (waitingTickets.length === 0) {
      return null;
    }

    const nextTicket = waitingTickets[0];
    nextTicket.status = 'SERVING';
    nextTicket.calledByLoket = loketId;
    nextTicket.calledAt = new Date().toISOString();

    if (this.state.lokets[loketId].activeTicket) {
      const prevTicket = this.state.tickets.find(t => t.id === this.state.lokets[loketId].activeTicket.id);
      if (prevTicket && prevTicket.status === 'SERVING') {
        prevTicket.status = 'FINISHED';
        syncTicketToGoogleSheet('UPDATE_STATUS', { ticketId: prevTicket.id, number: prevTicket.number, status: 'FINISHED', loketId: loketId });
      }
    }

    this.state.lokets[loketId].activeTicket = nextTicket;
    this.state.lokets[loketId].status = 'BUSY';
    this.state.lastCalledTicket = {
      ticket: nextTicket,
      loketId: loketId,
      time: Date.now()
    };

    this.broadcast('TICKET_CALLED', { ticket: nextTicket, loketId });
    syncTicketToGoogleSheet('UPDATE_STATUS', { 
      ticketId: nextTicket.id, 
      number: nextTicket.number, 
      categoryCode: nextTicket.categoryCode, 
      token: nextTicket.token, 
      status: 'SERVING', 
      loketId: loketId 
    });
    return nextTicket;
  }

  recallTicket(loketId) {
    const loket = this.state.lokets[loketId];
    if (!loket || !loket.activeTicket) return null;

    this.state.lastCalledTicket = {
      ticket: loket.activeTicket,
      loketId: loketId,
      time: Date.now()
    };

    this.broadcast('TICKET_RECALLED', { ticket: loket.activeTicket, loketId });
    syncTicketToGoogleSheet('UPDATE_STATUS', { 
      ticketId: loket.activeTicket.id, 
      number: loket.activeTicket.number, 
      status: 'SERVING', 
      loketId: loketId,
      isRecall: true 
    });
    return loket.activeTicket;
  }

  skipTicket(loketId) {
    const loket = this.state.lokets[loketId];
    if (!loket || !loket.activeTicket) return null;

    const ticket = this.state.tickets.find(t => t.id === loket.activeTicket.id);
    if (ticket) {
      ticket.status = 'SKIPPED';
    }

    loket.activeTicket = null;
    loket.status = 'READY';

    this.broadcast('TICKET_SKIPPED', { ticket, loketId });
    if (ticket) {
      syncTicketToGoogleSheet('UPDATE_STATUS', { ticketId: ticket.id, number: ticket.number, status: 'SKIPPED', loketId: loketId });
    }
    return ticket;
  }

  finishTicket(loketId) {
    const loket = this.state.lokets[loketId];
    if (!loket || !loket.activeTicket) return null;

    const ticket = this.state.tickets.find(t => t.id === loket.activeTicket.id);
    if (ticket) {
      ticket.status = 'FINISHED';
    }

    loket.activeTicket = null;
    loket.status = 'READY';

    this.broadcast('TICKET_FINISHED', { ticket, loketId });
    if (ticket) {
      syncTicketToGoogleSheet('UPDATE_STATUS', { ticketId: ticket.id, number: ticket.number, status: 'FINISHED', loketId: loketId });
    }
    return ticket;
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.broadcast('SETTINGS_UPDATED', { settings: this.state.settings });
  }

  updateOperatingHours(newHours) {
    this.state.operatingHours = newHours;
    this.broadcast('OPERATING_HOURS_UPDATED', { operatingHours: this.state.operatingHours });
  }

  getTodayOperatingStatus() {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    const todayName = dayNames[now.getDay()];

    const schedule = (this.state.operatingHours || defaultState.operatingHours).find(h => h.day === todayName);

    if (!schedule) {
      return {
        isOpen: false,
        dayName: todayName,
        openTime: '-',
        closeTime: '-',
        statusText: `Hari ${todayName} Pelayanan Tutup / Libur`
      };
    }

    if (!schedule.isOpen) {
      return {
        isOpen: false,
        dayName: todayName,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        statusText: `Hari ${todayName} Pelayanan Ditutup`
      };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = (schedule.openTime || '08:00').split(':').map(Number);
    const [closeH, closeM] = (schedule.closeTime || '15:00').split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const isOpenNow = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

    return {
      isOpen: isOpenNow,
      dayName: todayName,
      openTime: schedule.openTime,
      closeTime: schedule.closeTime,
      statusText: isOpenNow 
        ? `PELAYANAN BUKA (${schedule.openTime} - ${schedule.closeTime} WITA)` 
        : (currentMinutes < openMinutes 
            ? `BELUM BUKA (Jam Operasional: ${schedule.openTime} - ${schedule.closeTime} WITA)` 
            : `SUDAH TUTUP (Jam Operasional Hari Ini: ${schedule.openTime} - ${schedule.closeTime} WITA)`)
    };
  }

  resetQueue() {
    this.state.counters = { A: 0, B: 0, C: 0 };
    this.state.tickets = [];
    this.state.lastCalledTicket = null;
    for (let i = 1; i <= 8; i++) {
      this.state.lokets[i] = { id: i, name: 'Loket ' + i, activeTicket: null, categoryFilter: 'ALL', status: 'READY' };
    }
    this.broadcast('QUEUE_RESET');
    syncTicketToGoogleSheet('RESET_QUEUE', {});
  }

  // --- AUDIO SYNTHESIS & VOICE CALL ---
  unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx && AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.isAudioUnlocked = true;

      if ('speechSynthesis' in window) {
        const dummyUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(dummyUtterance);
      }
    } catch (e) {
      console.warn('Unlock audio failed:', e);
    }
  }

  playAirportChime() {
    return new Promise((resolve) => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) { resolve(); return; }
        
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }

        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;

        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(554.37, now); // C#5
        osc1.frequency.setValueAtTime(659.25, now + 0.25); // E5

        osc2.frequency.setValueAtTime(440.00, now); // A4
        osc2.frequency.setValueAtTime(554.37, now + 0.25); // C#5

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);

        setTimeout(() => {
          resolve();
        }, 800);
      } catch (e) {
        console.warn('Audio chime failed:', e);
        resolve();
      }
    });
  }

  async speakTicketCall(ticketNumber, loketNumber) {
    if (!this.state.settings.voiceEnabled) return;
    
    await this.playAirportChime();

    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API tidak didukung pada browser ini.');
      return;
    }

    window.speechSynthesis.cancel();

    function convertTwoDigitsToIndonesian(num) {
      const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
      if (num < 10) return ones[num];
      if (num === 10) return 'sepuluh';
      if (num === 11) return 'sebelas';
      if (num < 20) return ones[num % 10] + ' belas';
      
      const tensDigit = Math.floor(num / 10);
      const onesDigit = num % 10;
      if (onesDigit === 0) return ones[tensDigit] + ' puluh';
      return ones[tensDigit] + ' puluh ' + ones[onesDigit];
    }

    function convertThreeDigitsToIndonesian(num) {
      if (num < 100) return convertTwoDigitsToIndonesian(num);
      const hundredDigit = Math.floor(num / 100);
      const remainder = num % 100;
      let hundredStr = (hundredDigit === 1) ? 'seratus' : (convertTwoDigitsToIndonesian(hundredDigit) + ' ratus');
      if (remainder === 0) return hundredStr;
      return hundredStr + ' ' + convertTwoDigitsToIndonesian(remainder);
    }

    function getIndonesianNumberWords(digitsRaw) {
      const val = parseInt(digitsRaw, 10);
      if (isNaN(val)) return [digitsRaw];

      const singleDigitMap = {
        '0': 'nol', '1': 'satu', '2': 'dua', '3': 'tiga', '4': 'empat',
        '5': 'lima', '6': 'enam', '7': 'tujuh', '8': 'delapan', '9': 'sembilan'
      };

      // 001 s.d. 009 -> ["nol", "nol", "satu"] s.d. ["nol", "nol", "sembilan"]
      if (digitsRaw.startsWith('00')) {
        const lastChar = digitsRaw.charAt(2);
        return ['nol', 'nol', singleDigitMap[lastChar] || 'satu'];
      }

      // 010 s.d. 099 -> ["nol", "sepuluh"], ["nol", "sebelas"], ["nol", "dua puluh"], dst.
      if (digitsRaw.startsWith('0')) {
        const lastTwoVal = parseInt(digitsRaw.substring(1), 10);
        return ['nol', convertTwoDigitsToIndonesian(lastTwoVal)];
      }

      // 100 ke atas (100, 101, dst.) -> ["seratus"], ["seratus satu"], dst.
      return [convertThreeDigitsToIndonesian(val)];
    }

    const ticketParts = ticketNumber.split('-');
    const code = ticketParts[0];
    const digitsRaw = ticketParts[1] || '001';
    const numberWords = getIndonesianNumberWords(digitsRaw);

    // Cari profil suara perempuan Bahasa Indonesia lembut & hangat
    const voices = window.speechSynthesis.getVoices();
    const indonesianVoices = voices.filter(v => {
      if (!v.lang) return false;
      const l = v.lang.toLowerCase();
      return l.startsWith('id') || l.includes('id-') || l.includes('id_') || l.includes('ind');
    });

    let selectedVoice = null;
    if (indonesianVoices.length > 0) {
      selectedVoice = indonesianVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('google') || name.includes('aris') || name.includes('indah') || 
               name.includes('gadis') || name.includes('damayanti') || name.includes('wulan') || 
               name.includes('female') || name.includes('woman') || name.includes('natural');
      }) || indonesianVoices[0];
    }

    // Urutan pemanggilan audio berantai dengan jeda presisi 0.5 detik
    const sequence = [
      { text: 'Nomor antrian', delayAfter: 350 },
      { text: code.toLowerCase(), delayAfter: 500 } // Diucapkan murni "a" tanpa sebutan "huruf besar"
    ];

    // Jeda 0.5 detik antar elemen sebutan nomor (misal "nol" -> 0.5s -> "sepuluh")
    numberWords.forEach((word) => {
      sequence.push({ text: word, delayAfter: 500 });
    });

    sequence.push({ text: `silakan menuju ke Loket ${loketNumber}`, delayAfter: 200 });

    let index = 0;
    const speakNext = () => {
      if (index >= sequence.length) return;

      const item = sequence[index];
      index++;

      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.58; // Tempo ekstra lambat, lembut, dan sensual/anggun
      utterance.pitch = 0.95; // Nada hangat, empuk, dan merdu
      utterance.volume = 1.0;
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onend = () => {
        setTimeout(speakNext, item.delayAfter || 500);
      };

      utterance.onerror = (e) => {
        console.warn('Utterance error:', e);
        setTimeout(speakNext, 200);
      };

      window.speechSynthesis.speak(utterance);
    };

    setTimeout(speakNext, 150);
  }
}

// Global Engine & Auth Instances
window.queueEngine = new QueueEngine();
window.authEngine = new AuthEngine();

function initRealtimeClock() {
  const clockTimeEl = document.getElementById('clockTime');
  const clockDateEl = document.getElementById('clockDate');
  if (!clockTimeEl || !clockDateEl) return;

  function update() {
    const now = new Date();
    clockTimeEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    clockDateEl.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  update();
  setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initRealtimeClock();
});
