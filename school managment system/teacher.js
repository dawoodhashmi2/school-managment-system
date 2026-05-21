// ================================================================
// TEACHER.JS  —  Teacher QR ID Card + Attendance + Results
// ================================================================

// FIX: TeacherIDCardLegacy is dead code — app uses TeacherIDCard (newfeatures4.js)
// Kept here only as reference; NOT used anywhere in the app.
// const TeacherIDCardLegacy = ... (removed to keep global scope clean)


// ================================================================
// TEACHER ATTENDANCE
// ================================================================
const TeacherAttendance = (() => {

  // ── Unified: markFromQR ab TeacherQRAttendance.markTeacher() use karta hai ──
  // Purana teacherAttendance key hata diya — ab staff_attendance use hota hai.
  function markFromQR(teacher) {
    if (typeof TeacherQRAttendance !== 'undefined') {
      TeacherQRAttendance.markTeacher(teacher, 'present');
    }
  }

  function _showScanResult(teacher, date, alreadyMarked) {
    const el = document.getElementById('qr-scan-result');
    if (!el) return;
    const clr = alreadyMarked ? '#f59e0b' : '#059669';
    const bg  = alreadyMarked ? 'rgba(245,158,11,.1)' : 'rgba(5,150,105,.1)';
    const lbl = alreadyMarked ? '⚠️ Pehle se Present!' : '✅ Teacher Present!';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;background:${bg};border:2px solid ${clr};
                  border-radius:var(--radius);padding:16px;animation:fadeUp .3s ease">
        ${teacher.photo
          ? `<img src="${teacher.photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid ${clr};flex-shrink:0">`
          : `<div style="width:56px;height:56px;border-radius:50%;background:${clr};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0">${Utils.avatar(teacher.name)}</div>`}
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:17px;color:${clr}">${lbl}</div>
          <div style="font-size:14px;font-weight:600">${teacher.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">👩‍🏫 Teacher &nbsp;•&nbsp; ${teacher.subject||''} &nbsp;•&nbsp; ${date}</div>
        </div>
      </div>`;
  }

  function _showPopup(teacher, date) {
    const old = document.getElementById('qr-success-popup');
    if (old) old.remove();
    const popup = document.createElement('div');
    popup.id = 'qr-success-popup';
    popup.innerHTML = `
      <div class="qr-popup-backdrop" id="qr-popup-backdrop">
        <div class="qr-popup-card">
          <div class="qr-popup-checkwrap">
            <svg class="qr-popup-check" viewBox="0 0 52 52">
              <circle class="qr-check-circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="qr-check-tick" fill="none" d="M14 27 l8 8 l16-16"/>
            </svg>
          </div>
          <div class="qr-popup-title">Teacher Attendance!</div>
          <div class="qr-popup-name">${teacher.name}</div>
          <div class="qr-popup-meta">
            <span class="qr-popup-badge">👩‍🏫 Teacher</span>
            ${teacher.subject?`<span class="qr-popup-badge">${teacher.subject}</span>`:''}
            ${teacher.cls?`<span class="qr-popup-badge">Class ${teacher.cls}</span>`:''}
          </div>
          <div class="qr-popup-date">${new Date(date).toLocaleDateString('en-PK',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
          <div class="qr-popup-sub">✅ Successfully marked Present</div>
          <button class="qr-popup-close" onclick="document.getElementById('qr-success-popup').remove()">Done</button>
        </div>
      </div>`;
    document.body.appendChild(popup);
    setTimeout(() => {
      const p = document.getElementById('qr-success-popup');
      if (p) { p.querySelector('.qr-popup-card').style.animation='qrPopupOut .3s ease forwards'; setTimeout(()=>p.remove(),300); }
    }, 4000);
    popup.querySelector('#qr-popup-backdrop').addEventListener('click', function(e) {
      if (e.target === this) { popup.querySelector('.qr-popup-card').style.animation='qrPopupOut .3s ease forwards'; setTimeout(()=>popup.remove(),300); }
    });
  }

  function _addToLog(teacher) {
    const log = document.getElementById('qr-log');
    if (!log) return;
    if (log.textContent.includes('abhi koi scan') || log.textContent.includes('No scans')) log.innerHTML = '';
    const entry = document.createElement('div');
    entry.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);animation:fadeUp .3s ease';
    entry.innerHTML = `
      ${teacher.photo
        ? `<img src="${teacher.photo}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#064e3b,#059669);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0">${Utils.avatar(teacher.name)}</div>`}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${teacher.name}
          <span style="font-size:10px;background:rgba(5,150,105,.15);color:#059669;padding:1px 7px;border-radius:10px;margin-left:4px">Teacher</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">${teacher.subject||'Teacher'} • ${new Date().toLocaleTimeString()}</div>
      </div>
      <span style="color:#059669;font-size:20px">✅</span>`;
    log.prepend(entry);
  }

  // Teacher portal: view own attendance
  function renderMyAttendance() {
    const t = APP.currentUser;
    const records = (DB.get('staff_attendance', [])).filter(r => r.teacherId === t.id).sort((a,b) => b.date.localeCompare(a.date));
    const wrap = document.getElementById('tch-my-attendance');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-4"><div class="stat-card green"><div class="stat-icon">✅</div><div><div class="stat-value">${records.length}</div><div class="stat-label">Present Days</div></div></div></div>
        <div class="col-4"><div class="stat-card blue"><div class="stat-icon">📅</div><div><div class="stat-value">${records.length}</div><div class="stat-label">Total Records</div></div></div></div>
        <div class="col-4"><div class="stat-card orange"><div class="stat-icon">📷</div><div><div class="stat-value" style="font-size:12px;line-height:1.2">QR<br>Only</div><div class="stat-label">Method</div></div></div></div>
      </div>
      <div class="card mb-3" style="background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.2)">
        <div class="card-body py-3">
          <div style="font-size:13px;font-weight:600;color:#059669">ℹ️ Attendance kaise lagti hai?</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Admin ya doosra authorized teacher QR scanner se aapki ID Card ka QR scan karta hai — attendance automatically mark ho jaati hai.</div>
        </div>
      </div>
      ${!records.length
        ? `<div class="empty-state" style="padding:40px">
            <div class="empty-state-icon">📋</div>
            <h5>Koi Record Nahi Abhi Tak</h5>
            <p style="font-size:13px">Admin ID Card ka QR scan kare — attendance mark hogi.</p>
           </div>`
        : `<div class="table-container"><table class="table">
            <thead><tr><th>#</th><th>Date</th><th>Time</th><th>Status</th><th>By</th></tr></thead>
            <tbody>
              ${records.map((r,i)=>`<tr>
                <td>${i+1}</td>
                <td style="font-weight:600">${r.date}</td>
                <td style="font-size:12px;color:var(--text-muted)">${r.markedAt ? new Date(r.markedAt).toLocaleTimeString() : (r.time || '-')}</td>
                <td><span style="background:${r.status==='absent'?'rgba(239,68,68,.12)':r.status==='late'?'rgba(245,158,11,.12)':'rgba(34,197,94,.12)'};color:${r.status==='absent'?'#dc2626':r.status==='late'?'#d97706':'#16a34a'};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px">${r.status==='absent'?'❌ Absent':r.status==='late'?'⏰ Late':r.status==='leave'?'🏖️ Leave':'✅ Present'}</span></td>
                <td style="font-size:12px;color:var(--text-muted)">${r.markedBy||'QR Scan'}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}`;
  }

  // Admin view: all teacher attendance
  function renderAdminView() {
    const wrap = document.getElementById('teacher-att-admin-wrap');
    if (!wrap) return;
    const records = (DB.get('staff_attendance', [])).sort((a,b) => b.date.localeCompare(a.date));
    const teachers = DB.get('teachers');
    const today = Utils.todayStr();

    if (!records.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:30px"><div class="empty-state-icon">📋</div><h5>Koi Record Nahi</h5><p>QR scanner se teachers ki attendance mark karein.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-container"><table class="table">
        <thead><tr><th>Date</th><th>Teacher</th><th>Subject</th><th>Class</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>
          ${records.map(r => {
            const t = teachers.find(x=>x.id===r.teacherId);
            return `<tr${r.date===today?' style="background:rgba(34,197,94,.04)"':''}>
              <td style="font-weight:600;white-space:nowrap">
                ${r.date}
                ${r.date===today?'<span style="font-size:10px;background:rgba(34,197,94,.15);color:#16a34a;padding:1px 7px;border-radius:8px;margin-left:4px">Today</span>':''}
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  ${t?.photo?`<img src="${t.photo}" style="width:30px;height:30px;border-radius:50%;object-fit:cover">`:
                    `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#064e3b,#059669);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${Utils.avatar(t?.name||'?')}</div>`}
                  <span style="font-weight:600">${t?.name||'Unknown'}</span>
                </div>
              </td>
              <td>${t?.subject||'-'}</td>
              <td>${t?.cls?`<span class="badge-class">${t.cls}</span>`:'-'}</td>
              <td style="font-size:12px;color:var(--text-muted)">${r.markedAt ? new Date(r.markedAt).toLocaleTimeString() : (r.time || '-')}</td>
              <td><span style="background:${r.status==='absent'?'rgba(239,68,68,.12)':r.status==='late'?'rgba(245,158,11,.12)':r.status==='leave'?'rgba(99,102,241,.12)':'rgba(34,197,94,.12)'};color:${r.status==='absent'?'#dc2626':r.status==='late'?'#d97706':r.status==='leave'?'#6366f1':'#16a34a'};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">${r.status==='absent'?'❌ Absent':r.status==='late'?'⏰ Late':r.status==='leave'?'🏖️ Leave':'✅ Present'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
  }

  return { markFromQR, renderMyAttendance, renderAdminView };
})();


// ================================================================
// TEACHER RESULTS
// ================================================================
const TeacherResults = (() => {

  function render() {
    const t = APP.currentUser;
    const cls = t?.cls;
    const wrap = document.getElementById('tch-results-wrap');
    if (!wrap) return;

    if (!cls) {
      wrap.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state" style="padding:40px">
        <div class="empty-state-icon">📊</div><h5>Class Assign Nahi</h5><p>Admin se apni class assign karwayein.</p>
      </div></div></div>`;
      return;
    }

    const students = DB.get('students').filter(s=>s.cls===cls);
    const sections = [...new Set(students.map(s=>s.section).filter(Boolean))].sort();
    const saved = DB.get('results').filter(r=>r.cls===cls).sort((a,b)=>b.createdAt-a.createdAt);

    wrap.innerHTML = `
      <div class="card mb-3">
        <div class="card-header"><div class="card-title">📝 Marks Enter Karein — Class ${cls}</div></div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label">Exam / Test Name</label>
              <input type="text" id="tch-exam-name" class="form-control" placeholder="e.g. Monthly Test, Mid-Term">
            </div>
            <div class="col-md-3">
              <label class="form-label">Section</label>
              <select id="tch-result-sec" class="form-select">
                <option value="">All Sections</option>
                ${sections.map(s=>`<option value="${s}">Section ${s}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Date</label>
              <input type="date" id="tch-result-date" class="form-control" value="${Utils.todayStr()}">
            </div>
            <div class="col-md-2">
              <button class="btn btn-primary w-100" onclick="TeacherResults.loadForm()">▶ Load</button>
            </div>
          </div>
        </div>
      </div>
      <div id="tch-result-form-wrap"></div>
      ${saved.length ? `
        <div class="card mt-3">
          <div class="card-header"><div class="card-title">📋 Saved Results</div></div>
          <div class="card-body p-0">
            ${saved.map(r=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-weight:700">${r.exam||'Exam'}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${r.cls}${r.sec?' (Section '+r.sec+')':''} • ${r.date} • ${(r.results||[]).length} students</div>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="TeacherResults.viewSaved('${r.id}')">View →</button>
              </div>`).join('')}
          </div>
        </div>` : ''}`;
  }

  function loadForm() {
    const t = APP.currentUser;
    const cls = t?.cls;
    const sec = document.getElementById('tch-result-sec')?.value||'';
    const examName = document.getElementById('tch-exam-name')?.value.trim()||'';
    const subjects = DB.get('subjects').slice(0,6);
    const students = DB.get('students').filter(s=>s.cls===cls&&(!sec||s.section===sec));
    const wrap = document.getElementById('tch-result-form-wrap');

    if (!examName) { toast('Pehle exam ka naam daalo.','error'); return; }
    if (!students.length) { toast('Is section mein koi student nahi.','error'); return; }

    wrap.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">📝 ${examName} — ${cls}${sec?' (Section '+sec+')':''}</div></div>
        <div class="card-body p-0">
          <div class="table-container"><table class="table">
            <thead><tr><th>#</th><th>Roll</th><th>Student</th>
              ${subjects.map(s=>`<th style="min-width:78px">${s.name}<br><small class="text-muted fw-normal">/100</small></th>`).join('')}
              <th>Total</th><th>%</th><th>Grade</th>
            </tr></thead>
            <tbody id="tch-result-tbody">
              ${students.map((st,i)=>`
                <tr data-id="${st.id}" data-name="${st.name}" data-roll="${st.roll}">
                  <td>${i+1}</td>
                  <td><span class="badge-roll">${st.roll}</span></td>
                  <td style="font-size:13px;font-weight:600">${st.name}</td>
                  ${subjects.map(s=>`<td><input type="number" class="form-control mark-input" min="0" max="100" placeholder="0" data-subject="${s.id}" oninput="TeacherResults.calcRow(this)" style="width:70px;padding:4px 8px;font-size:13px"></td>`).join('')}
                  <td class="total-cell fw-bold">0</td>
                  <td class="pct-cell">0%</td>
                  <td class="grade-cell"><span class="grade-badge grade-F">F</span></td>
                </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
        <div class="card-header" style="border-top:1px solid var(--border);border-bottom:none;justify-content:flex-end;gap:10px">
          <button class="btn btn-outline-secondary" onclick="document.getElementById('tch-result-form-wrap').innerHTML=''">Cancel</button>
          <button class="btn btn-primary" onclick="TeacherResults.saveResults('${cls}','${sec}','${examName}')">💾 Save Results</button>
        </div>
      </div>`;
  }

  function calcRow(input) {
    const subjects = DB.get('subjects').slice(0,6);
    const row = input.closest('tr');
    const total = Array.from(row.querySelectorAll('.mark-input')).reduce((s,i)=>s+(parseFloat(i.value)||0),0);
    const pct = subjects.length ? Math.round(total/(subjects.length*100)*100) : 0;
    row.querySelector('.total-cell').textContent = total;
    row.querySelector('.pct-cell').textContent = pct+'%';
    row.querySelector('.grade-cell').innerHTML = `<span class="grade-badge ${Utils.gradeClass(pct)}">${Utils.getGrade(pct)}</span>`;
  }

  function saveResults(cls, sec, examName) {
    const subjects = DB.get('subjects').slice(0,6);
    const rows = document.querySelectorAll('#tch-result-tbody tr');
    const date = document.getElementById('tch-result-date')?.value || Utils.todayStr();
    if (!rows.length) { toast('Koi data nahi.','error'); return; }

    const data = Array.from(rows).map(row => {
      const marks = {};
      row.querySelectorAll('.mark-input').forEach(i => { marks[i.dataset.subject] = parseFloat(i.value)||0; });
      const total = Object.values(marks).reduce((a,b)=>a+b,0);
      const pct = subjects.length ? Math.round(total/(subjects.length*100)*100) : 0;
      return { studentId:row.dataset.id, name:row.dataset.name, roll:row.dataset.roll, marks, total, pct };
    });

    const results = DB.get('results');
    results.push({ id:Utils.genId(), cls, sec, exam:examName, date, subjects, results:data, savedBy:APP.currentUser?.name, createdAt:Date.now() });
    DB.set('results', results);
    toast(`✅ Results save ho gaye! (${data.length} students)`);
    render();
  }

  function viewSaved(id) {
    const r = DB.get('results').find(x=>x.id===id);
    const wrap = document.getElementById('tch-result-form-wrap');
    if (!r || !wrap) return;
    wrap.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${r.exam} — ${r.cls}${r.sec?' ('+r.sec+')':''}</div>
          <small style="color:var(--text-muted)">${r.date} • Saved by ${r.savedBy||'Teacher'}</small>
        </div>
        <div class="card-body p-0"><div class="table-container"><table class="table">
          <thead><tr><th>Roll</th><th>Student</th>
            ${(r.subjects||[]).map(s=>`<th>${s.name}</th>`).join('')}
            <th>Total</th><th>%</th><th>Grade</th>
          </tr></thead>
          <tbody>
            ${(r.results||[]).map(st=>`<tr>
              <td><span class="badge-roll">${st.roll}</span></td>
              <td style="font-weight:600">${st.name}</td>
              ${(r.subjects||[]).map(s=>`<td>${st.marks?.[s.id]??'-'}</td>`).join('')}
              <td style="font-weight:700">${st.total}</td>
              <td>${st.pct}%</td>
              <td><span class="grade-badge ${Utils.gradeClass(st.pct)}">${Utils.getGrade(st.pct)}</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div></div>
        <div class="card-header" style="border-top:1px solid var(--border);border-bottom:none">
          <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('tch-result-form-wrap').innerHTML=''">← Back</button>
        </div>
      </div>`;
  }

  return { render, loadForm, calcRow, saveResults, viewSaved };
})();
