// ================================================================
// FACEATTENDANCE.JS v2.0 — Teacher Face Recognition Attendance
// Fixed: Reliable model loading, Big success popup, Better UX
// ================================================================

const FaceAttendance = (() => {

  let modelsLoaded   = false;
  let modelLoading   = false;
  let stream         = null;
  let regStream      = null;
  let detectionLoop  = null;
  let faceMatcher    = null;
  let isRunning      = false;
  let capturedSamples = [];
  let recognizedToday = new Set();
  let lastDetectTime  = {};

  const MODEL_URLS = [
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
    'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
  ];

  // ================================================================
  //  MAIN PAGE RENDER
  // ================================================================
  function render() {
    const container = document.getElementById('face-attendance-container');
    if (!container) return;

    const today    = Utils.todayStr();
    const todayAtt = DB.get('staff_attendance', []).filter(a => a.date === today && a.method === 'face-recognition');
    recognizedToday = new Set(todayAtt.map(a => a.teacherId));

    container.innerHTML = buildHTML();
    addStyles();
    loadModels();
  }

  // ================================================================
  //  HTML BUILDER
  // ================================================================
  function buildHTML() {
    const teachers = DB.get('teachers', []);
    const today    = Utils.todayStr();
    const staffAtt = DB.get('staff_attendance', []).filter(a => a.date === today);
    const faceData = DB.get('teacher_face_data', {});
    const present  = staffAtt.filter(a => a.status === 'present').length;
    const pct      = teachers.length > 0 ? Math.round(present / teachers.length * 100) : 0;

    return `
<!-- ══════════════════════════════════════════════════
     SUCCESS OVERLAY
══════════════════════════════════════════════════ -->
<div id="fa-overlay" style="
  display:none; position:fixed; inset:0; z-index:99999;
  background:rgba(0,0,0,.65); backdrop-filter:blur(4px);
  align-items:center; justify-content:center; flex-direction:column; gap:0">
  <div style="
    background:#fff; border-radius:28px; padding:44px 52px; text-align:center;
    max-width:420px; width:90%; box-shadow:0 40px 100px rgba(0,0,0,.5);
    animation:popIn .45s cubic-bezier(.175,.885,.32,1.275)">
    <div style="font-size:80px; line-height:1; margin-bottom:10px">✅</div>
    <div style="font-size:28px; font-weight:900; color:#15803d; margin-bottom:4px" id="fa-suc-name">—</div>
    <div style="font-size:16px; color:#374151; font-weight:600; margin-bottom:2px">Attendance Mark Ho Gayi!</div>
    <div style="font-size:13px; color:#9ca3af; margin-bottom:22px" id="fa-suc-time"></div>
    <div style="background:#f0fdf4; border:2px solid #86efac; border-radius:14px; padding:16px 20px; margin-bottom:22px">
      <div style="font-size:12px; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:.05em">Aaj Ki Attendance</div>
      <div style="font-size:36px; font-weight:900; color:#15803d; margin:4px 0" id="fa-suc-count">0</div>
      <div style="font-size:12px; color:#6b7280" id="fa-suc-total"></div>
    </div>
    <button onclick="FaceAttendance.hideSuccess()" style="
      background:linear-gradient(135deg,#15803d,#166534); color:#fff; border:none;
      padding:14px 32px; border-radius:12px; font-size:16px; font-weight:800;
      cursor:pointer; width:100%; letter-spacing:.03em">
      👍 Theek Hai, Continue!
    </button>
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     STATUS BAR
══════════════════════════════════════════════════ -->
<div id="fa-status-bar" class="fa-status-bar loading">
  <div style="display:flex; align-items:center; gap:12px; flex:1">
    <div class="fa-spinner" id="fa-spinner"></div>
    <div>
      <div style="font-weight:700; font-size:14px" id="fa-stat-title">AI Models Load Ho Rahe Hain...</div>
      <div style="font-size:12px; opacity:.75" id="fa-stat-sub">Pehli baar thoda time lagta hai (~15 sec)</div>
    </div>
  </div>
  <div style="flex-shrink:0; min-width:140px">
    <div style="font-size:11px; opacity:.7; margin-bottom:4px" id="fa-prog-label">0%</div>
    <div style="background:rgba(255,255,255,.2); border-radius:99px; height:6px; overflow:hidden">
      <div id="fa-prog-bar" style="height:100%; background:#fff; border-radius:99px; width:0%; transition:width .3s"></div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     MAIN ROW
══════════════════════════════════════════════════ -->
<div class="row g-4">

  <!-- LEFT: Camera Panel -->
  <div class="col-lg-8">
    <div class="card" style="overflow:hidden">
      <div class="card-header d-flex justify-content-between align-items-center" style="padding:14px 18px">
        <div class="card-title">📷 Live Face Recognition</div>
        <div style="display:flex; align-items:center; gap:8px">
          <span id="fa-fps" style="font-size:11px; color:var(--text-muted); display:none"></span>
          <span id="fa-live-indicator" style="display:none; align-items:center; gap:5px">
            <span style="width:8px; height:8px; border-radius:50%; background:#22c55e; animation:pulseDot 1.5s infinite; display:inline-block"></span>
            <span style="font-size:12px; font-weight:700; color:#22c55e">LIVE</span>
          </span>
        </div>
      </div>

      <!-- Video Area -->
      <div style="position:relative; background:#0f172a; min-height:360px; display:flex; align-items:center; justify-content:center">
        <video id="fa-video" autoplay muted playsinline
          style="width:100%; max-height:430px; display:block; transform:scaleX(-1)"></video>
        <canvas id="fa-canvas"
          style="position:absolute; top:0; left:0; width:100%; height:100%; transform:scaleX(-1); pointer-events:none"></canvas>

        <!-- Placeholder -->
        <div id="fa-placeholder" style="
          position:absolute; inset:0; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:12px">
          <div style="font-size:72px; opacity:.4">📷</div>
          <div style="color:rgba(255,255,255,.5); font-size:16px; font-weight:600">Camera Start Karein</div>
          <div style="color:rgba(255,255,255,.3); font-size:13px">Roshan jagah mein baithein</div>
        </div>

        <!-- Bottom label -->
        <div id="fa-scan-label" style="
          display:none; position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
          background:rgba(0,0,0,.75); color:#fff; font-size:13px; font-weight:700;
          padding:9px 22px; border-radius:99px; white-space:nowrap; backdrop-filter:blur(6px)">
          🔍 Scan kar raha hai...
        </div>
      </div>

      <!-- Controls -->
      <div style="padding:16px; display:flex; gap:12px; justify-content:center; align-items:center; flex-wrap:wrap">
        <button id="fa-start-btn" class="btn btn-primary" style="padding:11px 36px; font-weight:800; font-size:15px"
          onclick="FaceAttendance.startCamera()" disabled>
          📷 Camera Shuru Karein
        </button>
        <button id="fa-stop-btn" class="btn btn-outline-danger" style="padding:11px 24px; font-weight:700; display:none"
          onclick="FaceAttendance.stopCamera()">
          ⏹ Band Karein
        </button>
      </div>

      <!-- Tips -->
      <div style="padding:0 16px 16px; display:flex; gap:8px; flex-wrap:wrap; justify-content:center">
        <span class="fa-tip">☀️ Roshan jagah</span>
        <span class="fa-tip">👁️ Seedha dekhein</span>
        <span class="fa-tip">📏 30-70cm door</span>
        <span class="fa-tip">🚫 Bina mask ke</span>
      </div>
    </div>
  </div>

  <!-- RIGHT: Stats -->
  <div class="col-lg-4">
    <!-- Big counter card -->
    <div style="
      background:linear-gradient(160deg,#1e3a8a,#4c1d95);
      border-radius:18px; padding:22px 20px; color:#fff; margin-bottom:16px">
      <div style="font-size:12px; opacity:.7; margin-bottom:6px; font-weight:600; letter-spacing:.06em; text-transform:uppercase">Aaj Ki Attendance</div>
      <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:10px">
        <div style="font-size:56px; font-weight:900; line-height:1" id="fa-big-num">${present}</div>
        <div style="font-size:20px; opacity:.6">/ ${teachers.length}</div>
      </div>
      <div style="background:rgba(255,255,255,.15); border-radius:99px; height:8px; overflow:hidden; margin-bottom:8px">
        <div id="fa-att-prog" style="height:100%; background:linear-gradient(90deg,#4ade80,#22c55e); border-radius:99px; width:${pct}%; transition:width .6s ease"></div>
      </div>
      <div style="font-size:12px; opacity:.7">${pct}% teachers present</div>
    </div>

    <!-- Teacher List -->
    <div class="card" style="max-height:440px; overflow-y:auto">
      <div class="card-header d-flex justify-content-between align-items-center" style="padding:12px 14px">
        <div style="font-weight:700; font-size:13px">👩‍🏫 Teacher Status</div>
        <button class="btn btn-xs btn-primary" onclick="FaceAttendance.openRegister()">➕ Register</button>
      </div>
      <div id="fa-teacher-list">
        ${buildTeacherList(teachers, staffAtt, faceData)}
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     REGISTERED FACES
══════════════════════════════════════════════════ -->
<div class="card mt-4">
  <div class="card-header d-flex justify-content-between align-items-center">
    <div class="card-title">🔐 Face Registration Status</div>
    <button class="btn btn-sm btn-primary" onclick="FaceAttendance.openRegister()">➕ Face Register Karein</button>
  </div>
  <div class="card-body">
    ${teachers.length === 0
      ? `<div style="text-align:center;color:#9ca3af;padding:24px">Koi teacher nahi. Pehle teacher add karein.</div>`
      : `<div style="display:flex;gap:12px;flex-wrap:wrap">${
          teachers.map(t => {
            const has = !!(faceData[t.id]?.length > 0);
            return `
            <div style="border:2px solid ${has?'#86efac':'#fca5a5'};border-radius:14px;padding:14px;display:flex;align-items:center;gap:10px;min-width:190px;background:${has?'#f0fdf4':'#fff5f5'}">
              ${t.photo
                ? `<img src="${t.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">`
                : `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:18px;flex-shrink:0">${Utils.avatar(t.name)}</div>`
              }
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
                <div style="font-size:11px;font-weight:700;color:${has?'#15803d':'#dc2626'}">${has?`✅ ${faceData[t.id].length} samples`:'❌ Register Karein'}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                <button class="btn btn-xs btn-outline-primary" onclick="FaceAttendance.openRegisterFor('${t.id}')" title="${has?'Update':'Register'}">${has?'🔄':'➕'}</button>
                ${has?`<button class="btn btn-xs btn-outline-danger" onclick="FaceAttendance.removeFace('${t.id}','${t.name}')" title="Remove">🗑️</button>`:''}
              </div>
            </div>`;
          }).join('')
        }</div>`
    }
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     MANUAL OVERRIDE
══════════════════════════════════════════════════ -->
<div class="card mt-4">
  <div class="card-header"><div class="card-title">✏️ Manual Attendance (Backup)</div></div>
  <div class="card-body">
    <div class="row g-3 align-items-end">
      <div class="col-md-4">
        <label class="form-label fw-bold">Teacher</label>
        <select id="fa-manual-t" class="form-select">
          <option value="">— Select —</option>
          ${DB.get('teachers',[]).map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label fw-bold">Status</label>
        <select id="fa-manual-s" class="form-select">
          <option value="present">✅ Present</option>
          <option value="absent">❌ Absent</option>
          <option value="late">⏰ Late</option>
          <option value="leave">🌿 Leave</option>
        </select>
      </div>
      <div class="col-auto">
        <button class="btn btn-success px-4 fw-bold" onclick="FaceAttendance.manualMark()">💾 Mark</button>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     REGISTER MODAL
══════════════════════════════════════════════════ -->
<div class="modal fade" id="faceRegModal" tabindex="-1">
  <div class="modal-dialog modal-xl modal-dialog-centered">
    <div class="modal-content" style="border:none;border-radius:20px;overflow:hidden">
      <div class="modal-header" style="background:linear-gradient(135deg,#1e40af,#7c3aed);border:none;padding:20px 24px">
        <h5 class="modal-title" style="color:#fff;font-weight:800;font-size:18px">🔐 Teacher Face Register</h5>
        <button class="btn-close btn-close-white" data-bs-dismiss="modal" onclick="FaceAttendance.stopRegCam()"></button>
      </div>
      <div class="modal-body p-0">
        <div class="row g-0">
          <!-- Left panel -->
          <div class="col-md-4" style="padding:24px;background:#f8fafc;border-right:1px solid #e2e8f0">
            <label class="form-label fw-bold mb-1">Teacher *</label>
            <select id="reg-tsel" class="form-select mb-3" onchange="FaceAttendance.onTSelect()">
              <option value="">— Select Teacher —</option>
              ${DB.get('teachers',[]).map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
            </select>

            <!-- Step guide -->
            <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e2e8f0">
              <div style="font-weight:800;font-size:13px;margin-bottom:10px;color:#374151">📋 Steps</div>
              <div class="fa-reg-step" id="rs1">1️⃣ Teacher select karein</div>
              <div class="fa-reg-step" id="rs2">2️⃣ Camera on karein</div>
              <div class="fa-reg-step" id="rs3">3️⃣ Seedha camera mein dekhein</div>
              <div class="fa-reg-step" id="rs4">4️⃣ 📸 Capture 5 baar dabaayen</div>
              <div class="fa-reg-step" id="rs5">5️⃣ 💾 Save karein</div>
            </div>

            <!-- Tip box -->
            <div style="background:#fef9c3;border-radius:10px;padding:12px;font-size:12px;color:#92400e;margin-bottom:16px">
              <b>💡 Best results:</b><br>
              • Roshan jagah mein beithein<br>
              • Glasses on & off dono try karein<br>
              • Thoda left, right, seedha — alag angles
            </div>

            <!-- Sample counter -->
            <div style="text-align:center">
              <div style="font-size:13px;color:#6b7280;margin-bottom:4px">Samples Captured</div>
              <div style="font-size:48px;font-weight:900;color:#1e40af;line-height:1" id="reg-cnt">0</div>
              <div style="font-size:12px;color:#9ca3af">/ 5 (3 minimum)</div>
              <div style="display:flex;gap:6px;justify-content:center;margin-top:10px" id="reg-dots">
                ${[1,2,3,4,5].map(i=>`<div id="rdot${i}" style="width:16px;height:16px;border-radius:50%;background:#e2e8f0;transition:.3s"></div>`).join('')}
              </div>
            </div>
            <!-- Thumbnails -->
            <div id="reg-thumbs" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;justify-content:center"></div>
          </div>

          <!-- Right: Camera -->
          <div class="col-md-8" style="padding:20px;background:#fff">
            <div style="position:relative;border-radius:16px;overflow:hidden;background:#0f172a;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;margin-bottom:14px">
              <video id="reg-vid" autoplay muted playsinline
                style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:none"></video>
              <canvas id="reg-cnv"
                style="position:absolute;inset:0;width:100%;height:100%;transform:scaleX(-1);display:none;pointer-events:none"></canvas>
              <!-- Oval guide -->
              <div id="reg-oval" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);width:180px;height:230px;border:3px dashed rgba(255,255,255,.4);border-radius:50%;pointer-events:none"></div>
              <!-- Placeholder -->
              <div id="reg-ph" style="color:rgba(255,255,255,.4);text-align:center">
                <div style="font-size:56px">👤</div>
                <div style="margin-top:8px;font-size:14px">Camera start karein</div>
              </div>
              <!-- Live status -->
              <div id="reg-live-bar" style="display:none;position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.75);color:#fff;font-size:13px;font-weight:700;padding:8px 22px;border-radius:99px;backdrop-filter:blur(6px)"></div>
            </div>

            <div class="d-flex gap-3 justify-content-center mb-3">
              <button id="reg-cam-btn" class="btn btn-outline-primary px-4 fw-bold" onclick="FaceAttendance.startRegCam()" disabled>📷 Camera On</button>
              <button id="reg-cap-btn" class="btn btn-success px-5 fw-bold" onclick="FaceAttendance.capture()" disabled style="font-size:16px">📸 Capture</button>
            </div>

            <div id="reg-feedback" style="text-align:center;font-size:14px;font-weight:600;color:#6b7280;min-height:28px">
              Teacher select karein aur camera on karein
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="justify-content:space-between;padding:14px 20px">
        <button class="btn btn-outline-danger btn-sm" onclick="FaceAttendance.clearSamples()">🗑️ Clear</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal" onclick="FaceAttendance.stopRegCam()">Cancel</button>
          <button id="reg-save-btn" class="btn btn-primary px-5 fw-bold" onclick="FaceAttendance.saveFace()" disabled>💾 Save Face</button>
        </div>
      </div>
    </div>
  </div>
</div>
    `;
  }

  function buildTeacherList(teachers, staffAtt, faceData) {
    if (!teachers.length) return `<div style="padding:20px;text-align:center;color:#9ca3af;font-size:13px">Koi teacher nahi</div>`;
    const statusStyle = {
      present: { bg:'#dcfce7', clr:'#15803d', txt:'✅ Present' },
      absent:  { bg:'#fee2e2', clr:'#dc2626', txt:'❌ Absent' },
      late:    { bg:'#fef9c3', clr:'#d97706', txt:'⏰ Late' },
      leave:   { bg:'#ede9fe', clr:'#7c3aed', txt:'🌿 Leave' },
    };
    return teachers.map(t => {
      const att = staffAtt.find(a => a.teacherId === t.id);
      const ss  = att ? statusStyle[att.status] : null;
      const has = !!(faceData[t.id]?.length > 0);
      return `<div id="fa-row-${t.id}" style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);transition:background .4s">
        ${t.photo
          ? `<img src="${t.photo}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${has?'#86efac':'#fca5a5'}">`
          : `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:15px;flex-shrink:0;border:2px solid ${has?'#86efac':'#fca5a5'}">${Utils.avatar(t.name)}</div>`
        }
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
          <div style="font-size:10px;color:${has?'#15803d':'#ef4444'};font-weight:600">${has?'🔐 Face Ready':'⚠️ Register Karein'}</div>
        </div>
        <div id="fa-badge-${t.id}">
          ${ss
            ? `<span style="background:${ss.bg};color:${ss.clr};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800">${ss.txt}</span>`
            : `<span style="background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">—</span>`
          }
        </div>
      </div>`;
    }).join('');
  }

  // ================================================================
  //  STYLES
  // ================================================================
  function addStyles() {
    if (document.getElementById('fa-css')) return;
    const s = document.createElement('style');
    s.id = 'fa-css';
    s.textContent = `
      @keyframes popIn { from{transform:scale(.4);opacity:0} to{transform:scale(1);opacity:1} }
      @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.3} }
      @keyframes flashRow { 0%{background:#dcfce7} 100%{background:transparent} }
      @keyframes spin { to{transform:rotate(360deg)} }

      .fa-status-bar { padding:14px 20px;border-radius:12px;color:#fff;display:flex;
        align-items:center;gap:16px;margin-bottom:18px;flex-wrap:wrap }
      .fa-status-bar.loading { background:linear-gradient(135deg,#d97706,#b45309) }
      .fa-status-bar.ready   { background:linear-gradient(135deg,#15803d,#166534) }
      .fa-status-bar.running { background:linear-gradient(135deg,#1e40af,#4f46e5) }
      .fa-status-bar.error   { background:linear-gradient(135deg,#dc2626,#991b1b) }

      .fa-spinner { width:22px;height:22px;border:3px solid rgba(255,255,255,.25);
        border-top-color:#fff;border-radius:50%;animation:spin .85s linear infinite;flex-shrink:0 }

      .fa-tip { background:var(--surface-2);padding:5px 12px;border-radius:99px;
        font-size:12px;color:var(--text-muted) }

      .fa-reg-step { font-size:12px;padding:7px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8 }
      .fa-reg-step.active { color:#1e40af;font-weight:700 }
      .fa-reg-step.done   { color:#15803d;font-weight:700 }

      .fa-flash { animation:flashRow .9s ease-out }

      #fa-overlay.show { display:flex !important }
    `;
    document.head.appendChild(s);
  }

  // ================================================================
  //  MODEL LOADING
  // ================================================================
  async function loadModels() {
    if (modelsLoaded || modelLoading) return;
    modelLoading = true;
    setBar('loading','AI Models Load Ho Rahe Hain...','Internet se download hoga — ek baar hi');
    setProgress(5);

    for (let i = 0; i < MODEL_URLS.length; i++) {
      try {
        setBar('loading', `Models Download... (${i+1}/${MODEL_URLS.length})`, MODEL_URLS[i]);
        setProgress(15 + i * 20);
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URLS[i]);
        setProgress(50);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URLS[i]);
        setProgress(80);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URLS[i]);
        setProgress(100);

        modelsLoaded = true; modelLoading = false;
        setBar('ready', '✅ AI Ready! Ab Camera Shuru Karein', 'Face detection active');
        const b = document.getElementById('fa-start-btn');
        if (b) { b.disabled = false; }
        toast('✅ Face Recognition AI ready hai!');
        return;
      } catch (e) {
        console.warn('Model URL failed:', MODEL_URLS[i], e.message);
      }
    }

    modelLoading = false;
    setBar('error', '❌ Models Load Nahi Hue', 'Internet check karein ya page reload karein (F5)');
    toast('Models load nahi hue! Internet check karein.', 'error');
  }

  // ================================================================
  //  CAMERA
  // ================================================================
  async function startCamera() {
    if (!modelsLoaded) { toast('Models abhi ready nahi — thoda wait karein!', 'error'); return; }
    const faceData   = DB.get('teacher_face_data', {});
    const teachers   = DB.get('teachers', []);
    const registered = teachers.filter(t => faceData[t.id]?.length > 0);
    if (!registered.length) { toast('Pehle kisi teacher ka face register karein!', 'error'); return; }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width:{ideal:1280}, height:{ideal:720}, facingMode:'user' }
      });
      const vid = document.getElementById('fa-video');
      vid.srcObject = stream;
      await new Promise(r => vid.onloadedmetadata = r);
      vid.play();

      el('fa-placeholder').style.display    = 'none';
      el('fa-scan-label').style.display     = 'block';
      el('fa-start-btn').style.display      = 'none';
      el('fa-stop-btn').style.display       = 'inline-flex';
      el('fa-live-indicator').style.display = 'flex';
      el('fa-fps').style.display            = 'inline';

      await buildMatcher();
      isRunning = true;
      setBar('running', `🟢 Camera ON — ${registered.length} teacher(s) registered`, 'Chehra frame mein laayen');
      startLoop();
    } catch (err) {
      toast('Camera nahi khula: ' + err.message, 'error');
    }
  }

  function stopCamera() {
    isRunning = false;
    if (detectionLoop) { cancelAnimationFrame(detectionLoop); detectionLoop = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    const vid = document.getElementById('fa-video');
    if (vid) vid.srcObject = null;
    const cnv = document.getElementById('fa-canvas');
    if (cnv) cnv.getContext('2d').clearRect(0, 0, cnv.width, cnv.height);

    el('fa-placeholder').style.display    = 'flex';
    el('fa-scan-label').style.display     = 'none';
    el('fa-start-btn').style.display      = 'inline-flex';
    el('fa-stop-btn').style.display       = 'none';
    el('fa-live-indicator').style.display = 'none';
    el('fa-fps').style.display            = 'none';
    setBar('ready', '⏹ Camera Band — Dobara Start Karne Ke Liye Button Dabaayen', '');
  }

  async function buildMatcher() {
    const teachers = DB.get('teachers', []);
    const faceData = DB.get('teacher_face_data', {});
    const labeled  = [];
    for (const t of teachers) {
      const saved = faceData[t.id];
      if (!saved?.length) continue;
      labeled.push(new faceapi.LabeledFaceDescriptors(t.id, saved.map(a => new Float32Array(a))));
    }
    faceMatcher = labeled.length ? new faceapi.FaceMatcher(labeled, 0.45) : null;
  }

  // ================================================================
  //  DETECTION LOOP
  // ================================================================
  let lastMs = 0, fpsC = 0, fpsT = 0;

  function startLoop() {
    async function frame(ts) {
      if (!isRunning) return;
      detectionLoop = requestAnimationFrame(frame);
      if (ts - lastMs < 200) return; // 5 fps
      lastMs = ts;

      const vid = document.getElementById('fa-video');
      const cnv = document.getElementById('fa-canvas');
      if (!vid || !cnv || vid.paused || !vid.videoWidth) return;

      const size = { width: vid.videoWidth, height: vid.videoHeight };
      faceapi.matchDimensions(cnv, size);

      const dets = await faceapi
        .detectAllFaces(vid, new faceapi.TinyFaceDetectorOptions({ inputSize:320, scoreThreshold:0.5 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      const ctx = cnv.getContext('2d');
      ctx.clearRect(0, 0, cnv.width, cnv.height);
      const resized = faceapi.resizeResults(dets, size);
      const lb = el('fa-scan-label');

      if (!dets.length) {
        if (lb) lb.textContent = '🔍 Chehra nazar nahi aa raha — saamne aayein';
        drawOval(ctx, size);
      } else {
        if (lb) lb.textContent = `😊 ${dets.length} chehra mila — match kar raha hai...`;
        for (const det of resized) {
          const match = faceMatcher?.findBestMatch(det.descriptor);
          const known = match && match.label !== 'unknown';
          const teacher = known ? DB.get('teachers',[]).find(t => t.id === match.label) : null;
          const conf = match ? Math.round((1 - match.distance) * 100) : 0;

          drawFaceBox(ctx, det.detection.box, known, teacher?.name, conf);

          if (known && teacher && conf >= 55 && !recognizedToday.has(teacher.id)) {
            const now = Date.now();
            if (!lastDetectTime[teacher.id]) lastDetectTime[teacher.id] = now;
            if (now - lastDetectTime[teacher.id] >= 1200) {
              markAttendance(teacher, conf);
            }
          } else if (known && teacher) {
            lastDetectTime[teacher.id] = lastDetectTime[teacher.id] || Date.now();
          }
        }
      }

      // FPS
      fpsC++;
      if (ts - fpsT > 1000) {
        const fpsel = el('fa-fps');
        if (fpsel) fpsel.textContent = `${fpsC} FPS`;
        fpsC = 0; fpsT = ts;
      }
    }
    detectionLoop = requestAnimationFrame(frame);
  }

  function drawOval(ctx, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.lineWidth = 2; ctx.setLineDash([10,7]);
    ctx.beginPath();
    ctx.ellipse(size.width/2, size.height/2 - 20, 120, 155, 0, 0, Math.PI*2);
    ctx.stroke(); ctx.restore();
  }

  function drawFaceBox(ctx, box, known, name, conf) {
    const color = known ? '#22c55e' : '#ef4444';
    const label = known ? `✓ ${name}  ${conf}%` : '? Unknown';

    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Corner brackets
    ctx.lineWidth = 5;
    const cl = 22;
    [[box.x,box.y,1,1],[box.x+box.width,box.y,-1,1],[box.x,box.y+box.height,1,-1],[box.x+box.width,box.y+box.height,-1,-1]]
      .forEach(([x,y,dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(x+dx*cl,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*cl); ctx.stroke();
      });

    // Label pill
    ctx.font = 'bold 13px Arial';
    const tw = ctx.measureText(label).width + 22;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(box.x, box.y - 32, tw, 30, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(label, box.x + 11, box.y - 10);
  }

  // ================================================================
  //  MARK ATTENDANCE + BIG POPUP
  // ================================================================
  function markAttendance(teacher, conf) {
    recognizedToday.add(teacher.id);
    delete lastDetectTime[teacher.id];

    const today   = Utils.todayStr();
    let staffAtt  = DB.get('staff_attendance', []);
    const exists  = staffAtt.find(a => a.teacherId === teacher.id && a.date === today);
    const timeStr = new Date().toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit', hour12:true });

    if (!exists) {
      staffAtt.push({ id:Utils.genId(), teacherId:teacher.id, date:today,
        status:'present', method:'face-recognition', confidence:conf, time:timeStr });
      DB.set('staff_attendance', staffAtt);
      if (typeof ActivityLog !== 'undefined')
        ActivityLog.log('Face Attendance', `${teacher.name} (${conf}%)`, 'Face Recognition');
    }

    updateRow(teacher.id);
    updateCounter();
    showSuccess(teacher, timeStr);
  }

  function showSuccess(teacher, timeStr) {
    const today   = Utils.todayStr();
    const total   = DB.get('teachers',[]).length;
    const present = DB.get('staff_attendance',[]).filter(a => a.date===today && a.status==='present').length;

    el('fa-suc-name').textContent  = teacher.name;
    el('fa-suc-time').textContent  = `⏰ ${timeStr || ''} — Face Recognized`;
    el('fa-suc-count').textContent = present;
    el('fa-suc-total').textContent = `${total} teachers mein se`;

    const ov = el('fa-overlay');
    ov.style.display = 'flex'; ov.classList.add('show');
    if (navigator.vibrate) navigator.vibrate([80,40,80]);

    // Auto close after 3.5 seconds
    clearTimeout(FaceAttendance._autoClose);
    FaceAttendance._autoClose = setTimeout(hideSuccess, 3500);
  }

  function hideSuccess() {
    const ov = el('fa-overlay');
    if (ov) { ov.style.display = 'none'; ov.classList.remove('show'); }
  }

  function updateRow(teacherId) {
    const row = el(`fa-row-${teacherId}`);
    if (row) { row.classList.add('fa-flash'); setTimeout(() => row.classList.remove('fa-flash'), 900); }
    const badge = el(`fa-badge-${teacherId}`);
    if (badge) badge.innerHTML = '<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800">✅ Present</span>';
  }

  function updateCounter() {
    const today   = Utils.todayStr();
    const total   = DB.get('teachers',[]).length;
    const present = DB.get('staff_attendance',[]).filter(a => a.date===today && a.status==='present').length;
    const pct     = total > 0 ? Math.round(present/total*100) : 0;
    const bn = el('fa-big-num'); if (bn) bn.textContent = present;
    const bar = el('fa-att-prog'); if (bar) bar.style.width = pct + '%';
  }

  // ================================================================
  //  MANUAL MARK
  // ================================================================
  function manualMark() {
    const teacherId = el('fa-manual-t')?.value;
    const status    = el('fa-manual-s')?.value;
    if (!teacherId) { toast('Teacher select karein!', 'error'); return; }

    const today   = Utils.todayStr();
    const timeStr = new Date().toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit', hour12:true });
    let staffAtt  = DB.get('staff_attendance', []).filter(a => !(a.teacherId===teacherId && a.date===today));
    staffAtt.push({ id:Utils.genId(), teacherId, date:today, status, method:'manual', time:timeStr });
    DB.set('staff_attendance', staffAtt);

    const teacher = DB.get('teachers',[]).find(t => t.id === teacherId);
    updateRow(teacherId); updateCounter();
    if (status === 'present') { recognizedToday.add(teacherId); showSuccess(teacher || {name:'Teacher'}, timeStr); }
    else toast(`${teacher?.name} — ${status} mark ho gaya!`);
  }

  // ================================================================
  //  REGISTRATION
  // ================================================================
  let regRaf = null;

  function openRegister() {
    clearSamples();
    el('reg-tsel') && (el('reg-tsel').value = '');
    el('reg-cam-btn') && (el('reg-cam-btn').disabled = true);
    el('reg-cap-btn') && (el('reg-cap-btn').disabled = true);
    el('reg-save-btn') && (el('reg-save-btn').disabled = true);
    setRegStep(1);
    new bootstrap.Modal(el('faceRegModal')).show();
  }

  function openRegisterFor(tid) {
    openRegister();
    setTimeout(() => {
      const sel = el('reg-tsel'); if (sel) { sel.value = tid; onTSelect(); }
    }, 200);
  }

  function onTSelect() {
    const val = el('reg-tsel')?.value;
    const btn = el('reg-cam-btn'); if (btn) btn.disabled = !val;
    if (val) setRegStep(2);
  }

  async function startRegCam() {
    if (!modelsLoaded) { toast('Models load nahi hue!', 'error'); return; }
    const tid = el('reg-tsel')?.value;
    if (!tid) { toast('Pehle teacher select karein!', 'error'); return; }
    try {
      regStream = await navigator.mediaDevices.getUserMedia({ video:{ width:640, height:480, facingMode:'user' } });
      const vid = el('reg-vid'), cnv = el('reg-cnv');
      vid.srcObject = regStream;
      await new Promise(r => vid.onloadedmetadata = r);
      vid.play();
      vid.style.display = cnv.style.display = 'block';
      el('reg-ph').style.display = 'none';
      el('reg-oval').style.display = 'block';
      el('reg-live-bar').style.display = 'block';
      el('reg-cap-btn').disabled = false;
      setRegStep(3);
      startRegLive();
    } catch(err) { toast('Camera nahi khula: ' + err.message, 'error'); }
  }

  function startRegLive() {
    let lastT = 0;
    async function f(ts) {
      if (!regStream) return;
      regRaf = requestAnimationFrame(f);
      if (ts - lastT < 500) return; lastT = ts;
      const vid = el('reg-vid');
      if (!vid || vid.paused) return;
      const det = await faceapi.detectSingleFace(vid, new faceapi.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:.5})).withFaceLandmarks(true);
      const fb = el('reg-feedback'), oval = el('reg-oval'), lb = el('reg-live-bar');
      if (det) {
        if (fb) { fb.textContent = '✅ Chehra mila! 📸 Capture click karein'; fb.style.color = '#15803d'; }
        if (oval) oval.style.borderColor = '#22c55e';
        if (lb) { lb.textContent = '✅ Face Detected'; lb.style.background = 'rgba(22,163,74,.85)'; }
      } else {
        if (fb) { fb.textContent = '❌ Chehra nazar nahi — seedha camera mein dekhein'; fb.style.color = '#dc2626'; }
        if (oval) oval.style.borderColor = 'rgba(255,255,255,.35)';
        if (lb) { lb.textContent = '🔍 Chehra dhundh raha hai...'; lb.style.background = 'rgba(0,0,0,.75)'; }
      }
    }
    regRaf = requestAnimationFrame(f);
  }

  async function capture() {
    if (capturedSamples.length >= 5) { toast('5 samples ho gaye! Ab Save karein.', 'info'); return; }
    const vid = el('reg-vid');
    if (!vid?.srcObject) { toast('Camera pehle on karein!', 'error'); return; }

    const det = await faceapi
      .detectSingleFace(vid, new faceapi.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:.5}))
      .withFaceLandmarks(true).withFaceDescriptor();

    if (!det) { toast('❌ Chehra nazar nahi aaya! Seedha dekhein, roshni zyada ho.', 'error'); return; }

    capturedSamples.push(Array.from(det.descriptor));

    // Thumbnail
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 64;
    tmp.getContext('2d').drawImage(vid, 0, 0, 64, 64);
    const img = document.createElement('img');
    img.src = tmp.toDataURL();
    img.style.cssText = 'width:58px;height:58px;border-radius:10px;border:3px solid #22c55e;object-fit:cover';
    el('reg-thumbs')?.appendChild(img);

    // Update counter + dots
    el('reg-cnt').textContent = capturedSamples.length;
    for (let i=1;i<=5;i++) { const d=el(`rdot${i}`); if(d) d.style.background = i<=capturedSamples.length?'#22c55e':'#e2e8f0'; }

    if (capturedSamples.length >= 3) { el('reg-save-btn').disabled = false; setRegStep(5); }
    else setRegStep(4);
    toast(`Sample ${capturedSamples.length}/5 ✅`);
  }

  function saveFace() {
    const tid = el('reg-tsel')?.value;
    if (!tid || capturedSamples.length < 1) { toast('Teacher select karein aur pehle capture karein!', 'error'); return; }
    const faceData = DB.get('teacher_face_data', {});
    faceData[tid] = capturedSamples;
    DB.set('teacher_face_data', faceData);
    stopRegCam();
    bootstrap.Modal.getInstance(el('faceRegModal'))?.hide();
    const teacher = DB.get('teachers',[]).find(t=>t.id===tid);
    if (typeof ActivityLog !== 'undefined') ActivityLog.log('Face Registered', teacher?.name, 'Face Recognition');
    toast(`✅ ${teacher?.name} ka face register ho gaya! (${capturedSamples.length} samples)`, 'success');
    capturedSamples = [];
    render();
  }

  function clearSamples() {
    capturedSamples = [];
    const th = el('reg-thumbs'); if(th) th.innerHTML='';
    const cn = el('reg-cnt'); if(cn) cn.textContent='0';
    for(let i=1;i<=5;i++){const d=el(`rdot${i}`);if(d)d.style.background='#e2e8f0';}
    const sv=el('reg-save-btn');if(sv)sv.disabled=true;
  }

  function stopRegCam() {
    if (regRaf) { cancelAnimationFrame(regRaf); regRaf = null; }
    if (regStream) { regStream.getTracks().forEach(t=>t.stop()); regStream=null; }
    const vid=el('reg-vid'); if(vid){vid.srcObject=null;vid.style.display='none';}
    const cnv=el('reg-cnv'); if(cnv)cnv.style.display='none';
    const ph=el('reg-ph'); if(ph)ph.style.display='flex';
    const ov=el('reg-oval'); if(ov)ov.style.display='none';
    const lb=el('reg-live-bar'); if(lb)lb.style.display='none';
  }

  function removeFace(tid, name) {
    confirmDialog(`${name} ka face data delete karein?`, () => {
      const fd = DB.get('teacher_face_data',{});
      delete fd[tid]; DB.set('teacher_face_data',fd);
      toast(`${name} ka face remove ho gaya.`);
      render();
    });
  }

  // ================================================================
  //  UTILS
  // ================================================================
  function el(id) { return document.getElementById(id); }

  function setBar(type, title, sub) {
    const bar=el('fa-status-bar'); if(!bar)return;
    bar.className='fa-status-bar '+type;
    const t=el('fa-stat-title'); if(t)t.textContent=title;
    const s=el('fa-stat-sub'); if(s)s.textContent=sub;
    const sp=el('fa-spinner'); if(sp)sp.style.display=type==='loading'?'block':'none';
  }

  function setProgress(p) { const b=el('fa-prog-bar'); if(b)b.style.width=p+'%'; const l=el('fa-prog-label'); if(l)l.textContent=p+'%'; }
  function setRegStep(n) { for(let i=1;i<=5;i++){const e=el(`rs${i}`);if(e)e.className='fa-reg-step'+(i<n?' done':i===n?' active':'');} }

  function cleanup() { stopCamera(); stopRegCam(); hideSuccess(); }

  return {
    render, startCamera, stopCamera, hideSuccess,
    openRegister, openRegisterFor, onTSelect,
    startRegCam, capture, saveFace, clearSamples, stopRegCam, removeFace,
    manualMark, cleanup, _autoClose:null,
  };
})();
