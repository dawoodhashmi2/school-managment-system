// ================================================================
// ATTENDANCE MODULE
// ================================================================
const Attendance = (() => {
  let currentAttendance = {};

  function render() {
    const classes = DB.get('classes');
    const user = APP.currentUser;
    const role = APP.currentPortal;
    // Teachers see only their assigned class
    let classOptions = classes;
    if (role === 'teacher' && user.cls) {
      classOptions = classes.filter(c => c.name === user.cls);
    }
    const sel = document.getElementById('att-class-select');
    if (sel) {
      sel.innerHTML = `<option value="">— Select Class —</option>` + classOptions.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
      // On class change, update sections dynamically
      sel.onchange = function() { updateSectionDropdown(this.value); };
    }
    // Reset section dropdown
    updateSectionDropdown('');
    document.getElementById('att-students-list').innerHTML = '';
    document.getElementById('att-summary').style.display = 'none';
    if (document.getElementById('att-date')) {
      document.getElementById('att-date').value = Utils.todayStr();
    }
    renderAttendanceHistory();
  }

  function updateSectionDropdown(cls) {
    const secSel = document.getElementById('att-section-select');
    if (!secSel) return;
    if (!cls) {
      secSel.innerHTML = `<option value="">All</option>`;
      return;
    }
    const students = DB.get('students').filter(s => s.cls === cls);
    const sections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();
    if (!sections.length) {
      secSel.innerHTML = `<option value="">All</option>`;
    } else {
      secSel.innerHTML = `<option value="">All Sections</option>` +
        sections.map(s => `<option value="${s}">Section ${s}</option>`).join('');
    }
  }

  function loadStudents() {
    const cls = document.getElementById('att-class-select').value;
    const sec = document.getElementById('att-section-select').value;
    currentAttendance = {};
    if (!cls) { toast('Please select a class.','error'); return; }
    const students = DB.get('students').filter(s => s.cls===cls && (!sec||s.section===sec));
    const container = document.getElementById('att-students-list');
    if (!students.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><h5>No students in this class/section</h5></div>`;
      document.getElementById('att-summary').style.display = 'none';
      return;
    }
    students.forEach(s => { currentAttendance[s.id] = 'present'; });
    container.innerHTML = students.map(s => `
      <div class="att-row" id="att-card-${s.id}">
        <div class="att-avatar">
          ${s.photo ? `<img src="${s.photo}" alt="${s.name}">` : Utils.avatar(s.name)}
        </div>
        <div>
          <div class="fw-semibold" style="font-size:13.5px">${s.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${s.roll} • ${s.cls}-${s.section}</div>
        </div>
        <div class="att-btns">
          <button class="att-btn present active" onclick="Attendance.mark('${s.id}','present',this)">P</button>
          <button class="att-btn absent" onclick="Attendance.mark('${s.id}','absent',this)">A</button>
          <button class="att-btn late" onclick="Attendance.mark('${s.id}','late',this)">L</button>
        </div>
      </div>`).join('');
    updateSummary();
    document.getElementById('att-summary').style.display = 'flex';
  }

  function mark(id, status, btn) {
    currentAttendance[id] = status;
    const card = document.getElementById('att-card-'+id);
    card.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateSummary();
  }

  function updateSummary() {
    const vals = Object.values(currentAttendance);
    document.getElementById('att-present-count').textContent = vals.filter(v=>v==='present').length;
    document.getElementById('att-absent-count').textContent = vals.filter(v=>v==='absent').length;
    const lateEl = document.getElementById('att-late-count');
    if (lateEl) lateEl.textContent = vals.filter(v=>v==='late').length;
    document.getElementById('att-total-count').textContent = vals.length;
  }

  function markAll(status) {
    Object.keys(currentAttendance).forEach(id => {
      currentAttendance[id] = status;
      const card = document.getElementById('att-card-'+id);
      if (!card) return;
      card.querySelectorAll('.att-btn').forEach(b => { b.classList.remove('active'); if (b.classList.contains(status)) b.classList.add('active'); });
    });
    updateSummary();
  }

  function save() {
    if (!Object.keys(currentAttendance).length) { toast('No students to save.','error'); return; }
    const date = document.getElementById('att-date').value;
    const cls = document.getElementById('att-class-select').value;
    const sec = document.getElementById('att-section-select').value;
    if (!date) { toast('Please select a date.','error'); return; }
    const records = DB.get('attendance');
    // FIX: Duplicate prevention — same date+class+section ka record update karo, naya mat banao
    const existingIdx = records.findIndex(r => r.date === date && r.cls === cls && r.sec === sec);
    if (existingIdx >= 0) {
      records[existingIdx] = { ...records[existingIdx], attendance:{...currentAttendance}, markedBy: APP.currentUser?.name, updatedAt: Date.now() };
      toast(`Attendance updated for ${cls}${sec?' / '+sec:''} on ${date}! ✅`);
    } else {
      records.push({ id:Utils.genId(), date, cls, sec, attendance:{...currentAttendance}, markedBy: APP.currentUser?.name, createdAt:Date.now() });
      toast(`Attendance saved for ${cls}${sec?' / '+sec:''} on ${date}! ✅`);
    }
    DB.set('attendance', records);
    renderAttendanceHistory();
  }

  function renderAttendanceHistory() {
    const records = DB.get('attendance');
    const el = document.getElementById('att-history');
    if (!el) return;
    // FIX: slice(0,10) hata diya — saare records dikhao, latest pehle
    const recent = [...records].reverse();
    if (!recent.length) {
      el.innerHTML = `<div class="empty-state" style="padding:30px"><div class="empty-state-icon" style="font-size:36px">📋</div><p style="font-size:13px">No attendance records yet.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="table-container"><table class="table">
      <thead><tr><th>Date</th><th>Class</th><th>Section</th><th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>Marked By</th></tr></thead>
      <tbody>${recent.map(r => {
        const vals = Object.values(r.attendance||{});
        const p = vals.filter(v=>v==='present').length;
        const a = vals.filter(v=>v==='absent').length;
        const l = vals.filter(v=>v==='late').length;
        return `<tr>
          <td>${r.date}</td>
          <td><span class="badge-class">${r.cls}</span></td>
          <td>${r.sec||'All'}</td>
          <td><span class="badge-present">${p}</span></td>
          <td><span class="badge-absent">${a}</span></td>
          <td><span style="background:var(--warning-light);color:var(--warning);font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px">${l}</span></td>
          <td>${vals.length}</td>
          <td style="font-size:12px">${r.markedBy||'-'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  return { render, loadStudents, mark, save, markAll, updateSectionDropdown };
})();


// ================================================================
// RESULTS MODULE
// ================================================================
const Results = (() => {
  let subjects = [];

  function render() {
    const classes = DB.get('classes');
    subjects = DB.get('subjects').slice(0, 6);
    const sel = document.getElementById('result-class-select');
    if (sel) sel.innerHTML = `<option value="">— Select Class —</option>` + classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
    document.getElementById('result-table-wrap').innerHTML = '';
    // FIX: Exam name input add karo (agar HTML mein nahi hai toh dynamically inject karo)
    const examNameWrap = document.getElementById('result-exam-name-wrap');
    if (!examNameWrap) {
      const filterCard = document.querySelector('#page-results .card .card-body .row');
      if (filterCard) {
        const examDiv = document.createElement('div');
        examDiv.className = 'col-md-4';
        examDiv.id = 'result-exam-name-wrap';
        examDiv.innerHTML = `<label class="form-label fw-bold">Exam Name</label><input type="text" id="result-exam-name" class="form-control" placeholder="e.g. Monthly Test, Mid-Term, Annual">`;
        filterCard.appendChild(examDiv);
      }
    }
    renderSaved();
  }

  function loadForm() {
    const cls = document.getElementById('result-class-select').value;
    const sec = document.getElementById('result-section-select').value;
    const examName = (document.getElementById('result-exam-name')?.value.trim()) || 'Exam';
    subjects = DB.get('subjects').slice(0, 6);
    if (!cls) { toast('Select a class.','error'); return; }
    const students = DB.get('students').filter(s => s.cls===cls && (!sec||s.section===sec));
    if (!students.length) { toast('No students found.','error'); return; }
    const wrap = document.getElementById('result-table-wrap');
    wrap.innerHTML = `
      <div class="card mt-3">
        <div class="card-header"><div class="card-title">📝 Enter Marks — ${examName} — ${cls}${sec?' ('+sec+')':''}</div></div>
        <div class="card-body p-0">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Roll</th><th>Student</th>
                  ${subjects.map(s=>`<th>${s.name}<br><small class="fw-normal" style="color:var(--text-muted)">/100</small></th>`).join('')}
                  <th>Total</th><th>%</th><th>Grade</th>
                </tr>
              </thead>
              <tbody id="result-form-tbody">
                ${students.map(st=>`
                  <tr data-id="${st.id}" data-name="${st.name}" data-roll="${st.roll}">
                    <td><span class="badge-roll">${st.roll}</span></td>
                    <td class="fw-semibold" style="font-size:13px">${st.name}</td>
                    ${subjects.map(s=>`<td><input type="number" class="form-control mark-input" min="0" max="100" placeholder="0" data-subject="${s.id}" oninput="Results.calcRow(this)" style="width:68px;padding:4px 8px;font-size:13px"></td>`).join('')}
                    <td class="total-cell fw-semibold">0</td>
                    <td class="pct-cell">0%</td>
                    <td class="grade-cell"><span class="grade-badge grade-F">F</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-header" style="border-top:1px solid var(--border);border-bottom:none;justify-content:flex-end">
          <button class="btn btn-primary" onclick="Results.saveResults('${cls}','${sec||''}','${examName.replace(/'/g,"\\'")}')">💾 Save Results</button>
        </div>
      </div>`;
  }

  function calcRow(input) {
    const row = input.closest('tr');
    const inputs = row.querySelectorAll('.mark-input');
    const total = Array.from(inputs).reduce((sum,i)=>sum+(parseFloat(i.value)||0),0);
    const max = subjects.length*100;
    const pct = max ? Math.round(total/max*100) : 0;
    const grade = Utils.getGrade(pct);
    const gc = Utils.gradeClass(pct);
    row.querySelector('.total-cell').textContent = total;
    row.querySelector('.pct-cell').textContent = pct+'%';
    row.querySelector('.grade-cell').innerHTML = `<span class="grade-badge ${gc}">${grade}</span>`;
  }

  function saveResults(cls, sec, examName) {
    examName = examName || 'Exam';
    const rows = document.querySelectorAll('#result-form-tbody tr');
    const resultsData = [];
    rows.forEach(row => {
      const marks = {};
      row.querySelectorAll('.mark-input').forEach(i => { marks[i.dataset.subject] = parseFloat(i.value)||0; });
      const total = Object.values(marks).reduce((a,b)=>a+b,0);
      const pct = subjects.length ? Math.round(total/(subjects.length*100)*100) : 0;
      resultsData.push({ studentId:row.dataset.id, name:row.dataset.name, roll:row.dataset.roll, marks, total, pct });
    });
    const results = DB.get('results');
    results.push({ id:Utils.genId(), cls, sec, date:Utils.todayStr(), exam:examName, subjects:subjects.map(s=>({id:s.id,name:s.name})), results:resultsData, createdAt:Date.now() });
    DB.set('results', results);
    toast('Results saved! 🎉');
    renderSaved();
  }

  function renderSaved() {
    const results = DB.get('results');
    const wrap = document.getElementById('result-view-wrap');
    if (!wrap) return;
    if (!results.length) {
      wrap.innerHTML = `<div class="empty-state mt-3"><div class="empty-state-icon">📊</div><h5>No Results Yet</h5><p>Enter and save marks above.</p></div>`;
      return;
    }
    wrap.innerHTML = [...results].reverse().slice(0,5).map(r => `
      <div class="card mt-3">
        <div class="card-header">
          <div class="card-title">${r.cls}${r.sec?' ('+r.sec+')':''} — ${r.exam||'Exam'}</div>
          <div class="d-flex gap-2 align-items-center">
            <small style="color:var(--text-muted)">${r.date}</small>
            <button class="btn btn-sm btn-outline-danger btn-icon" onclick="Results.delResult('${r.id}')">🗑️</button>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-container">
            <table class="table">
              <thead><tr><th>Roll</th><th>Student</th>${r.subjects.map(s=>`<th>${s.name}</th>`).join('')}<th>Total</th><th>%</th><th>Grade</th></tr></thead>
              <tbody>${r.results.map(s => {
                const grade = Utils.getGrade(s.pct);
                const gc = Utils.gradeClass(s.pct);
                return `<tr>
                  <td><span class="badge-roll">${s.roll}</span></td>
                  <td class="fw-semibold" style="font-size:13px">${s.name}</td>
                  ${r.subjects.map(sub=>`<td>${s.marks[sub.id]??'-'}</td>`).join('')}
                  <td class="fw-semibold">${s.total}</td>
                  <td>${s.pct}%</td>
                  <td><span class="grade-badge ${gc}">${grade}</span></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>`).join('');
  }

  function delResult(id) {
    confirmDialog('Delete this result?', () => {
      DB.set('results', DB.get('results').filter(r=>r.id!==id));
      toast('Result deleted.','info');
      renderSaved();
    });
  }

  return { render, loadForm, calcRow, saveResults, renderSaved, delResult };
})();

// ================================================================
// NOTICE BOARD
// ================================================================
const Notices = (() => {
  function render() {
    const role = APP.currentPortal;
    const canEdit = role === 'admin';
    const addBtn = document.getElementById('add-notice-btn');
    if (addBtn) addBtn.style.display = canEdit ? '' : 'none';
    renderList();
  }

  function renderList() {
    const notices = DB.get('notices');
    const list = document.getElementById('notices-list');
    if (!notices.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📢</div><h5>No Notices</h5><p>No notices posted yet.</p></div>`;
      return;
    }
    list.innerHTML = [...notices].reverse().map(n => `
      <div class="notice-item ${n.type==='urgent'?'urgent':''}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="notice-title">${n.type==='urgent'?'🔴 ':''} ${n.title}</div>
          ${APP.currentPortal==='admin'?`<button class="btn btn-icon btn-sm btn-outline-danger" style="flex-shrink:0" onclick="Notices.del('${n.id}')">🗑️</button>`:''}
        </div>
        <div style="font-size:13px;color:var(--text);margin:6px 0">${n.content}</div>
        <div class="notice-meta">📅 ${n.date} • 👥 ${n.audience||'All'}</div>
      </div>`).join('');
  }

  function add() {
    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();
    const type = document.getElementById('notice-type').value;
    const audience = document.getElementById('notice-audience').value;
    if (!title||!content) { toast('Title and content required.','error'); return; }
    const notices = DB.get('notices');
    notices.push({ id:Utils.genId(), title, content, type, audience, date:Utils.todayStr(), postedBy:APP.currentUser?.name });
    DB.set('notices', notices);
    document.getElementById('notice-title').value='';
    document.getElementById('notice-content').value='';
    toast('Notice posted!');
    renderList();
  }

  function del(id) {
    confirmDialog('Delete this notice?', () => {
      DB.set('notices', DB.get('notices').filter(n=>n.id!==id));
      toast('Notice deleted.','info');
      renderList();
    });
  }

  return { render, add, del };
})();
// ================================================================
// TIMETABLE MODULE
// ================================================================
const Timetable = (() => {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const periods = ['8:00','9:00','10:00','11:00','12:00 Break','1:00','2:00'];

  function render() {
    const classes = DB.get('classes');
    const sel = document.getElementById('tt-class-select');
    if (sel) {
      sel.innerHTML = `<option value="">Select Class</option>` + classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
    }
    renderGrid();
  }

  function renderGrid() {
    const cls = document.getElementById('tt-class-select')?.value;
    const grid = document.getElementById('tt-grid');
    if (!grid) return;
    if (!cls) { grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗓️</div><h5>Select a class</h5></div>`; return; }
    const timetables = DB.getObj('timetables');
    const tt = timetables[cls] || {};

    grid.innerHTML = `
      <div class="table-container">
        <table class="table" style="min-width:700px">
          <thead>
            <tr>
              <th style="min-width:70px">Period</th>
              ${days.map(d=>`<th class="day-header">${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${periods.map((p,pi) => {
              const isBreak = p.includes('Break');
              return `
              <tr>
                <td style="font-size:11px;font-weight:600;color:var(--text-muted);white-space:nowrap">${p}</td>
                ${isBreak
                  ? `<td colspan="${days.length}" style="text-align:center;background:var(--success-light);color:var(--success);font-size:12px;font-weight:700">☕ Break Time</td>`
                  : days.map(d => {
                      const val = tt[d]?.[pi] || '';
                      return `<td><div class="timetable-cell ${val?'has-class':'free'}" onclick="Timetable.editCell('${cls}','${d}',${pi},'${val}')">${val||'<span style="opacity:.3;font-size:11px">Free</span>'}</div></td>`;
                    }).join('')
                }
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function editCell(cls, day, period, current) {
    if (APP.currentPortal !== 'admin') return;
    const subjects = DB.get('subjects').map(s=>s.name);
    const options = ['', ...subjects].map(s=>`<option value="${s}" ${s===current?'selected':''}>${s||'-- Free --'}</option>`).join('');
    const html = `<div style="padding:4px">
      <label class="form-label">Subject for ${day} Period ${period+1}</label>
      <select id="tt-edit-select" class="form-select">${options}</select>
    </div>`;
    document.getElementById('tt-edit-body').innerHTML = html;
    const m = new bootstrap.Modal(document.getElementById('ttEditModal'));
    document.getElementById('tt-edit-save').onclick = () => {
      const val = document.getElementById('tt-edit-select').value;
      const timetables = DB.getObj('timetables');
      if (!timetables[cls]) timetables[cls] = {};
      if (!timetables[cls][day]) timetables[cls][day] = {};
      timetables[cls][day][period] = val;
      DB.set('timetables', timetables);
      m.hide();
      renderGrid();
    };
    m.show();
  }

  return { render, renderGrid, editCell };
})();
