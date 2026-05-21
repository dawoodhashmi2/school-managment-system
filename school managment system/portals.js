// ================================================================
// DASHBOARD MODULE
// ================================================================
const Dashboard = (() => {
  function render() {
    const students = DB.get('students');
    const teachers = DB.get('teachers');
    const classes = DB.get('classes');
    const attendance = DB.get('attendance');
    const fees = DB.get('fees');

    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('stat-students', students.length);
    set('stat-teachers', teachers.length);
    set('stat-classes', classes.length);
    set('stat-attendance', attendance.length);

    const paid = fees.filter(f=>f.status==='paid').length;
    const pending = fees.filter(f=>f.status==='pending').length;
    set('stat-fees-paid', paid);
    set('stat-fees-pending', pending);

    // Recent students
    const tbody = document.getElementById('recent-students');
    if (tbody) {
      const recent = [...students].reverse().slice(0,5);
      if (!recent.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:24px"><div class="empty-state-icon" style="font-size:32px">👥</div><p style="font-size:13px">No students yet.</p></div></td></tr>`;
      } else {
        tbody.innerHTML = recent.map(s=>`<tr>
          <td><span class="badge-roll">${s.roll}</span></td>
          <td>
            <div class="d-flex align-items-center gap-2">
              ${s.photo?`<img src="${s.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`:
              `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${Utils.avatar(s.name)}</div>`}
              <span class="fw-semibold">${s.name}</span>
            </div>
          </td>
          <td><span class="badge-class">${s.cls}</span></td>
          <td><span class="badge-section">${s.section}</span></td>
          <td>${s.phone||'-'}</td>
        </tr>`).join('');
      }
    }

    // Class distribution
    const distEl = document.getElementById('class-distribution');
    if (distEl) {
      const dist = {};
      students.forEach(s => { dist[s.cls] = (dist[s.cls]||0)+1; });
      const entries = Object.entries(dist).slice(0,8);
      if (!entries.length) { distEl.innerHTML = `<div class="text-center py-3" style="font-size:13px;color:var(--text-muted)">No data yet</div>`; }
      else {
        const max = Math.max(...Object.values(dist));
        distEl.innerHTML = entries.map(([cls,count])=>`
          <div class="mb-2">
            <div class="d-flex justify-content-between mb-1">
              <span style="font-size:13px;font-weight:600">${cls}</span>
              <span style="font-size:12px;color:var(--text-muted)">${count}</span>
            </div>
            <div style="background:var(--border);border-radius:20px;height:5px">
              <div style="background:var(--accent);height:5px;border-radius:20px;width:${Math.round(count/max*100)}%;transition:width .6s ease"></div>
            </div>
          </div>`).join('');
      }
    }

    // Today's attendance summary
    const today = Utils.todayStr();
    const todayRecords = DB.get('attendance').filter(r=>r.date===today);
    let todayPresent=0, todayAbsent=0;
    todayRecords.forEach(r => {
      const vals = Object.values(r.attendance||{});
      todayPresent += vals.filter(v=>v==='present').length;
      todayAbsent += vals.filter(v=>v==='absent').length;
    });
    set('today-present', todayPresent);
    set('today-absent', todayAbsent);
  }
  return { render };
})();

// ================================================================
// TEACHER PORTAL
// ================================================================
const TeacherPortal = (() => {
  function renderDashboard() {
    const t = APP.currentUser;
    const cls = t?.cls;
    const students = cls ? DB.get('students').filter(s=>s.cls===cls) : [];
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('tch-stat-students', students.length);
    set('tch-cls-name', cls||'Not Assigned');
    set('tch-subject', t?.subject||'-');

    const today = Utils.todayStr();
    const todayRecords = DB.get('attendance').filter(r=>r.date===today&&r.cls===cls);
    let present=0;
    todayRecords.forEach(r=>{
      present += Object.values(r.attendance||{}).filter(v=>v==='present').length;
    });
    set('tch-today-present', present);

    // My students list (mini)
    const listEl = document.getElementById('tch-students-mini');
    if (listEl) {
      if (!students.length) { listEl.innerHTML=`<div class="empty-state" style="padding:24px"><div class="empty-state-icon" style="font-size:30px">👥</div><p style="font-size:13px">No students in your class yet.</p></div>`; }
      else {
        listEl.innerHTML = `<div class="table-container"><table class="table">
          <thead><tr><th>Roll</th><th>Student</th><th>Section</th></tr></thead>
          <tbody>${students.slice(0,5).map(s=>`<tr>
            <td><span class="badge-roll">${s.roll}</span></td>
            <td class="fw-semibold">${s.name}</td>
            <td><span class="badge-section">${s.section}</span></td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${students.length>5?`<div style="padding:10px 16px;font-size:12px;color:var(--text-muted)">+${students.length-5} more students</div>`:''}`;
      }
    }
  }

  function renderStudents() {
    const t = APP.currentUser;
    const cls = t?.cls;
    const students = cls ? DB.get('students').filter(s=>s.cls===cls) : DB.get('students');
    const tbody = document.getElementById('tch-all-students-tbody');
    if (!tbody) return;
    if (!students.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">👥</div><h5>No Students</h5></div></td></tr>`;
      return;
    }
    tbody.innerHTML = students.map((s,i)=>`<tr>
      <td>${i+1}</td>
      <td><span class="badge-roll">${s.roll}</span></td>
      <td>
        <div class="d-flex align-items-center gap-2">
          ${s.photo?`<img src="${s.photo}" style="width:30px;height:30px;border-radius:50%;object-fit:cover">`:
          `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${Utils.avatar(s.name)}</div>`}
          <span class="fw-semibold">${s.name}</span>
        </div>
      </td>
      <td><span class="badge-class">${s.cls}</span></td>
      <td><span class="badge-section">${s.section}</span></td>
      <td>${s.phone||'-'}</td>
      <td><button class="btn btn-sm btn-outline-primary btn-icon" onclick="Students.openIDCard('${s.id}')">🪪</button></td>
    </tr>`).join('');
  }

  return { renderDashboard, renderStudents };
})();

// ================================================================
// STUDENT PORTAL
// ================================================================
const StudentPortal = (() => {
  function getStudent() {
    return DB.get('students').find(s=>s.id===APP.currentUser?.id) || APP.currentUser;
  }

  function renderDashboard() {
    const s = getStudent();
    if (!s) return;
    // Profile card
    const profileEl = document.getElementById('std-profile-card');
    if (profileEl) {
      profileEl.innerHTML = `
        <div class="student-profile-card mb-3">
          <div style="position:relative;z-index:1">
            <div class="student-profile-photo">
              ${s.photo?`<img src="${s.photo}" alt="${s.name}">`:'👤'}
            </div>
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:4px">${s.name}</div>
            <div style="font-size:13px;color:rgba(255,255,255,.7);margin-bottom:12px">${s.father?'S/O '+s.father:''}</div>
            <div class="d-flex gap-2 flex-wrap">
              <span style="background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px;font-size:12px">${s.roll}</span>
              <span style="background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px;font-size:12px">Class ${s.cls}</span>
              <span style="background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px;font-size:12px">Section ${s.section}</span>
            </div>
          </div>
        </div>`;
    }

    // Stats
    const attendance = DB.get('attendance');
    let totalDays=0, presentDays=0;
    attendance.forEach(r => {
      if (r.attendance && r.attendance[s.id]) {
        totalDays++;
        if (r.attendance[s.id]==='present') presentDays++;
      }
    });
    const attPct = totalDays ? Math.round(presentDays/totalDays*100) : 0;

    const results = DB.get('results');
    const myResults = results.flatMap(r => r.results?.filter(rs=>rs.studentId===s.id)||[]);
    const avgPct = myResults.length ? Math.round(myResults.reduce((a,b)=>a+b.pct,0)/myResults.length) : 0;

    const fees = DB.get('fees').filter(f=>f.studentId===s.id);
    const feePending = fees.filter(f=>f.status==='pending').length;

    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('std-att-pct', attPct+'%');
    set('std-avg-marks', avgPct+'%');
    set('std-fee-pending', feePending);
    set('std-total-days', totalDays);

    // Notices
    const notices = DB.get('notices');
    const noticeEl = document.getElementById('std-notices-list');
    if (noticeEl) {
      if (!notices.length) { noticeEl.innerHTML=`<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">No notices.</div>`; }
      else {
        noticeEl.innerHTML = [...notices].reverse().slice(0,3).map(n=>`
          <div class="notice-item ${n.type==='urgent'?'urgent':''}">
            <div class="notice-title" style="font-size:13px">${n.type==='urgent'?'🔴 ':''} ${n.title}</div>
            <div class="notice-meta">📅 ${n.date}</div>
          </div>`).join('');
      }
    }
  }

  function renderProfile() {
    const s = getStudent();
    if (!s) return;
    const el = document.getElementById('std-profile-details');
    if (!el) return;
    el.innerHTML = `
      <div class="row g-4">
        <div class="col-md-4 text-center">
          <div style="width:120px;height:130px;border-radius:var(--radius);border:3px solid var(--accent-light);margin:0 auto 16px;overflow:hidden;background:var(--surface-2);display:flex;align-items:center;justify-content:center">
            ${s.photo?`<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover">`:
            `<div style="font-size:48px">👤</div>`}
          </div>
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700">${s.name}</div>
          <div style="font-size:13px;color:var(--text-muted)">${s.roll}</div>
          <div class="mt-2"><span class="badge-class">${s.cls}</span> <span class="badge-section">${s.section}</span></div>
        </div>
        <div class="col-md-8">
          <div class="row g-3">
            ${field('Full Name', s.name)}
            ${field("Father's Name", s.father||'-')}
            ${field("Mother's Name", s.mother||'-')}
            ${field('Class', s.cls+' — Section '+s.section)}
            ${field('Roll Number', s.roll)}
            ${field('Date of Birth', s.dob||'-')}
            ${field('Blood Group', s.blood||'-')}
            ${field('Gender', s.gender||'-')}
            ${field('Phone', s.phone||'-')}
            ${field('Email', s.email||'-')}
            ${field('Address', s.address||'-')}
          </div>
        </div>
      </div>`;
  }

  function field(label, val) {
    return `<div class="col-sm-6"><div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px"><div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.4px">${label}</div><div style="font-size:14px;font-weight:500;margin-top:3px">${val}</div></div></div>`;
  }

  function renderIDCard() {
    const s = getStudent();
    if (!s) {
      const wrap = document.getElementById('id-card-render');
      if (wrap) wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🪪</div><h5>No Profile Found</h5><p>Your student data is missing. Contact admin.</p></div>`;
      return;
    }
    IDCard.renderCard(s, 'id-card-render');
  }

  function renderAttendance() {
    const s = getStudent();
    if (!s) return;
    const attendance = DB.get('attendance');
    let records = [];
    attendance.forEach(r => {
      if (r.attendance && r.attendance[s.id]) {
        records.push({ date:r.date, status:r.attendance[s.id], cls:r.cls });
      }
    });
    records.sort((a,b)=>b.date.localeCompare(a.date));

    const total = records.length;
    const present = records.filter(r=>r.status==='present').length;
    const absent = records.filter(r=>r.status==='absent').length;
    const late = records.filter(r=>r.status==='late').length;
    const pct = total ? Math.round(present/total*100) : 0;

    const wrap = document.getElementById('std-attendance-details');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-4"><div class="attendance-stat"><div class="attendance-stat-value" style="color:var(--success)">${present}</div><div class="attendance-stat-label">Present</div></div></div>
        <div class="col-4"><div class="attendance-stat"><div class="attendance-stat-value" style="color:var(--danger)">${absent}</div><div class="attendance-stat-label">Absent</div></div></div>
        <div class="col-4"><div class="attendance-stat"><div class="attendance-stat-value" style="color:var(--warning)">${late}</div><div class="attendance-stat-label">Late</div></div></div>
      </div>
      <div class="mb-4">
        <div class="d-flex justify-content-between mb-1"><span style="font-size:13px;font-weight:600">Attendance Rate</span><span style="font-size:13px;font-weight:700;color:${pct>=75?'var(--success)':'var(--danger)'}">${pct}%</span></div>
        <div class="result-progress"><div class="result-progress-bar" style="width:${pct}%"></div></div>
        ${pct<75?`<div style="font-size:12px;color:var(--danger);margin-top:6px">⚠️ Attendance below 75% — Please improve attendance.</div>`:''}
      </div>
      <div class="table-container">
        <table class="table">
          <thead><tr><th>#</th><th>Date</th><th>Class</th><th>Status</th></tr></thead>
          <tbody>
            ${!records.length?`<tr><td colspan="4"><div class="empty-state" style="padding:24px"><div class="empty-state-icon" style="font-size:32px">📋</div><p style="font-size:13px">No attendance records yet.</p></div></td></tr>`:
            records.map((r,i)=>`<tr>
              <td>${i+1}</td>
              <td>${r.date}</td>
              <td><span class="badge-class">${r.cls}</span></td>
              <td><span style="background:${r.status==='present'?'var(--success-light)':r.status==='late'?'var(--warning-light)':'var(--danger-light)'};color:${r.status==='present'?'var(--success)':r.status==='late'?'var(--warning)':'var(--danger)'};font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px">${r.status==='present'?'✅ Present':r.status==='late'?'⏰ Late':'❌ Absent'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderResults() {
    const s = getStudent();
    if (!s) return;
    const results = DB.get('results');
    const myResults = results.filter(r => r.results?.some(rs=>rs.studentId===s.id));
    const wrap = document.getElementById('std-results-details');
    if (!wrap) return;
    if (!myResults.length) {
      wrap.innerHTML=`<div class="empty-state"><div class="empty-state-icon">📊</div><h5>No Results Yet</h5><p>Results will appear here once published.</p></div>`;
      return;
    }
    wrap.innerHTML = myResults.map(r => {
      const myData = r.results?.find(rs=>rs.studentId===s.id);
      if (!myData) return '';
      const grade = Utils.getGrade(myData.pct);
      const gc = Utils.gradeClass(myData.pct);
      return `<div class="card mb-3">
        <div class="card-header"><div class="card-title">${r.exam||'Exam'} — ${r.cls}${r.sec?' ('+r.sec+')':''}</div><small style="color:var(--text-muted)">${r.date}</small></div>
        <div class="card-body">
          <div class="row g-3 mb-3">
            <div class="col-4 text-center"><div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent)">${myData.total}</div><div style="font-size:12px;color:var(--text-muted)">Total Marks</div></div>
            <div class="col-4 text-center"><div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--success)">${myData.pct}%</div><div style="font-size:12px;color:var(--text-muted)">Percentage</div></div>
            <div class="col-4 text-center"><div class="grade-badge ${gc}" style="font-size:24px;padding:8px 16px">${grade}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">Grade</div></div>
          </div>
          <div class="result-progress mb-3"><div class="result-progress-bar" style="width:${myData.pct}%"></div></div>
          <div class="row g-2">
            ${r.subjects.map(sub=>`
              <div class="col-6 col-md-4">
                <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
                  <div style="font-size:11px;color:var(--text-muted)">${sub.name}</div>
                  <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700">${myData.marks[sub.id]??'-'}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">/100</span></div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function renderFees() {
    const s = getStudent();
    if (!s) return;
    const fees = DB.get('fees').filter(f=>f.studentId===s.id);
    const total = fees.reduce((a,b)=>a+b.amount,0);
    const paid = fees.filter(f=>f.status==='paid').reduce((a,b)=>a+b.amount,0);
    const pending = fees.filter(f=>f.status==='pending').reduce((a,b)=>a+b.amount,0);

    const wrap = document.getElementById('std-fees-details');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-4"><div class="stat-card green p-3"><div class="stat-icon" style="width:40px;height:40px;font-size:18px">✅</div><div><div class="stat-value" style="font-size:22px">PKR ${paid.toLocaleString()}</div><div class="stat-label">Paid</div></div></div></div>
        <div class="col-4"><div class="stat-card red p-3"><div class="stat-icon" style="width:40px;height:40px;font-size:18px">⏳</div><div><div class="stat-value" style="font-size:22px">PKR ${pending.toLocaleString()}</div><div class="stat-label">Pending</div></div></div></div>
        <div class="col-4"><div class="stat-card blue p-3"><div class="stat-icon" style="width:40px;height:40px;font-size:18px">💰</div><div><div class="stat-value" style="font-size:22px">PKR ${total.toLocaleString()}</div><div class="stat-label">Total</div></div></div></div>
      </div>
      <div class="table-container">
        <table class="table">
          <thead><tr><th>#</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${!fees.length?`<tr><td colspan="4"><div class="empty-state" style="padding:24px"><div class="empty-state-icon" style="font-size:32px">💰</div><p style="font-size:13px">No fee records yet.</p></div></td></tr>`:
            fees.map((f,i)=>`<tr>
              <td>${i+1}</td>
              <td>${f.month}</td>
              <td>PKR ${f.amount.toLocaleString()}</td>
              <td><span style="background:${f.status==='paid'?'var(--success-light)':'var(--danger-light)'};color:${f.status==='paid'?'var(--success)':'var(--danger)'};font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px">${f.status==='paid'?'✅ Paid':'⏳ Pending'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  return { renderDashboard, renderProfile, renderIDCard, renderAttendance, renderResults, renderFees };
})();

// ================================================================
// QR CODE GENERATOR (Pure Canvas — no library)
// Simple QR-like visual using data matrix pattern
// ================================================================
function drawQR(canvasId, data, size) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Simple hash-based pattern (visual QR placeholder)
  // In production: use qrcodejs or qrcode library
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,size,size);

  const grid = 21; // QR v1 cells
  const cell = size / grid;
  const hash = hashStr(data);

  // Generate pattern
  const bits = [];
  for (let i=0; i<grid*grid; i++) {
    const seed = (hash * (i+1) * 2654435761) & 0xFFFFFFFF;
    bits.push((seed >>> 28) & 1);
  }

  ctx.fillStyle = '#0f2557';
  // Draw cells
  for (let r=0; r<grid; r++) {
    for (let c=0; c<grid; c++) {
      // Finder patterns (corners)
      if (isFinderPattern(r,c,grid)) {
        drawFinderCell(ctx, r, c, cell);
      } else if (bits[r*grid+c]) {
        ctx.fillRect(c*cell, r*cell, cell-0.5, cell-0.5);
      }
    }
  }

  // Corner finders
  drawFinder(ctx, 0, 0, cell);
  drawFinder(ctx, 0, grid-7, cell);
  drawFinder(ctx, grid-7, 0, cell);
}

function drawFinder(ctx, row, col, cell) {
  // Outer square
  ctx.fillStyle = '#0f2557';
  ctx.fillRect(col*cell, row*cell, 7*cell, 7*cell);
  ctx.fillStyle = '#fff';
  ctx.fillRect((col+1)*cell, (row+1)*cell, 5*cell, 5*cell);
  ctx.fillStyle = '#0f2557';
  ctx.fillRect((col+2)*cell, (row+2)*cell, 3*cell, 3*cell);
}

function isFinderPattern(r, c, grid) {
  return (r<7&&c<7)||(r<7&&c>grid-8)||(r>grid-8&&c<7);
}

function drawFinderCell(ctx, r, c, cell) {
  // Skip, handled by drawFinder
}

function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i=0; i<str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) & 0xFFFFFFFF;
  }
  return h >>> 0;
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  seedDefaultData();
  initSidebar();

  // Date display
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-PK',{weekday:'short',year:'numeric',month:'short',day:'numeric'});

  // Check existing session
  if (!Auth.checkSession()) {
    Auth.showPortalSelect();
  }

  // Portal card clicks
  document.querySelectorAll('.portal-card').forEach(card => {
    card.addEventListener('click', () => Auth.showLogin(card.dataset.portal));
  });

  // Login button
  document.getElementById('btn-login').addEventListener('click', Auth.doLogin);
  document.getElementById('login-user').addEventListener('keypress', e => { if(e.key==='Enter') Auth.doLogin(); });
  document.getElementById('login-pass').addEventListener('keypress', e => { if(e.key==='Enter') Auth.doLogin(); });

  // Back to portal select
  document.getElementById('btn-back-portal').addEventListener('click', Auth.showPortalSelect);

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    confirmDialog('Are you sure you want to logout?', Auth.logout, 'Logout');
  });
  document.getElementById('topbar-logout').addEventListener('click', () => {
    confirmDialog('Logout?', Auth.logout, 'Logout');
  });
});
