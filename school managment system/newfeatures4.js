// ================================================================
// NEWFEATURES4.JS — HBHS v3.4
// 1. Student Portal mein Result Popup (roll number se)
// 2. Teacher ID Card Generator
// 3. Teacher QR Attendance (scan karke present/late)
// 4. Teacher Absent = -1.5% salary, Late = -0.5% salary (auto)
// ================================================================

// ================================================================
// 1. STUDENT PORTAL — RESULT POPUP (roll number se)
//    Student apna roll number daale, result popup mein aye
// ================================================================
const StudentResultPopup = (() => {

  // Ye function student portal ke results page mein inject karta hai
  function renderInStudentPortal() {
    const wrap = document.getElementById('std-results-details');
    if (!wrap) return;

    const s = DB.get('students').find(x => x.id === APP.currentUser?.id) || APP.currentUser;
    const results = DB.get('results', []);
    const myResults = results.filter(r => r.results?.some(rs => rs.studentId === s?.id));

    // Roll number result lookup section hamesha upar rahega
    const lookupHTML = `
      <div class="card mb-4" style="border:2px solid #6366f1;background:linear-gradient(135deg,#eef2ff,#e0e7ff)">
        <div class="card-body">
          <h6 class="fw-bold mb-1" style="color:#4338ca">🏆 Apna Result Dekhein — Roll Number Se</h6>
          <p style="font-size:13px;color:#6b7280;margin-bottom:12px">Roll number daalo aur apni position, marks aur grade dekho</p>
          <div class="d-flex gap-2 flex-wrap align-items-center">
            <input type="text" id="std-roll-lookup" class="form-control" style="max-width:200px"
              placeholder="Roll Number..."
              onkeydown="if(event.key==='Enter') StudentResultPopup.lookup()">
            <select id="std-roll-exam" class="form-select" style="max-width:220px">
              <option value="">All Exams</option>
              ${[...new Set(results.map(r => r.exam).filter(Boolean))].map(e => `<option>${e}</option>`).join('')}
            </select>
            <button class="btn btn-primary fw-bold px-4"
              onclick="StudentResultPopup.lookup()"
              style="background:linear-gradient(135deg,#6366f1,#4f46e5);border:none">
              🏆 Result Dekho
            </button>
          </div>
          ${s ? `<div style="margin-top:8px;font-size:12px;color:#6b7280">💡 Aapka Roll Number: <strong style="color:#4338ca">${s.roll}</strong></div>` : ''}
        </div>
      </div>`;

    // Purane results bhi rakhein
    let oldContent = '';
    if (!myResults.length) {
      oldContent = `<div class="card"><div class="card-body text-center py-5">
        <div style="font-size:3rem">📊</div>
        <h5 class="mt-3 text-muted">Koi Result Nahi Mila</h5>
        <p class="text-muted">Aapke results abhi tak publish nahi hue.</p>
      </div></div>`;
    } else {
      oldContent = myResults.map(r => {
        const myData = r.results?.find(rs => rs.studentId === s?.id);
        if (!myData) return '';
        const grade = Utils.getGrade(myData.pct || 0);
        const gc = Utils.gradeClass(myData.pct || 0);
        return `<div class="card mb-3">
          <div class="card-header">
            <div class="card-title">${r.exam || 'Exam'} — ${r.cls}${r.sec ? ' (' + r.sec + ')' : ''}</div>
            <small style="color:var(--text-muted)">${r.date || ''}</small>
          </div>
          <div class="card-body">
            <div class="row g-3 mb-3">
              <div class="col-4 text-center">
                <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent)">${myData.total || myData.totalObtained || 0}</div>
                <div style="font-size:12px;color:var(--text-muted)">Total Marks</div>
              </div>
              <div class="col-4 text-center">
                <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--success)">${myData.pct || 0}%</div>
                <div style="font-size:12px;color:var(--text-muted)">Percentage</div>
              </div>
              <div class="col-4 text-center">
                <div class="grade-badge ${gc}" style="font-size:24px;padding:8px 16px">${grade}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Grade</div>
              </div>
            </div>
            <div class="result-progress mb-3"><div class="result-progress-bar" style="width:${myData.pct || 0}%"></div></div>
            <div class="row g-2">
              ${(r.subjects || []).map(sub => `
                <div class="col-6 col-md-4">
                  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
                    <div style="font-size:11px;color:var(--text-muted)">${sub.name}</div>
                    <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700">${myData.marks && myData.marks[sub.id] !== undefined ? myData.marks[sub.id] : '-'}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">/${sub.total || 100}</span></div>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>`;
      }).join('');
    }

    wrap.innerHTML = lookupHTML + oldContent;

    // Popup overlay bhi inject karo agar nahi hai
    if (!document.getElementById('srp-overlay')) {
      const ov = document.createElement('div');
      ov.id = 'srp-overlay';
      ov.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;overflow-y:auto;align-items:flex-start;justify-content:center;padding:30px 0';
      ov.innerHTML = '<div id="srp-box" style="background:#fff;border-radius:20px;max-width:500px;width:94%;margin:0 auto;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.4)"></div>';
      ov.onclick = e => { if (e.target === ov) ov.style.display = 'none'; };
      document.body.appendChild(ov);
    }
  }

  function lookup() {
    const roll = (document.getElementById('std-roll-lookup')?.value || '').trim();
    const exam = document.getElementById('std-roll-exam')?.value || '';
    if (!roll) { toast('Roll number likhein!', 'error'); return; }

    const students = DB.get('students');
    const student = students.find(s => s.roll && s.roll.toLowerCase() === roll.toLowerCase());
    if (!student) { toast(`Roll No "${roll}" nahi mila!`, 'error'); return; }

    const results = DB.get('results', []);
    const classMates = students.filter(s => s.cls === student.cls);

    // Class rank calculate karo
    const ranked = classMates.map(s => {
      let tot = 0, mx = 0, sc = 0;
      const rs = exam ? results.filter(r => r.exam === exam) : results;
      rs.forEach(r => {
        const my = r.results?.find(x => x.studentId === s.id);
        if (!my) return;
        (r.subjects || []).forEach(sub => {
          if (my.marks && !Array.isArray(my.marks)) {
            tot += parseInt(my.marks[sub.id]) || 0;
            mx += parseInt(sub.total || sub.maxMarks || 100);
            sc++;
          }
        });
      });
      const pct = mx > 0 ? Math.round((tot / mx) * 100) : 0;
      return { id: s.id, pct, tot, mx, sc };
    }).filter(s => s.sc > 0).sort((a, b) => b.pct - a.pct);

    const myStats = ranked.find(s => s.id === student.id);
    if (!myStats) { toast(`${student.name} ka koi result nahi mila${exam ? ' (' + exam + ')' : ''}!`, 'error'); return; }

    const rank = ranked.findIndex(s => s.id === student.id) + 1;
    showPopup(student, myStats, rank, ranked.length, exam, results);
  }

  function gradeColor(p) { return p >= 80 ? '#059669' : p >= 60 ? '#2563eb' : p >= 50 ? '#d97706' : '#dc2626'; }

  function showPopup(student, stats, rank, total, exam, allResults) {
    const ov = document.getElementById('srp-overlay');
    const box = document.getElementById('srp-box');
    if (!ov || !box) return;

    const medals = {
      1: { icon: '🥇', label: '1st Position', grad: 'linear-gradient(135deg,#fef9c3,#fde68a)', color: '#b45309' },
      2: { icon: '🥈', label: '2nd Position', grad: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', color: '#4b5563' },
      3: { icon: '🥉', label: '3rd Position', grad: 'linear-gradient(135deg,#fdf3e9,#fde9d0)', color: '#92400e' }
    };
    const m = medals[rank];
    const gc = gradeColor(stats.pct);
    const rl = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : rank + 'th';
    const grade = Utils.getGrade(stats.pct);

    // Subject-wise rows
    let subRows = '';
    const rs = exam ? allResults.filter(r => r.exam === exam) : allResults;
    rs.forEach(r => {
      const my = r.results?.find(x => x.studentId === student.id);
      if (!my || !my.marks || Array.isArray(my.marks)) return;
      (r.subjects || []).forEach(sub => {
        const mo = parseInt(my.marks[sub.id]) || 0;
        const mx2 = parseInt(sub.total || sub.maxMarks || 100);
        const sp = Math.round((mo / mx2) * 100);
        const gc2 = gradeColor(sp);
        subRows += `<tr>
          <td style="padding:6px 10px;font-size:13px;border-bottom:1px solid #f3f4f6">${sub.name}</td>
          <td style="padding:6px 10px;text-align:center;font-weight:700;color:${mo/mx2>=0.5?'#059669':'#ef4444'};border-bottom:1px solid #f3f4f6">${mo}</td>
          <td style="padding:6px 10px;text-align:center;color:#6b7280;border-bottom:1px solid #f3f4f6">${mx2}</td>
          <td style="padding:6px 10px;text-align:center;border-bottom:1px solid #f3f4f6">
            <span style="background:${sp>=80?'#d1fae5':sp>=60?'#dbeafe':sp>=50?'#fef3c7':'#fee2e2'};color:${sp>=80?'#065f46':sp>=60?'#1e40af':sp>=50?'#92400e':'#991b1b'};padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700">${Utils.getGrade(sp)}</span>
          </td>
        </tr>`;
      });
    });

    box.innerHTML = `
      <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6,#6366f1);padding:22px;text-align:center;color:#fff">
        <div style="font-size:11px;opacity:.7;letter-spacing:2px;text-transform:uppercase">Hira Baitul Hamd School</div>
        <div style="font-size:14px;opacity:.85;margin-top:4px">${exam || 'Result Card'}</div>
      </div>
      <div style="padding:20px;text-align:center;border-bottom:1px solid #e5e7eb">
        ${student.photo
          ? `<img src="${student.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:4px solid #6366f1;box-shadow:0 4px 15px rgba(99,102,241,.3);margin-bottom:10px">`
          : `<div style="width:80px;height:80px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;font-weight:700;margin:0 auto 10px;box-shadow:0 4px 15px rgba(99,102,241,.3)">${(student.name || '?')[0]}</div>`}
        <div style="font-size:20px;font-weight:700;color:#111">${student.name}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:3px">${student.cls} ${student.section || ''} • Roll: <strong>${student.roll}</strong></div>
        ${student.father ? `<div style="font-size:12px;color:#9ca3af">Father: ${student.father}</div>` : ''}
      </div>
      <div style="padding:20px;background:${m ? m.grad : '#f9fafb'};text-align:center;border-bottom:1px solid #e5e7eb">
        ${m
          ? `<div style="font-size:4rem;margin-bottom:4px">${m.icon}</div>
             <div style="font-size:24px;font-weight:800;color:${m.color}">${m.label}</div>
             <div style="font-size:13px;color:#6b7280;margin-top:4px">Class mein ${rl} — ${total} students mein se</div>`
          : `<div style="font-size:2.5rem;margin-bottom:4px">🎓</div>
             <div style="font-size:22px;font-weight:800;color:#374151">${rl} Position</div>
             <div style="font-size:13px;color:#6b7280">Class mein ${rank}/${total}</div>`}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #e5e7eb">
        ${[['Marks', stats.tot + '/' + stats.mx, '#6366f1'], ['Percentage', stats.pct + '%', gc], ['Grade', grade, gc]].map(([l, v, c]) =>
          `<div style="text-align:center;padding:16px 8px;border-right:1px solid #e5e7eb">
            <div style="font-size:22px;font-weight:800;color:${c}">${v}</div>
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-top:2px">${l}</div>
          </div>`).join('')}
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid #e5e7eb">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px">
          <span>Performance</span><span style="font-weight:700;color:${gc}">${stats.pct}%</span>
        </div>
        <div style="background:#e5e7eb;border-radius:10px;height:12px;overflow:hidden">
          <div style="width:${stats.pct}%;background:linear-gradient(90deg,${gc},${gc}cc);height:100%;border-radius:10px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:3px"><span>0%</span><span>50% Pass</span><span>100%</span></div>
      </div>
      ${subRows ? `
        <div style="padding:14px 20px;border-bottom:1px solid #e5e7eb">
          <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">📚 Subject-wise Marks</div>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f3f4f6">
              <th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:left">Subject</th>
              <th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:center">Obtained</th>
              <th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:center">Total</th>
              <th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:center">Grade</th>
            </tr></thead>
            <tbody>${subRows}</tbody>
          </table>
        </div>` : ''}
      <div style="padding:16px 20px;text-align:center;background:#f9fafb">
        <button onclick="document.getElementById('srp-overlay').style.display='none'"
          style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;padding:10px 32px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">
          ✅ Close
        </button>
        <div style="font-size:11px;color:#9ca3af;margin-top:8px">Hira Baitul Hamd School, Sukkur</div>
      </div>`;

    ov.style.display = 'flex';
    if (rank <= 3) setTimeout(() => srpConfetti(), 400);
  }

  function srpConfetti() {
    const colors = ['#f59e0b', '#6366f1', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      const sz = Math.random() * 10 + 5;
      el.style.cssText = `position:fixed;width:${sz}px;height:${sz}px;background:${colors[Math.floor(Math.random() * colors.length)]};top:-20px;left:${Math.random() * 100}vw;border-radius:${Math.random() > .5 ? '50%' : '2px'};z-index:10001;pointer-events:none`;
      document.body.appendChild(el);
      const dur = Math.random() * 2000 + 1800;
      el.animate(
        [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 },
         { transform: `translateY(110vh) translateX(${(Math.random() - .5) * 200}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
        { duration: dur, easing: 'cubic-bezier(.25,.46,.45,.94)' }
      ).onfinish = () => el.remove();
    }
  }

  return { renderInStudentPortal, lookup, showPopup };
})();

// ================================================================
// 2. TEACHER ID CARD GENERATOR
// ================================================================
const TeacherIDCard = (() => {

  function _qr(containerId, teacher, size) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    var data = JSON.stringify({ type:'EDUTRACK_TEACHER_ATT', id:teacher.id, name:teacher.name, subject:teacher.subject||'', cls:teacher.cls||'' });
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(el, { text:data, width:146, height:146, colorDark:'#0f172a', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M });
        var cvs = el.querySelector('canvas');
        if (cvs) { cvs.style.cssText = 'display:block!important;width:146px!important;height:146px!important;'; }
      }
      catch(e) {}
    }
  }

  function _cardHTML(teacher, qrId) {
    var sch = (typeof SchoolSettings !== 'undefined') ? SchoolSettings.get() : { name:'Hira Baitul Hamd School', address:'Sukkur, Sindh', logo:'' };
    var year = new Date().getFullYear();
    var ini  = (teacher.name||'?').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();
    return (
      '<div class="idc-card" data-tch-id="' + teacher.id + '">' +
        '<div class="idc-bg-circles"><span class="idc-circle c1"></span><span class="idc-circle c2"></span><span class="idc-circle c3"></span></div>' +

        // ── Header — BLACK theme ──
        '<div class="idc-header" style="background:linear-gradient(135deg,#0f172a,#1e293b)">' +
          (sch.logo
            ? '<img src="' + sch.logo + '" style="height:32px;width:32px;border-radius:50%;object-fit:cover;flex-shrink:0">'
            : '<div class="idc-school-logo">🎓</div>') +
          '<div class="idc-school-info">' +
            '<div class="idc-school-name">' + sch.name + '</div>' +
            '<div class="idc-school-sub">TEACHER IDENTITY CARD</div>' +
          '</div>' +
          '<div class="idc-session-badge">' + year + '-' + String(year+1).slice(-2) + '</div>' +
        '</div>' +

        // ── Body ──
        '<div class="idc-body">' +
          '<div class="idc-photo-col">' +
            '<div class="idc-photo-frame" style="border-color:#cbd5e1;background:#f1f5f9;box-shadow:0 4px 14px rgba(0,0,0,.12)">' +
              (teacher.photo
                ? '<img src="' + teacher.photo + '" alt="' + teacher.name + '">'
                : '<div class="idc-photo-initials" style="background:linear-gradient(135deg,#0f172a,#334155);color:#fff">' + ini + '</div>') +
            '</div>' +
            '<div class="idc-blood-badge" style="background:rgba(15,23,42,.08);border-color:rgba(15,23,42,.2);color:#0f172a">STAFF</div>' +
          '</div>' +
          '<div class="idc-info-col">' +
            '<div class="idc-student-name">' + teacher.name + '</div>' +
            '<div class="idc-roll-chip" style="background:#f1f5f9;border-color:#cbd5e1;color:#0f172a">👩‍🏫 ' + (teacher.subject||'Teacher') + '</div>' +
            '<div class="idc-fields">' +
              (teacher.cls
                ? '<div class="idc-field"><span class="idc-field-label">Class</span><span class="idc-field-val">' + teacher.cls + '</span></div>'
                : '') +
              (teacher.phone
                ? '<div class="idc-field"><span class="idc-field-label">Phone</span><span class="idc-field-val">' + teacher.phone + '</span></div>'
                : '') +
              (teacher.email
                ? '<div class="idc-field"><span class="idc-field-label">Email</span><span class="idc-field-val" style="font-size:10px">' + teacher.email + '</span></div>'
                : '') +
              (teacher.qualification
                ? '<div class="idc-field"><span class="idc-field-label">Qual.</span><span class="idc-field-val">' + teacher.qualification + '</span></div>'
                : '') +
            '</div>' +
          '</div>' +
        '</div>' +

        // ── QR Section — BLACK theme ──
        '<div class="idc-qr-section" style="background:#f8fafc;border:1.5px solid #e2e8f0">' +
          '<div class="idc-qr-divider" style="background:linear-gradient(135deg,#0f172a,#334155)"><span>📷 Attendance QR Code</span></div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;padding:12px 12px 8px;gap:6px">' +
            '<div id="' + qrId + '" style="background:#fff;padding:8px;border-radius:10px;border:2px solid #1e293b;box-shadow:0 4px 16px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;width:162px;height:162px;flex-shrink:0"></div>' +
            '<div style="font-size:8px;color:#64748b;letter-spacing:.5px;text-transform:uppercase;font-weight:600">Scan to mark attendance</div>' +
          '</div>' +
        '</div>' +

        // ── Footer — BLACK theme ──
        '<div class="idc-footer" style="background:#0f172a;border-top:none">' +
          '<span style="color:#94a3b8">Session ' + year + '-' + (year+1) + '</span>' +
          '<span style="color:#475569">|</span>' +
          '<span style="color:#94a3b8">' + (sch.address||'Sukkur') + '</span>' +
          '<span style="color:#475569">|</span>' +
          '<span style="color:#94a3b8">If found, return to school</span>' +
        '</div>' +
      '</div>'
    );
  }

  function render() {
    var c = document.getElementById('teacher-idcard-container');
    if (!c) return;
    var role = APP.currentPortal;
    var filterVal = (document.getElementById('tch-idcard-filter')||{}).value || '';
    var searchVal = ((document.getElementById('tch-idcard-search')||{}).value||'').toLowerCase();
    var teachers = role === 'teacher'
      ? [DB.get('teachers').find(function(t){return t.id===APP.currentUser.id;})].filter(Boolean)
      : DB.get('teachers');
    var classes = DB.get('classes').map(function(x){return x.name;});
    if (filterVal) teachers = teachers.filter(function(t){return t.cls===filterVal;});
    if (searchVal) teachers = teachers.filter(function(t){
      return (t.name||'').toLowerCase().includes(searchVal)||(t.subject||'').toLowerCase().includes(searchVal);
    });

    c.innerHTML =
      (role==='admin' ?
        '<div class="card mb-4" style="border:none;box-shadow:0 2px 12px rgba(0,0,0,.08);border-radius:14px">' +
          '<div class="card-body py-3 px-4">' +
            '<div class="row g-3 align-items-end">' +
              '<div class="col-md-4"><label class="form-label fw-semibold" style="font-size:13px">🔍 Search</label>' +
                '<input type="text" id="tch-idcard-search" class="form-control" placeholder="Naam ya subject..." value="' + searchVal + '" oninput="TeacherIDCard.render()" style="border-radius:10px;font-size:13px"></div>' +
              '<div class="col-md-3"><label class="form-label fw-semibold" style="font-size:13px">📚 Class</label>' +
                '<select id="tch-idcard-filter" class="form-select" onchange="TeacherIDCard.render()" style="border-radius:10px;font-size:13px">' +
                  '<option value="">Tamam Teachers</option>' +
                  classes.map(function(c2){return '<option '+(filterVal===c2?'selected':'')+'>'+c2+'</option>';}).join('') +
                '</select></div>' +
              '<div class="col-md-5 d-flex gap-2 align-items-end flex-wrap">' +
                '<button class="btn btn-primary fw-semibold px-4" onclick="TeacherIDCard.printAll()" style="border-radius:10px">🖨️ Print All</button>' +
                '<span class="badge bg-secondary d-flex align-items-center px-3" style="border-radius:10px;font-size:12px">'+teachers.length+' Teachers</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '') +
      '<div class="row g-4" id="tch-cards-grid">' + _grid(teachers, role) + '</div>';

    setTimeout(function(){
      teachers.forEach(function(t){ if(t) _qr('tchqr-'+t.id, t, 160); });
    }, 200);
  }

  function renderMyCard() {
    var c = document.getElementById('teacher-my-idcard-container');
    if (!c) return;
    var teacher = DB.get('teachers').find(function(t){return t.id===APP.currentUser.id;});
    if (!teacher) {
      c.innerHTML = '<div style="text-align:center;padding:60px 20px"><div style="font-size:64px">🪪</div><div style="font-size:18px;font-weight:700;color:#374151;margin:16px 0 8px">ID Card nahi mili</div><div style="color:#9ca3af;font-size:13px">Admin se rabta karein apni profile update karwanay ke liye.</div></div>';
      return;
    }
    var qrId = 'my-tch-qr';
    c.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:24px;padding:20px 0">' +
        '<div class="id-card-outer">' +
          _cardHTML(teacher, qrId) +
          '<div class="idc-actions" style="margin-top:14px">' +
            '<button class="btn btn-primary idc-btn" onclick="TeacherIDCard.printOne(\'' + teacher.id + '\')">🖨️ Print</button>' +
            '<button class="btn btn-success idc-btn" onclick="TeacherIDCard.downloadOne(\'' + teacher.id + '\')">💾 Download</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    setTimeout(function(){ _qr(qrId, teacher, 160); }, 200);
  }

  function _grid(teachers, role) {
    if (!teachers || !teachers.length) {
      return '<div class="col-12"><div style="text-align:center;padding:60px 20px;background:#f9fafb;border-radius:16px;border:2px dashed #d1d5db">' +
        '<div style="font-size:56px;margin-bottom:12px">👩‍🏫</div>' +
        '<div style="font-size:17px;font-weight:700;color:#374151;margin-bottom:8px">Koi Teacher Nahi Mila</div>' +
        '<div style="font-size:13px;color:#9ca3af">' + (role==='admin'?'Pehle Teachers section mein teachers add karein.':'Admin se apni profile update karwayein.') + '</div>' +
        (role==='admin' ? '<button class="btn btn-primary mt-3 px-4" onclick="navigateTo(\'teachers\')" style="border-radius:10px">➕ Teachers Add Karein</button>' : '') +
        '</div></div>';
    }
    return teachers.map(function(t){
      return '<div class="col-xl-4 col-md-6 d-flex justify-content-center">' +
        '<div style="text-align:center">' +
          '<div class="id-card-outer" style="padding:0">' +
            _cardHTML(t, 'tchqr-'+t.id) +
          '</div>' +
          '<div class="d-flex gap-2 justify-content-center mt-3">' +
            '<button class="btn btn-sm fw-semibold px-3" onclick="TeacherIDCard.printOne(\''+t.id+'\')" style="background:#0f172a;color:#fff;border-radius:8px;font-size:12px;border:none">🖨️ Print</button>' +
            '<button class="btn btn-sm fw-semibold px-3" onclick="TeacherIDCard.downloadOne(\''+t.id+'\')" style="background:#059669;color:#fff;border-radius:8px;font-size:12px;border:none">💾 Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function printOne(teacherId) {
    var teacher = DB.get('teachers').find(function(t){return t.id===teacherId;});
    if (!teacher) { toast('Teacher nahi mila!','error'); return; }
    var qrId  = 'pqr-one-'+teacherId;
    var html  = _cardHTML(teacher, qrId);
    var qrTxt = JSON.stringify({ type:'EDUTRACK_TEACHER_ATT', id:teacher.id, name:teacher.name, subject:teacher.subject||'', cls:teacher.cls||'' });
    var w = window.open('','_blank');
    if (!w) { toast('Popup blocked!','error'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+teacher.name+' — Teacher ID Card</title>'
      +'<style>*{box-sizing:border-box}.idc-card{width:360px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.18);font-family:\'Segoe UI\',Arial,sans-serif;position:relative;border:1.5px solid #e2e8f0}.idc-bg-circles{position:absolute;inset:0;pointer-events:none;overflow:hidden}.idc-circle{position:absolute;border-radius:50%;background:#0f172a}.idc-circle.c1{width:220px;height:220px;top:-80px;right:-60px;opacity:.04}.idc-circle.c2{width:140px;height:140px;bottom:20px;left:-40px;opacity:.04}.idc-circle.c3{width:80px;height:80px;top:60px;right:40px;opacity:.03}.idc-header{background:linear-gradient(135deg,#0f172a,#1e293b);padding:14px 18px;display:flex;align-items:center;gap:12px;position:relative;z-index:1;border-bottom:3px solid #e2e8f0}.idc-school-logo{font-size:30px;flex-shrink:0}.idc-school-info{flex:1}.idc-school-name{font-size:15px;font-weight:800;color:#fff;letter-spacing:.3px}.idc-school-sub{font-size:9px;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:2px;text-transform:uppercase;margin-top:2px}.idc-session-badge{background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px}.idc-body{padding:18px 18px 12px;display:flex;gap:14px;position:relative;z-index:1;background:#fff}.idc-photo-col{display:flex;flex-direction:column;align-items:center;gap:8px}.idc-photo-frame{width:82px;height:96px;border-radius:14px;border:2.5px solid #cbd5e1;background:#f1f5f9;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,.12)}.idc-photo-frame img{width:100%;height:100%;object-fit:cover}.idc-photo-initials{font-size:32px;font-weight:800;color:#334155}.idc-blood-badge{background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.3);color:#059669;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;letter-spacing:.5px}.idc-info-col{flex:1;min-width:0}.idc-student-name{font-size:17px;font-weight:800;color:#1e293b;margin-bottom:5px;line-height:1.2}.idc-roll-chip{display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;border:1px solid #cbd5e1;color:#0f172a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:10px}.idc-fields{display:flex;flex-direction:column;gap:5px}.idc-field{display:flex;gap:6px;align-items:baseline}.idc-field-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;width:44px;flex-shrink:0}.idc-field-val{font-size:12px;color:#334155;font-weight:500}.idc-qr-section{margin:10px 14px 0;background:#f8fafc;border-radius:14px;border:2px solid #1e293b;overflow:hidden;position:relative;z-index:1}.idc-qr-divider{background:linear-gradient(135deg,#0f172a,#1e293b);padding:5px 14px;text-align:center;font-size:10px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase}.idc-qr-main{display:flex;flex-direction:column;align-items:center;padding:12px 12px 8px;gap:6px}.idc-qr-big-box{background:#fff;padding:7px;border-radius:10px;border:2px solid #1e293b;box-shadow:0 4px 14px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;width:160px;height:160px;flex-shrink:0}.idc-qr-big-box canvas{display:block!important;width:146px!important;height:146px!important}.idc-qr-scan-label{font-size:8px;color:#64748b;letter-spacing:.5px;text-align:center;text-transform:uppercase;font-weight:600}.idc-footer{background:#0f172a;border-top:none;padding:7px 18px;display:flex;justify-content:center;align-items:center;gap:8px;font-size:9px;color:#94a3b8;letter-spacing:.5px;margin-top:14px}body{margin:0;padding:30px;background:#f3f4f6;display:flex;justify-content:center}@media print{body{background:#fff;padding:8px}.no-print{display:none!important}}</style>'
      +'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
      +'</head><body><div>'
      + html
      +'<div class="no-print" style="text-align:center;margin-top:16px"><button onclick="window.print()" style="background:#0f172a;color:#fff;border:none;padding:10px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print</button></div>'
      +'</div>'
      +'<script>window.onload=function(){var el=document.getElementById("'+qrId+'");if(el&&typeof QRCode!=="undefined"){try{new QRCode(el,{text:'+JSON.stringify(qrTxt)+',width:146,height:146,colorDark:"#0f172a",colorLight:"#fff"});var c=el.querySelector("canvas");if(c)c.style.cssText="display:block!important;width:146px!important;height:146px!important;";}catch(e){}}}<\/script>'
      +'</body></html>');
    w.document.close();
  }

  function printAll() {
    var cls    = (document.getElementById('tch-idcard-filter')||{}).value || '';
    var search = ((document.getElementById('tch-idcard-search')||{}).value||'').toLowerCase();
    var teachers = DB.get('teachers');
    if (cls)    teachers = teachers.filter(function(t){return t.cls===cls;});
    if (search) teachers = teachers.filter(function(t){return (t.name||'').toLowerCase().includes(search)||(t.subject||'').toLowerCase().includes(search);});
    if (!teachers.length) { toast('Koi teacher nahi mila!','error'); return; }
    var qrItems = teachers.map(function(t){ return { id:'pqr-'+t.id, data:JSON.stringify({type:'EDUTRACK_TEACHER_ATT',id:t.id,name:t.name,subject:t.subject||'',cls:t.cls||''}) }; });
    var cards   = teachers.map(function(t){ return '<div style="display:inline-block;margin:12px;vertical-align:top">'+_cardHTML(t,'pqr-'+t.id)+'</div>'; }).join('');
    var w = window.open('','_blank');
    if (!w) { toast('Popup blocked!','error'); return; }
    // reuse same CSS as printOne
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>All Teacher ID Cards</title>'
      +'<style>*{box-sizing:border-box}.idc-card{width:360px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.18);font-family:\'Segoe UI\',Arial,sans-serif;position:relative;border:1.5px solid #e2e8f0}.idc-bg-circles{position:absolute;inset:0;pointer-events:none;overflow:hidden}.idc-circle{position:absolute;border-radius:50%;background:#0f172a}.idc-circle.c1{width:220px;height:220px;top:-80px;right:-60px;opacity:.04}.idc-circle.c2{width:140px;height:140px;bottom:20px;left:-40px;opacity:.04}.idc-circle.c3{width:80px;height:80px;top:60px;right:40px;opacity:.03}.idc-header{background:linear-gradient(135deg,#0f172a,#1e293b);padding:14px 18px;display:flex;align-items:center;gap:12px;position:relative;z-index:1;border-bottom:3px solid #e2e8f0}.idc-school-logo{font-size:30px;flex-shrink:0}.idc-school-info{flex:1}.idc-school-name{font-size:15px;font-weight:800;color:#fff;letter-spacing:.3px}.idc-school-sub{font-size:9px;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:2px;text-transform:uppercase;margin-top:2px}.idc-session-badge{background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px}.idc-body{padding:18px 18px 12px;display:flex;gap:14px;position:relative;z-index:1;background:#fff}.idc-photo-col{display:flex;flex-direction:column;align-items:center;gap:8px}.idc-photo-frame{width:82px;height:96px;border-radius:14px;border:2.5px solid #cbd5e1;background:#f1f5f9;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,.12)}.idc-photo-frame img{width:100%;height:100%;object-fit:cover}.idc-photo-initials{font-size:32px;font-weight:800;color:#334155}.idc-blood-badge{background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.3);color:#059669;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;letter-spacing:.5px}.idc-info-col{flex:1;min-width:0}.idc-student-name{font-size:17px;font-weight:800;color:#1e293b;margin-bottom:5px;line-height:1.2}.idc-roll-chip{display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;border:1px solid #cbd5e1;color:#0f172a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:10px}.idc-fields{display:flex;flex-direction:column;gap:5px}.idc-field{display:flex;gap:6px;align-items:baseline}.idc-field-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;width:44px;flex-shrink:0}.idc-field-val{font-size:12px;color:#334155;font-weight:500}.idc-qr-section{margin:10px 14px 0;background:#f8fafc;border-radius:14px;border:2px solid #1e293b;overflow:hidden;position:relative;z-index:1}.idc-qr-divider{background:linear-gradient(135deg,#0f172a,#1e293b);padding:5px 14px;text-align:center;font-size:10px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase}.idc-qr-main{display:flex;flex-direction:column;align-items:center;padding:12px 12px 8px;gap:6px}.idc-qr-big-box{background:#fff;padding:7px;border-radius:10px;border:2px solid #1e293b;box-shadow:0 4px 14px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;width:160px;height:160px;flex-shrink:0}.idc-qr-big-box canvas{display:block!important;width:146px!important;height:146px!important}.idc-qr-scan-label{font-size:8px;color:#64748b;letter-spacing:.5px;text-align:center;text-transform:uppercase;font-weight:600}.idc-footer{background:#0f172a;border-top:none;padding:7px 18px;display:flex;justify-content:center;align-items:center;gap:8px;font-size:9px;color:#94a3b8;letter-spacing:.5px;margin-top:14px}body{margin:0;padding:20px;background:#f5f5f5;text-align:center}@media print{body{background:#fff;padding:0}.no-print{display:none!important}}</style>'
      +'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
      +'</head><body>'
      +'<div class="no-print" style="margin-bottom:20px;padding:14px 20px;background:#0f172a;border-radius:12px;display:inline-block">'
      +'<span style="color:#fff;font-weight:700;font-size:14px">🖨️ '+teachers.length+' Teacher ID Cards</span>'
      +'<button onclick="window.print()" style="margin-left:16px;background:#fbbf24;color:#1a1a1a;border:none;padding:7px 20px;border-radius:8px;font-weight:700;cursor:pointer">Print All</button>'
      +'</div><br>'
      + cards
      +'<script>var _q='+JSON.stringify(qrItems)+';window.onload=function(){_q.forEach(function(q){var el=document.getElementById(q.id);if(el&&typeof QRCode!=="undefined"){try{new QRCode(el,{text:q.data,width:146,height:146,colorDark:"#0f172a",colorLight:"#fff"});var c=el.querySelector("canvas");if(c)c.style.cssText="display:block!important;width:146px!important;height:146px!important;";}catch(e){}}});}<\/script>'
      +'</body></html>');
    w.document.close();
    toast('✅ ' + teachers.length + ' cards print window mein!', 'success');
  }

  function downloadOne(teacherId) {
    var card = document.querySelector('.idc-card[data-tch-id="'+teacherId+'"]');
    if (!card) { toast('Card nahi mila!','error'); return; }
    if (typeof html2canvas !== 'undefined') {
      toast('Saving...','info');
      html2canvas(card, {scale:2.5,useCORS:true,allowTaint:true,backgroundColor:'#fff'}).then(function(canvas){
        var a = document.createElement('a');
        a.download = 'teacher-idcard-'+teacherId+'.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        toast('✅ ID Card saved!','success');
      }).catch(function(){ printOne(teacherId); });
    } else { printOne(teacherId); }
  }

  return { render:render, renderMyCard:renderMyCard, printOne:printOne, printAll:printAll, downloadOne:downloadOne };
})();

// ================================================================
// 3. TEACHER QR ATTENDANCE SCANNER
//    Teacher apna QR card scan kare ya manually mark kare
//    Auto salary deduction: Absent = -1.5%, Late = -0.5%
// ================================================================
const TeacherQRAttendance = (() => {

  let _stream = null;
  let _scanLoop = null;
  let _scanning = false;

  function render() {
    const c = document.getElementById('teacher-qr-container');
    if (!c) return;
    const today = Utils.todayStr();
    const teachers = DB.get('teachers');
    const staffAtt = DB.get('staff_attendance', []);
    const todayAtt = staffAtt.filter(a => a.date === today);
    const presentCount = todayAtt.filter(a => a.status === 'present').length;
    const absentCount = todayAtt.filter(a => a.status === 'absent').length;
    const lateCount = todayAtt.filter(a => a.status === 'late').length;

    c.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">✅</div><div style="font-size:1.8rem;font-weight:700">${presentCount}</div><div style="font-size:12px;opacity:.85">Aaj Present</div></div></div></div>
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">❌</div><div style="font-size:1.8rem;font-weight:700">${absentCount}</div><div style="font-size:12px;opacity:.85">Aaj Absent</div></div></div></div>
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">⏰</div><div style="font-size:1.8rem;font-weight:700">${lateCount}</div><div style="font-size:12px;opacity:.85">Aaj Late</div></div></div></div>
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">👥</div><div style="font-size:1.8rem;font-weight:700">${teachers.length}</div><div style="font-size:12px;opacity:.85">Total Teachers</div></div></div></div>
      </div>

      <div class="row g-3 mb-4">
        <!-- QR Scanner -->
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header"><div class="card-title">📷 Teacher QR Scanner</div></div>
            <div class="card-body">
              <div id="tqr-scan-area" style="display:none;margin-bottom:12px">
                <div style="position:relative;width:100%;max-width:320px;margin:0 auto;border-radius:12px;overflow:hidden;background:#000">
                  <video id="tqr-video" autoplay playsinline muted style="width:100%;display:block"></video>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
                    <div style="width:200px;height:200px;border:3px solid #10b981;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.4)">
                      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#10b981,transparent);animation:qrscan 2s linear infinite"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="tqr-result" class="mb-3"></div>
              <div class="d-flex gap-2 mb-3">
                <button class="btn btn-primary flex-grow-1" onclick="TeacherQRAttendance.startScanner()">📷 Camera Start</button>
                <button class="btn btn-outline-secondary" onclick="TeacherQRAttendance.stopScanner()">⏹ Stop</button>
              </div>
              <div style="border-top:1px solid var(--border);padding-top:14px">
                <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text)">✍️ Manual Mark (Teacher Name se)</div>
                <div class="row g-2 mb-2">
                  <div class="col-8">
                    <select id="tqr-manual-teacher" class="form-select">
                      <option value="">Teacher select karein...</option>
                      ${teachers.map(t => {
                        const att = todayAtt.find(a => a.teacherId === t.id);
                        return `<option value="${t.id}">${t.name}${att ? ' (' + att.status + ')' : ''}</option>`;
                      }).join('')}
                    </select>
                  </div>
                  <div class="col-4">
                    <select id="tqr-manual-status" class="form-select">
                      <option value="present">✅ Present</option>
                      <option value="late">⏰ Late</option>
                      <option value="absent">❌ Absent</option>
                      <option value="leave">🏖️ Leave</option>
                    </select>
                  </div>
                </div>
                <button class="btn btn-success w-100" onclick="TeacherQRAttendance.manualMark()">✅ Attendance Mark Karein</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Today's Log -->
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header">
              <div class="card-title">📋 Aaj ki Attendance Log</div>
              <small style="color:var(--text-muted)">${new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
            </div>
            <div class="card-body p-0" id="tqr-log-area" style="max-height:380px;overflow-y:auto">
              ${renderTodayLog(todayAtt, teachers)}
            </div>
          </div>
        </div>
      </div>

      <!-- Staff Status Table -->
      <div class="card">
        <div class="card-header"><div class="card-title">📊 Aaj ki Staff Status (${today})</div></div>
        <div class="card-body p-0">
          <div class="table-container">
            <table class="table table-hover align-middle">
              <thead><tr><th>#</th><th>Teacher</th><th>Subject</th><th>Class</th><th>Status</th><th>Salary Deduction</th></tr></thead>
              <tbody>
                ${teachers.map((t, i) => {
                  const att = todayAtt.find(a => a.teacherId === t.id);
                  const salaries = DB.get('salaries', []);
                  const curMonth = new Date().toISOString().slice(0, 7);
                  const sal = salaries.find(s => s.teacherId === t.id && s.month === curMonth);
                  const basicSal = sal?.amount || 0;
                  let dedAmt = 0, dedLabel = '—';
                  if (att?.status === 'absent') { dedAmt = Math.round(basicSal * 0.015); dedLabel = `PKR ${dedAmt.toLocaleString()} (-1.5%)`; }
                  else if (att?.status === 'late') { dedAmt = Math.round(basicSal * 0.005); dedLabel = `PKR ${dedAmt.toLocaleString()} (-0.5%)`; }
                  const statusBadge = !att
                    ? '<span style="background:#f3f4f6;color:#9ca3af;padding:3px 10px;border-radius:12px;font-size:12px">—</span>'
                    : att.status === 'present'
                      ? '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">✅ Present</span>'
                      : att.status === 'absent'
                        ? '<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">❌ Absent</span>'
                        : att.status === 'late'
                          ? '<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">⏰ Late</span>'
                          : '<span style="background:#ede9fe;color:#5b21b6;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">🏖️ Leave</span>';
                  return `<tr>
                    <td>${i + 1}</td>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        ${t.photo ? `<img src="${t.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">` :
                          `<div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${(t.name || '?')[0]}</div>`}
                        <span style="font-weight:600">${t.name}</span>
                      </div>
                    </td>
                    <td>${t.subject || '—'}</td>
                    <td>${t.cls || '—'}</td>
                    <td>${statusBadge}</td>
                    <td style="color:${dedAmt > 0 ? '#ef4444' : '#9ca3af'};font-weight:${dedAmt > 0 ? '600' : '400'}">${dedLabel}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function renderTodayLog(todayAtt, teachers) {
    if (!todayAtt.length) return '<div style="text-align:center;padding:30px;color:#9ca3af;font-size:13px">Aaj koi attendance mark nahi hui abhi tak.</div>';
    return todayAtt.map(a => {
      const t = teachers.find(x => x.id === a.teacherId);
      const colors = { present: ['#d1fae5', '#065f46', '✅'], absent: ['#fee2e2', '#991b1b', '❌'], late: ['#fef3c7', '#92400e', '⏰'], leave: ['#ede9fe', '#5b21b6', '🏖️'] };
      const [bg, fg, icon] = colors[a.status] || ['#f3f4f6', '#374151', '•'];
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
        ${t?.photo ? `<img src="${t.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0">` :
          `<div style="width:34px;height:34px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0">${(t?.name || '?')[0]}</div>`}
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${t?.name || 'Unknown'}</div>
          <div style="font-size:11px;color:#9ca3af">${t?.subject || ''}</div>
        </div>
        <span style="background:${bg};color:${fg};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">${icon} ${a.status}</span>
      </div>`;
    }).join('');
  }

  function startScanner() {
    const area = document.getElementById('tqr-scan-area');
    const video = document.getElementById('tqr-video');
    if (!area || !video) return;
    if (_scanning) return; // already running guard
    area.style.display = 'block';
    _scanning = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Camera is browser mein supported nahi.', 'error');
      _scanning = false;
      return;
    }
    if (typeof jsQR === 'undefined') {
      toast('QR scanner library load nahi hui. Reload karein.', 'error');
      _scanning = false;
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
      .then(stream => {
        _stream = stream;
        video.srcObject = stream;
        video.play();
        // requestAnimationFrame — non-blocking, pauses when tab hidden (no battery drain)
        const scanCanvas = document.createElement('canvas');
        const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
        let lastQRData = null;
        let lastQRTime = 0;

        function tick() {
          if (!_scanning) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            scanCanvas.width  = video.videoWidth;
            scanCanvas.height = video.videoHeight;
            scanCtx.drawImage(video, 0, 0);
            const imgData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
            if (code) {
              const now = Date.now();
              // Debounce: same QR 3 sec tak dobara na chale
              if (code.data !== lastQRData || now - lastQRTime > 3000) {
                lastQRData = code.data;
                lastQRTime = now;
                processQR(code.data);
                stopScanner();
                return;
              }
            }
          }
          _scanLoop = requestAnimationFrame(tick);
        }
        _scanLoop = requestAnimationFrame(tick);
      })
      .catch(() => toast('Camera access nahi mila!', 'error'));
  }

  function stopScanner() {
    _scanning = false;
    if (_scanLoop) { cancelAnimationFrame(_scanLoop); _scanLoop = null; }
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
    const area = document.getElementById('tqr-scan-area');
    if (area) area.style.display = 'none';
  }

  function processQR(rawData) {
    try {
      const data = JSON.parse(rawData);
      if ((data.type !== 'TEACHER_ATTENDANCE' && data.type !== 'EDUTRACK_TEACHER_ATT') || !data.id) {
        toast('Yeh teacher QR nahi hai!', 'error'); return;
      }
      const teacher = DB.get('teachers').find(t => t.id === data.id);
      if (!teacher) { toast('Teacher nahi mila QR mein!', 'error'); return; }
      markTeacher(teacher, 'present');
    } catch (e) { toast('QR read karne mein masla hua!', 'error'); }
  }

  function manualMark() {
    const teacherId = document.getElementById('tqr-manual-teacher')?.value;
    const status = document.getElementById('tqr-manual-status')?.value || 'present';
    if (!teacherId) { toast('Teacher select karein!', 'error'); return; }
    const teacher = DB.get('teachers').find(t => t.id === teacherId);
    if (!teacher) return;
    markTeacher(teacher, status);
  }

  // ================================================================
  // CORE: Teacher attendance mark karo + salary deduction lagao
  // Absent = -1.5% of basic salary
  // Late   = -0.5% of basic salary
  // ================================================================
  function markTeacher(teacher, status) {
    const today = Utils.todayStr();
    const curMonth = new Date().toISOString().slice(0, 7);

    // 1. Already present check — pehle hi check karo, DB se touch karne se pehle
    let staffAtt = DB.get('staff_attendance', []);
    const existingIdx = staffAtt.findIndex(a => a.teacherId === teacher.id && a.date === today);

    if (existingIdx >= 0 && staffAtt[existingIdx].status === status) {
      // Koi change nahi — sirf popup dikhao
      _showInstantResult(teacher, status, '', true);
      return;
    }

    // 2. Record save karo
    const attRecord = {
      id: existingIdx >= 0 ? staffAtt[existingIdx].id : Utils.genId(),
      teacherId: teacher.id,
      date: today,
      status,
      markedAt: new Date().toISOString(),
      markedBy: 'QR Scan'
    };
    if (existingIdx >= 0) {
      const oldStatus = staffAtt[existingIdx].status;
      staffAtt[existingIdx] = attRecord;
      // Status change hua — purana deduction reverse karo
      if (oldStatus !== status) reversePreviousDeduction(teacher.id, today, oldStatus, curMonth);
    } else {
      staffAtt.push(attRecord);
    }
    DB.set('staff_attendance', staffAtt);

    // 3. Salary deduction calculate karo
    let deductionApplied = 0;
    let deductionMsg = '';
    if (status === 'absent' || status === 'late') {
      const salaries = DB.get('salaries', []);
      const salIdx = salaries.findIndex(s => s.teacherId === teacher.id && s.month === curMonth);
      if (salIdx >= 0) {
        const basicSal = salaries[salIdx].amount || 0;
        if (basicSal > 0) {
          const pct = status === 'absent' ? 0.015 : 0.005;
          deductionApplied = Math.round(basicSal * pct);
          const dedLog = salaries[salIdx].dedLog || [];
          // Aaj ka deduction pehle se nahi lagaya toh lagao
          const alreadyDed = dedLog.find(d => d.date === today);
          if (!alreadyDed && deductionApplied > 0) {
            dedLog.push({ date: today, status, amount: deductionApplied, pct: pct * 100 });
            salaries[salIdx].deduction = (salaries[salIdx].deduction || 0) + deductionApplied;
            salaries[salIdx].dedLog = dedLog;
            salaries[salIdx].notes = (salaries[salIdx].notes || '') + ` | ${today}: ${status} (-PKR ${deductionApplied})`;
            DB.set('salaries', salaries);
            deductionMsg = ` — PKR ${deductionApplied.toLocaleString()} salary se kati (${status === 'absent' ? '1.5' : '0.5'}%)`;
          }
        }
      }
    }

    // 4. Instant UI feedback — render() ke wait ke bagair
    _showInstantResult(teacher, status, deductionMsg, false);

    toast(`${teacher.name} — ${status}${deductionMsg}`, status === 'present' ? 'success' : 'info');
    if (typeof ActivityLog !== 'undefined') {
      ActivityLog.log('Teacher Attendance', `${teacher.name}: ${status}${deductionApplied ? ', Deduction: PKR ' + deductionApplied : ''}`, 'Teacher QR');
    }

    // Page refresh — sirf agar teacher-qr page active ho
    if (document.getElementById('tqr-log-area')) {
      setTimeout(() => render(), 200);
    }
  }

  // ── BEEP SOUND — students wala hi system ──
  function _playBeep(status, alreadyMarked) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (alreadyMarked) {
        // Warning — double beep
        [0, 0.18].forEach(function(delay) {
          var osc = ctx.createOscillator(); var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = 440;
          gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
          osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.14);
        });
      } else if (status === 'present') {
        // Success — two-note happy chime
        [[880, 0], [1100, 0.14]].forEach(function(pair) {
          var osc = ctx.createOscillator(); var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = pair[0];
          gain.gain.setValueAtTime(0.4, ctx.currentTime + pair[1]);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + pair[1] + 0.22);
          osc.start(ctx.currentTime + pair[1]); osc.stop(ctx.currentTime + pair[1] + 0.24);
        });
      } else if (status === 'absent') {
        // Low sad tone for absent
        [[330, 0], [280, 0.18]].forEach(function(pair) {
          var osc = ctx.createOscillator(); var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = pair[0];
          gain.gain.setValueAtTime(0.3, ctx.currentTime + pair[1]);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + pair[1] + 0.25);
          osc.start(ctx.currentTime + pair[1]); osc.stop(ctx.currentTime + pair[1] + 0.27);
        });
      } else {
        // Late/Leave — single medium tone
        var osc = ctx.createOscillator(); var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.22);
      }
    } catch(e) {}
  }

  // ── BIG POPUP — bilkul students wala style ──
  function _showBigPopup(teacher, status, deductionMsg, alreadyMarked) {
    var existing = document.getElementById('tqr-success-popup');
    if (existing) existing.remove();

    _playBeep(status, alreadyMarked);

    var statusConf = {
      present: { ac:'#22c55e', acLight:'rgba(34,197,94,.15)', acBorder:'rgba(34,197,94,.35)', btnGrad:'linear-gradient(135deg,#16a34a,#22c55e)', titleTxt:'&#x2705; Attendance Lag Gayi!', subTxt:'Successfully Present Mark Ho Gaya', icon:'✅' },
      absent:  { ac:'#ef4444', acLight:'rgba(239,68,68,.15)',  acBorder:'rgba(239,68,68,.35)',  btnGrad:'linear-gradient(135deg,#dc2626,#ef4444)', titleTxt:'&#x274C; Absent Mark Ho Gaya',    subTxt:'Aaj ki attendance absent hai',        icon:'❌' },
      late:    { ac:'#f59e0b', acLight:'rgba(245,158,11,.15)', acBorder:'rgba(245,158,11,.35)', btnGrad:'linear-gradient(135deg,#d97706,#f59e0b)', titleTxt:'&#x23F0; Late Mark Ho Gaya',      subTxt:'Aaj late aye hain',                   icon:'⏰' },
      leave:   { ac:'#8b5cf6', acLight:'rgba(139,92,246,.15)', acBorder:'rgba(139,92,246,.35)', btnGrad:'linear-gradient(135deg,#7c3aed,#8b5cf6)', titleTxt:'&#x1F3D6;&#xFE0F; Leave Mark Ho Gayi', subTxt:'Aaj leave par hain',             icon:'🏖️' },
    };
    if (alreadyMarked) {
      statusConf.present.titleTxt = '&#x26A0;&#xFE0F; Pehle Se Mark Hai!';
      statusConf.present.subTxt = 'Yeh teacher aaj pehle se mark ho chuka hai';
    }
    var sc = statusConf[status] || statusConf.present;
    var ac = sc.ac, acLight = sc.acLight, acBorder = sc.acBorder;

    var photoHtml = teacher.photo
      ? '<img src="' + teacher.photo + '" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid ' + ac + ';margin:0 auto 14px;display:block">'
      : '<div style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#0f172a,#334155);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#fff;margin:0 auto 14px;border:3px solid ' + ac + '">' + Utils.avatar(teacher.name) + '</div>';

    var tickPath = alreadyMarked
      ? '<text x="26" y="33" text-anchor="middle" font-size="20" fill="' + ac + '">!</text>'
      : '<path fill="none" stroke="' + ac + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M14 27 l8 8 l16-16" stroke-dasharray="48" stroke-dashoffset="48" style="animation:qrTickDraw .4s ease .65s forwards"/>';

    var popup = document.createElement('div');
    popup.id = 'tqr-success-popup';
    popup.innerHTML =
      '<div id="tqrpbd" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:qrFadeIn .2s ease">' +
        '<div id="tqrpbx" style="background:var(--surface,#1e293b);border-radius:24px;padding:30px 26px 24px;text-align:center;width:min(370px,90vw);box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08);animation:qrPopupIn .35s cubic-bezier(.34,1.56,.64,1)">' +

          // animated SVG circle + tick
          '<div style="width:68px;height:68px;margin:0 auto 10px">' +
            '<svg viewBox="0 0 52 52" style="width:68px;height:68px">' +
              '<circle cx="26" cy="26" r="25" fill="none" stroke="' + ac + '" stroke-width="2.5" stroke-dasharray="166" stroke-dashoffset="166" style="animation:qrCircleDraw .6s ease .05s forwards"/>' +
              tickPath +
            '</svg>' +
          '</div>' +

          // title
          '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:' + ac + ';margin-bottom:14px">' + sc.titleTxt + '</div>' +

          // photo
          photoHtml +

          // NAME
          '<div style="font-family:Syne,sans-serif;font-size:22px;font-weight:900;color:var(--text,#f1f5f9);margin-bottom:8px;line-height:1.2">' + teacher.name + '</div>' +

          // subject + class chips
          '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">' +
            (teacher.subject ? '<span style="background:' + acLight + ';border:1.5px solid ' + acBorder + ';color:' + ac + ';font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">📚 ' + teacher.subject + '</span>' : '') +
            (teacher.cls ? '<span style="background:' + acLight + ';border:1.5px solid ' + acBorder + ';color:' + ac + ';font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">🏫 Class ' + teacher.cls + '</span>' : '') +
          '</div>' +

          // date
          '<div style="font-size:12px;color:var(--text-muted,#94a3b8);margin-bottom:4px">📅 ' + new Date().toLocaleDateString('en-PK',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) + '</div>' +

          // status
          '<div style="font-size:13px;color:' + ac + ';font-weight:700;margin-bottom:' + (deductionMsg ? '6px' : '20px') + '">' + sc.subTxt + '</div>' +

          // deduction msg
          (deductionMsg ? '<div style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:8px 14px;font-size:12px;color:#ef4444;font-weight:700;margin-bottom:16px">' + deductionMsg + '</div>' : '') +

          // done button
          '<button id="tqrpclose" style="background:' + sc.btnGrad + ';color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;padding:13px 0;cursor:pointer;width:100%;letter-spacing:.3px">Done ✓</button>' +

        '</div>' +
      '</div>';

    document.body.appendChild(popup);

    function closePopup() {
      var p = document.getElementById('tqr-success-popup');
      if (!p) return;
      var bx = p.querySelector('#tqrpbx');
      if (bx) bx.style.animation = 'qrPopupOut .25s ease forwards';
      setTimeout(function() { if (p && p.parentNode) p.remove(); }, 260);
    }

    popup.querySelector('#tqrpclose').addEventListener('click', closePopup);
    popup.querySelector('#tqrpbd').addEventListener('click', function(e) { if (e.target === this) closePopup(); });
    setTimeout(closePopup, 5000);
  }

  function _showInstantResult(teacher, status, deductionMsg, alreadyMarked) {
    // BIG POPUP — bilkul students wala
    _showBigPopup(teacher, status, deductionMsg, alreadyMarked);

    // tqr-result: Teacher QR page ka chhota inline result box bhi update karo
    const resultEl = document.getElementById('tqr-result');
    if (resultEl) {
      const colors = {
        present: ['#d1fae5', '#065f46', '✅ Present'],
        absent:  ['#fee2e2', '#991b1b', '❌ Absent'],
        late:    ['#fef3c7', '#92400e', '⏰ Late'],
        leave:   ['#ede9fe', '#5b21b6', '🏖️ On Leave']
      };
      const [bg, fg, label] = colors[status] || ['#f3f4f6', '#374151', status];
      const alreadyBadge = alreadyMarked ? '<div style="font-size:11px;opacity:.7;margin-top:2px">Pehle se mark hai</div>' : '';
      resultEl.innerHTML = `
        <div style="background:${bg};border:2px solid ${fg}33;border-radius:12px;padding:14px;text-align:center;animation:fadeUp .3s ease">
          <div style="font-size:1.8rem;margin-bottom:4px">${label.split(' ')[0]}</div>
          <div style="font-size:16px;font-weight:700;color:${fg}">${teacher.name}</div>
          <div style="font-size:13px;color:${fg};opacity:.8;margin-top:2px">${label}${deductionMsg ? '<br><strong>' + deductionMsg + '</strong>' : ''}</div>
          ${alreadyBadge}
        </div>`;
    }

    // qr-scan-result: Main QR Attendance page ka result box (jab qr.js se call ho)
    const qrResultEl = document.getElementById('qr-scan-result');
    if (qrResultEl && !resultEl) {
      const colors = {
        present: ['rgba(34,197,94,.12)', '#22c55e', '✅ Teacher Present!'],
        absent:  ['rgba(239,68,68,.12)',  '#ef4444', '❌ Teacher Absent!'],
        late:    ['rgba(245,158,11,.12)', '#f59e0b', '⏰ Teacher Late!'],
        leave:   ['rgba(99,102,241,.12)', '#6366f1', '🏖️ Teacher On Leave']
      };
      const [bg, clr, lbl] = colors[status] || ['rgba(100,100,100,.1)', '#888', status];
      qrResultEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;background:${bg};border:2px solid ${clr};border-radius:var(--radius);padding:16px;animation:fadeUp .3s ease">
          ${teacher.photo
            ? `<img src="${teacher.photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid ${clr};flex-shrink:0">`
            : `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0f172a,#334155);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0">${Utils.avatar(teacher.name)}</div>`}
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:17px;color:${clr}">${lbl}</div>
            <div style="font-size:14px;font-weight:600">${teacher.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">👩‍🏫 Teacher &nbsp;•&nbsp; ${teacher.subject || ''} &nbsp;•&nbsp; ${Utils.todayStr()}</div>
            ${deductionMsg ? `<div style="font-size:12px;color:#ef4444;font-weight:600;margin-top:2px">${deductionMsg}</div>` : ''}
          </div>
        </div>`;
    }
  }

  // Agar attendance status change ho toh purana deduction reverse karo
  function reversePreviousDeduction(teacherId, date, oldStatus, month) {
    if (oldStatus !== 'absent' && oldStatus !== 'late') return;
    const salaries = DB.get('salaries', []);
    const salIdx = salaries.findIndex(s => s.teacherId === teacherId && s.month === month);
    if (salIdx < 0) return;
    const dedLog = salaries[salIdx].dedLog || [];
    const prevDed = dedLog.find(d => d.date === date);
    if (prevDed) {
      salaries[salIdx].deduction = Math.max(0, (salaries[salIdx].deduction || 0) - prevDed.amount);
      salaries[salIdx].dedLog = dedLog.filter(d => d.date !== date);
      DB.set('salaries', salaries);
    }
  }

  function cleanup() {
    stopScanner();
  }

  return { render, startScanner, stopScanner, manualMark, markTeacher, cleanup };
})();
