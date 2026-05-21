// ================================================================
// QR.JS  —  Standalone QR System — Hira Baitul Hamd
// ----------------------------------------------------------------
// 1. QR GENERATION  : Real scannable QR codes via qrcodejs CDN
// 2. QR SCANNING    : Live camera scan via jsQR CDN
// 3. ATTENDANCE     : ID Card QR → scan → attendance marked
//
// QR Data Format (same in ID card + scanner):
//   { type:'EDUTRACK_ATTENDANCE', id, roll, name, cls, section }
//
// Script order in index.html:
//   qrcodejs  →  jsQR  →  app.js  →  qr.js  →  idcard.js  →  ..
// ================================================================

const QRAttendance = (() => {

  // ── private state ──────────────────────────────────────────────
  let _scanning     = false;
  let _videoStream  = null;
  let _animFrame    = null;
  let _lastData     = null;
  let _lastTime     = 0;

  // ================================================================
  // PUBLIC: QR DATA FORMAT
  // ================================================================
  function buildQRData(student) {
    // Minimal data = smaller QR = faster scan
    return JSON.stringify({
      type : 'EDUTRACK_ATTENDANCE',
      id   : student.id,
      roll : student.roll,
    });
  }

  // ================================================================
  // PUBLIC: GENERATE REAL QR inside any container div
  //
  // BUG FIX — qrcodejs makes TWO elements: canvas + img
  // Solution: render into a hidden off-screen wrapper, then move
  // ONLY the canvas into the real container. The wrapper (with the
  // unwanted img) is then removed from the DOM entirely.
  // ================================================================
  function generateQR(containerId, student, size) {
    size = size || 120;
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '';
    const data = buildQRData(student);

    if (typeof QRCode === 'undefined') {
      var cvs = document.createElement('canvas');
      el.appendChild(cvs);
      _drawFallbackQR(cvs, data, size);
      return;
    }

    // Render into off-screen div to prevent img flash
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-99999px;top:-99999px;';
    document.body.appendChild(wrapper);

    try {
      new QRCode(wrapper, {
        text         : data,
        width        : size,
        height       : size,
        colorDark    : '#000000',
        colorLight   : '#ffffff',
        correctLevel : QRCode.CorrectLevel.L,  // L = least dense = easiest to scan
      });
    } catch(e) {
      document.body.removeChild(wrapper);
      return;
    }

    // Move canvas to real container
    var canvas = wrapper.querySelector('canvas');
    if (canvas) {
      canvas.style.cssText = 'display:block;margin:0 auto;width:' + size + 'px;height:' + size + 'px;';
      el.appendChild(canvas);
    } else {
      // Fallback: use the img qrcodejs made
      var img = wrapper.querySelector('img');
      if (img) { img.style.display = 'block'; el.appendChild(img); }
    }

    document.body.removeChild(wrapper);
  }

  // ================================================================
  // PUBLIC: RENDER QR ATTENDANCE PAGE
  // ================================================================
  function render() {
    var lbl = document.getElementById('qr-date-label');
    if (lbl) lbl.textContent = new Date().toLocaleDateString('en-PK', {
      weekday:'long', day:'2-digit', month:'long', year:'numeric'
    });

    var res = document.getElementById('qr-scan-result');
    if (res) res.innerHTML = '';

    var scanControls = document.getElementById('qr-scanner-controls');
    var manualWrap   = document.getElementById('qr-manual-wrap');
    if (!_isAuthorized()) {
      if (scanControls) scanControls.style.display = 'none';
      if (manualWrap)   manualWrap.style.display   = 'none';
    } else {
      if (scanControls) scanControls.style.display = '';
      if (manualWrap)   manualWrap.style.display   = '';
    }

    _buildLog();
  }

  function _isAuthorized() {
    return APP && (APP.currentPortal === 'admin' || APP.currentPortal === 'teacher');
  }

  // ================================================================
  // PUBLIC: START CAMERA SCANNER
  // ================================================================
  function startScanner() {
    if (_scanning) return;
    if (!_isAuthorized()) {
      toast('Sirf Admin ya Teacher attendance mark kar sakte hain.', 'error');
      return;
    }

    var scanArea = document.getElementById('qr-scan-area');
    var video    = document.getElementById('qr-video');
    if (!scanArea || !video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Camera supported nahi is browser mein.', 'error');
      _showManualEntry();
      return;
    }

    if (typeof jsQR === 'undefined') {
      toast('QR scanner library load nahi hui. Manual entry use karo.', 'error');
      _showManualEntry();
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
    .then(function(stream) {
      _videoStream    = stream;
      video.srcObject = stream;
      video.play();
      _scanning = true;
      scanArea.style.display = 'block';
      toast('Camera on — student ID card ka QR code saamne rakho.', 'info');
      _startScanLoop(video);
    })
    .catch(function() {
      toast('Camera access nahi mili. Manual entry use karo.', 'error');
      _showManualEntry();
    });
  }

  // ================================================================
  // PUBLIC: STOP CAMERA SCANNER
  // ================================================================
  function stopScanner() {
    if (_videoStream) {
      _videoStream.getTracks().forEach(function(t) { t.stop(); });
      _videoStream = null;
    }
    if (_animFrame) {
      cancelAnimationFrame(_animFrame);
      _animFrame = null;
    }
    _scanning = false;
    // FIX: Reset debounce state so scanner starts fresh next time it's opened
    _lastData = null;
    _lastTime = 0;
    var scanArea = document.getElementById('qr-scan-area');
    if (scanArea) scanArea.style.display = 'none';
  }

  // ================================================================
  // PUBLIC: MANUAL ENTRY
  // ================================================================
  function manualScan() {
    if (!_isAuthorized()) {
      toast('Sirf Admin ya Teacher attendance mark kar sakte hain.', 'error');
      return;
    }
    var input = document.getElementById('qr-manual-roll');
    if (!input) return;
    var roll = input.value.trim();
    if (!roll) { toast('Roll number daalo.', 'error'); return; }
    var student = _findByRoll(roll);
    if (!student) { toast('Student nahi mila — roll number check karo.', 'error'); return; }
    markAttendance(student);
    input.value = '';
    input.focus();
  }


  // ================================================================
  // PUBLIC: MARK ATTENDANCE
  // ================================================================
  function markAttendance(student) {
    if (!_isAuthorized()) {
      toast('Attendance sirf Admin ya Teacher mark kar sakte hain!', 'error');
      return;
    }
    var date    = Utils.todayStr();
    var records = DB.get('attendance');

    var rec = records.find(function(r) {
      return r.date === date && r.cls === student.cls && r.section === student.section;
    });

    if (rec && rec.attendance && rec.attendance[student.id] === 'present') {
      _showSuccessPopup(student, date, true);
      return;
    }

    if (!rec) {
      rec = {
        id        : Utils.genId(),
        date      : date,
        cls       : student.cls,
        section   : student.section,
        attendance: {},
        markedBy  : 'QR Scan',
        createdAt : Date.now(),
      };
      records.push(rec);
    }

    if (!rec.attendance) rec.attendance = {};
    rec.attendance[student.id] = 'present';
    DB.set('attendance', records);

    _showSuccessPopup(student, date, false);
    _addLogEntry(student);
    // update inline result panel if on QR page
    _showResult(student, date, false);
  }

  function markQRAttendance(student) { markAttendance(student); }

  // ================================================================
  // PRIVATE: Scan loop
  // ================================================================
  function _startScanLoop(video) {
    var canvas = document.createElement('canvas');
    var ctx    = canvas.getContext('2d', { willReadFrequently: true });

    function tick() {
      if (!_scanning) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var code    = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code) {
          var now = Date.now();
          if (code.data !== _lastData || now - _lastTime > 3000) {
            _lastData = code.data;
            _lastTime = now;
            _processRawQR(code.data);
          }
        }
      }

      _animFrame = requestAnimationFrame(tick);
    }

    _animFrame = requestAnimationFrame(tick);
  }

  function _processRawQR(raw) {
    var parsed = null;

    // Try JSON parse first
    try { parsed = JSON.parse(raw); } catch (e) {
      // Not JSON — try as plain roll number
      var s = _findByRoll(raw.trim());
      if (s) markAttendance(s);
      else toast('Unknown QR — student nahi mila.', 'error');
      return;
    }

    var students = DB.get('students');

    // Format 1: EDUTRACK_ATTENDANCE (ID card QR from idcard.js)
    if (parsed.type === 'EDUTRACK_ATTENDANCE') {
      var s1 = null;
      // First try by id
      if (parsed.id) s1 = students.find(function(x) { return x.id === parsed.id; });
      // Fallback by roll
      if (!s1 && parsed.roll) s1 = _findByRoll(parsed.roll);
      if (s1) { markAttendance(s1); return; }
      toast('Student system mein nahi hai!', 'error');
      return;
    }

    // Format 2: EDUTRACK_TEACHER_ATT (teacher ID card QR) — mark teacher attendance
    if (parsed.type === 'EDUTRACK_TEACHER_ATT' || parsed.type === 'TEACHER_ATTENDANCE') {
      var teacher = DB.get('teachers').find(function(t) { return t.id === parsed.id; });
      if (!teacher) { toast('Teacher system mein nahi mila!', 'error'); return; }
      _markTeacherAttendance(teacher);
      return;
    }

    // Format 3: any object with id or roll
    if (parsed.id || parsed.roll) {
      var s2 = parsed.id
        ? students.find(function(x) { return x.id === parsed.id; })
        : null;
      if (!s2 && parsed.roll) s2 = _findByRoll(parsed.roll);
      if (s2) { markAttendance(s2); return; }
      toast('Student nahi mila!', 'error');
      return;
    }

    toast('QR format pehchana nahi gaya.', 'error');
  }


  function _markTeacherAttendance(teacher) {
    // ── Unified path: TeacherQRAttendance.markTeacher() use karo ──
    // Yeh staff_attendance key mein save karta hai aur salary deduction bhi handle karta hai.
    // Agar wo module available hai toh usse call karo aur popup bhi wahi handle karega.
    if (typeof TeacherQRAttendance !== 'undefined') {
      TeacherQRAttendance.markTeacher(teacher, 'present');
      return;
    }

    // ── Fallback (agar module load na ho) ── same staff_attendance key use karo ──
    var date = Utils.todayStr();
    var records = DB.get('staff_attendance', []);
    var existing = records.find(function(r) { return r.date === date && r.teacherId === teacher.id; });
    if (existing && existing.status === 'present') {
      _playBeep(true);
      _showTeacherPopup(teacher, date, true);
      return;
    }
    if (existing) {
      existing.status = 'present';
      existing.markedAt = new Date().toISOString();
    } else {
      records.push({
        id: Utils.genId(),
        teacherId: teacher.id,
        date: date,
        status: 'present',
        markedAt: new Date().toISOString(),
        markedBy: 'QR Scan'
      });
    }
    DB.set('staff_attendance', records);
    _playBeep(false);
    _showTeacherPopup(teacher, date, false);
  }

  function _showTeacherPopup(teacher, date, alreadyMarked) {
    var ex = document.getElementById('qr-success-popup');
    if (ex) ex.remove();
    var ac      = alreadyMarked ? '#f59e0b' : '#22c55e';
    var acL     = alreadyMarked ? 'rgba(245,158,11,.15)' : 'rgba(34,197,94,.15)';
    var acB     = alreadyMarked ? 'rgba(245,158,11,.35)' : 'rgba(34,197,94,.35)';
    var grad    = alreadyMarked ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#16a34a,#22c55e)';
    var title   = alreadyMarked ? '&#x26A0;&#xFE0F; Pehle Se Present!' : '&#x2705; Attendance Lag Gayi!';
    var sub     = alreadyMarked ? 'Yeh teacher aaj pehle se present hai' : 'Successfully Present Mark Ho Gaya';
    var ini     = (teacher.name||'?').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();
    var photo   = teacher.photo
      ? '<img src="'+teacher.photo+'" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid '+ac+';margin:0 auto 14px;display:block">'
      : '<div style="width:88px;height:88px;border-radius:50%;background:'+grad+';display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#fff;margin:0 auto 14px">'+ini+'</div>';
    var tick    = alreadyMarked
      ? '<text x="26" y="33" text-anchor="middle" font-size="20" fill="'+ac+'">!</text>'
      : '<path fill="none" stroke="'+ac+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M14 27 l8 8 l16-16" stroke-dasharray="48" stroke-dashoffset="48" style="animation:qrTickDraw .4s ease .65s forwards"/>';
    var popup = document.createElement('div');
    popup.id = 'qr-success-popup';
    popup.innerHTML =
      '<div id="qrpbd" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:qrFadeIn .2s ease">'+
        '<div id="qrpbx" style="background:var(--surface,#1e293b);border-radius:24px;padding:30px 26px 24px;text-align:center;width:min(370px,90vw);box-shadow:0 40px 90px rgba(0,0,0,.6);animation:qrPopupIn .35s cubic-bezier(.34,1.56,.64,1)">'+
          '<div style="width:68px;height:68px;margin:0 auto 10px"><svg viewBox="0 0 52 52" style="width:68px;height:68px">'+
            '<circle cx="26" cy="26" r="25" fill="none" stroke="'+ac+'" stroke-width="2.5" stroke-dasharray="166" stroke-dashoffset="166" style="animation:qrCircleDraw .6s ease .05s forwards"/>'+tick+'</svg></div>'+
          '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:'+ac+';margin-bottom:14px">'+title+'</div>'+
          photo+
          '<div style="font-family:Syne,sans-serif;font-size:23px;font-weight:900;color:var(--text,#f1f5f9);margin-bottom:10px;line-height:1.2">'+teacher.name+'</div>'+
          '<div style="display:inline-block;background:'+acL+';border:2px solid '+acB+';color:'+ac+';font-size:14px;font-weight:800;padding:6px 20px;border-radius:30px;margin-bottom:12px">&#x1F46F; Teacher</div>'+
          '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">'+
            (teacher.subject?'<span style="background:'+acL+';border:1px solid '+acB+';color:'+ac+';font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">&#x1F4DA; '+teacher.subject+'</span>':'')+
            (teacher.cls?'<span style="background:'+acL+';border:1px solid '+acB+';color:'+ac+';font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">&#x1F3EB; Class '+teacher.cls+'</span>':'')+
          '</div>'+
          '<div style="font-size:12px;color:var(--text-muted,#94a3b8);margin-bottom:4px">&#x1F4C5; '+new Date(date).toLocaleDateString('en-PK',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})+'</div>'+
          '<div style="font-size:13px;color:'+ac+';font-weight:600;margin-bottom:20px">'+sub+'</div>'+
          '<button id="qrpclose" style="background:'+grad+';color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;padding:13px 0;cursor:pointer;width:100%;letter-spacing:.3px">Done &#x2713;</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(popup);
    function closePopup(){var p=document.getElementById('qr-success-popup');if(!p)return;var bx=p.querySelector('#qrpbx');if(bx)bx.style.animation='qrPopupOut .25s ease forwards';setTimeout(function(){if(p&&p.parentNode)p.remove();},260);}
    popup.querySelector('#qrpclose').addEventListener('click',closePopup);
    popup.querySelector('#qrpbd').addEventListener('click',function(e){if(e.target===this)closePopup();});
    setTimeout(closePopup,5000);
  }



  function _findByRoll(roll) {
    return DB.get('students').find(function(s) {
      return s.roll.toLowerCase() === roll.toLowerCase();
    }) || null;
  }

  function _showManualEntry() {
    var w = document.getElementById('qr-manual-wrap');
    if (w) w.style.display = 'block';
  }

  function _showResult(student, date, alreadyMarked) {
    var el = document.getElementById('qr-scan-result');
    if (!el) return;
    var bg    = alreadyMarked ? 'rgba(245,158,11,.12)' : 'var(--success-light)';
    var bdr   = alreadyMarked ? 'rgba(245,158,11,.6)'  : 'var(--success)';
    var clr   = alreadyMarked ? '#f59e0b'               : 'var(--success)';
    var icon  = alreadyMarked ? '⚠️'                    : '✅';
    var label = alreadyMarked ? 'Pehle se Present!'     : 'Present Mark Ho Gaya!';

    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:14px;background:' + bg + ';border:2px solid ' + bdr + ';' +
      'border-radius:var(--radius);padding:16px;animation:fadeUp .3s ease">' +
      (student.photo
        ? '<img src="' + student.photo + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid ' + bdr + ';flex-shrink:0">'
        : '<div style="width:56px;height:56px;border-radius:50%;background:' + clr + ';display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;flex-shrink:0">' + Utils.avatar(student.name) + '</div>') +
      '<div>' +
        '<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:18px;color:' + clr + '">' + icon + ' ' + label + '</div>' +
        '<div style="font-size:15px;font-weight:600;margin-top:2px">' + student.name + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">Roll: ' + student.roll + ' &nbsp;•&nbsp; ' + student.cls + ' – Section ' + student.section + ' &nbsp;•&nbsp; ' + date + '</div>' +
      '</div></div>';

    if (!alreadyMarked) { /* popup now called directly from markAttendance */ }
  }

  // ================================================================
  // PRIVATE: Beep / Success Sound
  // ================================================================
  function _playBeep(alreadyMarked) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (alreadyMarked) {
        // Warning — double low beep
        [0, 0.18].forEach(function(delay) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = 440;
          gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.14);
        });
      } else {
        // Success — two-note happy chime
        [[880, 0], [1100, 0.14]].forEach(function(pair) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = pair[0];
          gain.gain.setValueAtTime(0.4, ctx.currentTime + pair[1]);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + pair[1] + 0.22);
          osc.start(ctx.currentTime + pair[1]);
          osc.stop(ctx.currentTime + pair[1] + 0.24);
        });
      }
    } catch(e) { /* audio not available */ }
  }

  function _showSuccessPopup(student, date, alreadyMarked) {
    var existing = document.getElementById('qr-success-popup');
    if (existing) existing.remove();

    // Play sound
    _playBeep(!!alreadyMarked);

    var isAlready   = !!alreadyMarked;
    var ac          = isAlready ? '#f59e0b'                              : '#22c55e';
    var acLight     = isAlready ? 'rgba(245,158,11,.15)'                 : 'rgba(34,197,94,.15)';
    var acBorder    = isAlready ? 'rgba(245,158,11,.35)'                 : 'rgba(34,197,94,.35)';
    var btnGrad     = isAlready ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#16a34a,#22c55e)';
    var photoGrad   = isAlready ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#16a34a,#22c55e)';
    var titleTxt    = isAlready ? '&#x26A0;&#xFE0F; Pehle Se Present!'   : '&#x2705; Attendance Lag Gayi!';
    var subTxt      = isAlready ? 'Yeh student aaj pehle se present hai' : 'Successfully Present Mark Ho Gaya';

    var photoHtml = student.photo
      ? '<img src="' + student.photo + '" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid ' + ac + ';margin:0 auto 14px;display:block">'
      : '<div style="width:88px;height:88px;border-radius:50%;background:' + photoGrad + ';display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#fff;margin:0 auto 14px">' + Utils.avatar(student.name) + '</div>';

    var tickPath = isAlready
      ? '<text x="26" y="33" text-anchor="middle" font-size="20" fill="' + ac + '">!</text>'
      : '<path fill="none" stroke="' + ac + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M14 27 l8 8 l16-16" stroke-dasharray="48" stroke-dashoffset="48" style="animation:qrTickDraw .4s ease .65s forwards"/>';

    var popup = document.createElement('div');
    popup.id = 'qr-success-popup';
    popup.innerHTML =
      '<div id="qrpbd" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:qrFadeIn .2s ease">' +
        '<div id="qrpbx" style="background:var(--surface,#1e293b);border-radius:24px;padding:30px 26px 24px;text-align:center;width:min(370px,90vw);box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08);animation:qrPopupIn .35s cubic-bezier(.34,1.56,.64,1)">' +

          // animated SVG circle + tick
          '<div style="width:68px;height:68px;margin:0 auto 10px">' +
            '<svg viewBox="0 0 52 52" style="width:68px;height:68px">' +
              '<circle cx="26" cy="26" r="25" fill="none" stroke="' + ac + '" stroke-width="2.5" stroke-dasharray="166" stroke-dashoffset="166" style="animation:qrCircleDraw .6s ease .05s forwards"/>' +
              tickPath +
            '</svg>' +
          '</div>' +

          // title
          '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:' + ac + ';margin-bottom:14px">' + titleTxt + '</div>' +

          // photo
          photoHtml +

          // NAME — largest text
          '<div style="font-family:Syne,sans-serif;font-size:23px;font-weight:900;color:var(--text,#f1f5f9);margin-bottom:10px;line-height:1.2">' + student.name + '</div>' +

          // ROLL NUMBER — bold highlighted chip
          '<div style="display:inline-block;background:' + acLight + ';border:2px solid ' + acBorder + ';color:' + ac + ';font-size:17px;font-weight:800;padding:7px 24px;border-radius:30px;margin-bottom:12px;letter-spacing:.6px">&#x1F194; Roll: ' + student.roll + '</div>' +

          // class + section
          '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">' +
            '<span style="background:' + acLight + ';border:1px solid ' + acBorder + ';color:' + ac + ';font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">&#x1F4DA; Class ' + student.cls + '</span>' +
            '<span style="background:' + acLight + ';border:1px solid ' + acBorder + ';color:' + ac + ';font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">&#x1F3F7;&#xFE0F; Section ' + student.section + '</span>' +
          '</div>' +

          // date
          '<div style="font-size:12px;color:var(--text-muted,#94a3b8);margin-bottom:4px">&#x1F4C5; ' + new Date(date).toLocaleDateString('en-PK',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) + '</div>' +

          // sub
          '<div style="font-size:13px;color:' + ac + ';font-weight:600;margin-bottom:20px">' + subTxt + '</div>' +

          // done button
          '<button id="qrpclose" style="background:' + btnGrad + ';color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;padding:13px 0;cursor:pointer;width:100%;letter-spacing:.3px">Done &#x2713;</button>' +

        '</div>' +
      '</div>';

    document.body.appendChild(popup);

    function closePopup() {
      var p = document.getElementById('qr-success-popup');
      if (!p) return;
      var bx = p.querySelector('#qrpbx');
      if (bx) bx.style.animation = 'qrPopupOut .25s ease forwards';
      setTimeout(function() { if (p && p.parentNode) p.remove(); }, 260);
    }

    popup.querySelector('#qrpclose').addEventListener('click', closePopup);
    popup.querySelector('#qrpbd').addEventListener('click', function(e) { if (e.target === this) closePopup(); });
    setTimeout(closePopup, 5000);
  }

  function _buildLog() {
    var log = document.getElementById('qr-log');
    if (!log) return;
    var today    = Utils.todayStr();
    var records  = DB.get('attendance');
    var students = DB.get('students');
    var entries  = [];

    records.forEach(function(r) {
      if (r.date === today && r.attendance) {
        Object.entries(r.attendance).forEach(function(pair) {
          var sid = pair[0], status = pair[1];
          if (status === 'present') {
            var s = students.find(function(x) { return x.id === sid; });
            if (s) entries.push(s);
          }
        });
      }
    });

    if (!entries.length) {
      log.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px">Aaj abhi koi scan nahi hua.</div>';
      return;
    }
    log.innerHTML = entries.map(function(s) { return _logRow(s, false); }).join('');
  }

  function _addLogEntry(student) {
    var log = document.getElementById('qr-log');
    if (!log) return;
    if (log.textContent.includes('abhi koi scan')) log.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.innerHTML = _logRow(student, true);
    log.prepend(wrap.firstElementChild);
  }

  function _logRow(s, animate) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);' + (animate ? 'animation:fadeUp .3s ease;' : '') + '">' +
      (s.photo
        ? '<img src="' + s.photo + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0">'
        : '<div style="width:38px;height:38px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0">' + Utils.avatar(s.name) + '</div>') +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + s.name + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + s.roll + ' &nbsp;\u2022&nbsp; ' + s.cls + '\u2013' + s.section + (animate ? ' &nbsp;\u2022&nbsp; ' + new Date().toLocaleTimeString() : '') + '</div>' +
      '</div>' +
      '<span style="color:var(--success);font-size:20px;flex-shrink:0">✅</span>' +
      '</div>';
  }

  // ================================================================
  // PRIVATE: Canvas fallback QR
  // ================================================================
  function _drawFallbackQR(canvas, data, size) {
    canvas.width  = size;
    canvas.height = size;
    var ctx  = canvas.getContext('2d');
    var grid = 21;
    var cell = size / grid;

    var h = 0x811c9dc5;
    for (var i = 0; i < data.length; i++) {
      h ^= data.charCodeAt(i);
      h  = (h * 0x01000193) & 0xFFFFFFFF;
    }
    h = h >>> 0;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f2557';

    for (var r = 0; r < grid; r++) {
      for (var c = 0; c < grid; c++) {
        if (_isInFinder(r, c, grid)) continue;
        var seed = Math.abs(h * (r * grid + c + 1) * 2654435761) >>> 0;
        if ((seed >>> 28) & 1) ctx.fillRect(c * cell, r * cell, cell - 0.5, cell - 0.5);
      }
    }

    [[0,0],[0,grid-7],[grid-7,0]].forEach(function(pos) {
      var row = pos[0], col = pos[1];
      ctx.fillStyle = '#0f2557';
      ctx.fillRect(col*cell,     row*cell,     7*cell, 7*cell);
      ctx.fillStyle = '#fff';
      ctx.fillRect((col+1)*cell, (row+1)*cell, 5*cell, 5*cell);
      ctx.fillStyle = '#0f2557';
      ctx.fillRect((col+2)*cell, (row+2)*cell, 3*cell, 3*cell);
    });
  }

  function _isInFinder(r, c, grid) {
    return (r < 7 && c < 7) || (r < 7 && c >= grid-7) || (r >= grid-7 && c < 7);
  }

  // ================================================================
  // PUBLIC API
  // ================================================================
  return {
    render          : render,
    startScanner    : startScanner,
    stopScanner     : stopScanner,
    manualScan      : manualScan,
    markAttendance  : markAttendance,
    markQRAttendance: markQRAttendance,
    generateQR      : generateQR,
    buildQRData     : buildQRData,
  };

})();
