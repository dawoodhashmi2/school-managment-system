// ================================================================
// STUDENTS MODULE — students.js
// Includes: CRUD, ID Card with photo, QR code per student
// ================================================================

const Students = (() => {
  let editId = null;

  function getClasses() { return DB.get('classes').map(c => c.name); }
  function getNextRoll(cls, section) {
    const existing = DB.get('students').filter(s => s.cls === cls && s.section === section);
    if (!existing.length) return `${cls}-${section}-001`;
    const nums = existing.map(s => parseInt(s.roll.split('-').pop()) || 0);
    return `${cls}-${section}-${String(Math.max(...nums) + 1).padStart(3, '0')}`;
  }

  function render() { renderTable(); populateFilters(); }

  function populateFilters() {
    const classes = getClasses();
    ['#student-filter-class', '#modal-student-class'].forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      const val = el.value;
      el.innerHTML = (sel.includes('filter') ? '<option value="">All Classes</option>' : '<option value="">Select Class</option>') + classes.map(c => `<option value="${c}"${c === val ? ' selected' : ''}>${c}</option>`).join('');
    });
  }

  function renderTable(filter = {}) {
    let students = DB.get('students');
    if (filter.search) {
      const s = filter.search.toLowerCase();
      students = students.filter(st => st.name.toLowerCase().includes(s) || st.roll.toLowerCase().includes(s) || (st.father || '').toLowerCase().includes(s));
    }
    if (filter.cls) students = students.filter(s => s.cls === filter.cls);
    if (filter.section) students = students.filter(s => s.section === filter.section);

    const tbody = document.getElementById('students-tbody');
    document.getElementById('student-count').textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;
    if (!students.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">👥</div><h5>No Students Found</h5><p>Add a new student to get started.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = students.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="badge-roll">${s.roll}</span></td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${s.photo ? `<img src="${s.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--border)">` :
        `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${Utils.avatar(s.name)}</div>`}
            <div>
              <div class="fw-semibold" style="font-size:13.5px">${s.name}</div>
              ${s.father ? `<div style="font-size:11px;color:var(--text-muted)">F: ${s.father}</div>` : ''}
            </div>
          </div>
        </td>
        <td><span class="badge-class">${s.cls}</span></td>
        <td><span class="badge-section">${s.section}</span></td>
        <td>${s.phone || '-'}</td>
        <td style="max-width:120px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.address || '-'}</td>
        <td>
          <div style="font-size:11px">
            <div>DOB: ${s.dob || '-'}</div>
            <div>B/G: ${s.blood || '-'}</div>
          </div>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-warning btn-icon me-1" onclick="Reports.printResultCard('${s.id}')" title="Result Card">📋</button>
          <button class="btn btn-sm btn-outline-primary btn-icon me-1" onclick="Students.openIDCard('${s.id}')" title="ID Card">🪪</button>
          <button class="btn btn-sm btn-outline-success btn-icon me-1" onclick="Students.openEdit('${s.id}')" title="Edit">✏️</button>
          <button class="btn btn-sm btn-outline-danger btn-icon" onclick="Students.del('${s.id}')" title="Delete">🗑️</button>
        </td>
      </tr>`).join('');
  }

  function openAdd() {
    editId = null;
    document.getElementById('student-form').reset();
    document.getElementById('student-modal-title').textContent = 'Add New Student';
    document.getElementById('modal-roll-display').textContent = 'Auto-generated';
    document.getElementById('student-photo-preview').src = '';
    document.getElementById('student-photo-preview').style.display = 'none';
    document.getElementById('photo-upload-placeholder').style.display = 'flex';
    populateFilters();
    new bootstrap.Modal(document.getElementById('studentModal')).show();
  }

  function openEdit(id) {
    editId = id;
    const s = DB.get('students').find(x => x.id === id);
    if (!s) return;
    populateFilters();
    document.getElementById('student-modal-title').textContent = 'Edit Student';
    document.getElementById('modal-student-name').value = s.name;
    document.getElementById('modal-student-father').value = s.father || '';
    document.getElementById('modal-student-mother').value = s.mother || '';
    document.getElementById('modal-student-phone').value = s.phone || '';
    document.getElementById('modal-student-address').value = s.address || '';
    document.getElementById('modal-student-class').value = s.cls;
    document.getElementById('modal-student-section').value = s.section;
    document.getElementById('modal-student-dob').value = s.dob || '';
    document.getElementById('modal-student-blood').value = s.blood || '';
    document.getElementById('modal-student-gender').value = s.gender || '';
    document.getElementById('modal-student-email').value = s.email || '';
    document.getElementById('modal-roll-display').textContent = `Roll: ${s.roll}`;
    if (s.photo) {
      document.getElementById('student-photo-preview').src = s.photo;
      document.getElementById('student-photo-preview').style.display = 'block';
      document.getElementById('photo-upload-placeholder').style.display = 'none';
    } else {
      document.getElementById('student-photo-preview').style.display = 'none';
      document.getElementById('photo-upload-placeholder').style.display = 'flex';
    }
    new bootstrap.Modal(document.getElementById('studentModal')).show();
  }

  function handlePhotoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Photo must be under 2MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('student-photo-preview').src = e.target.result;
      document.getElementById('student-photo-preview').style.display = 'block';
      document.getElementById('photo-upload-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function save() {
    const name = document.getElementById('modal-student-name').value.trim();
    const father = document.getElementById('modal-student-father').value.trim();
    const mother = document.getElementById('modal-student-mother').value.trim();
    const phone = document.getElementById('modal-student-phone').value.trim();
    const address = document.getElementById('modal-student-address').value.trim();
    const cls = document.getElementById('modal-student-class').value;
    const section = document.getElementById('modal-student-section').value;
    const dob = document.getElementById('modal-student-dob').value;
    const blood = document.getElementById('modal-student-blood').value;
    const gender = document.getElementById('modal-student-gender').value;
    const email = document.getElementById('modal-student-email').value.trim();
    const photoEl = document.getElementById('student-photo-preview');
    const photo = photoEl.style.display !== 'none' ? photoEl.src : '';

    if (!name || !cls || !section) { toast('Name, Class and Section are required.', 'error'); return; }
    let students = DB.get('students');
    if (editId) {
      students = students.map(s => s.id === editId ? { ...s, name, father, mother, phone, address, cls, section, dob, blood, gender, email, photo } : s);
      toast('Student updated! ✅');
    } else {
      const roll = getNextRoll(cls, section);
      students.push({ id: Utils.genId(), roll, name, father, mother, phone, address, cls, section, dob, blood, gender, email, photo, createdAt: Date.now() });
      toast('Student added! 🎉');
    }
    DB.set('students', students);
    bootstrap.Modal.getInstance(document.getElementById('studentModal'))?.hide();
    renderTable();
  }

  function del(id) {
    confirmDialog('Delete this student? All related data will also be removed.', () => {
      // FIX: Student ka attendance, fees, results bhi clean karo
      DB.set('students', DB.get('students').filter(s => s.id !== id));

      // Attendance records mein se is student ki entry hata do
      const attendance = DB.get('attendance');
      attendance.forEach(r => {
        if (r.attendance && r.attendance[id]) {
          delete r.attendance[id];
        }
      });
      DB.set('attendance', attendance);

      // Fees hata do
      DB.set('fees', DB.get('fees').filter(f => f.studentId !== id));

      // Results ke andar se is student ka data hata do
      const results = DB.get('results');
      results.forEach(r => {
        if (r.results) r.results = r.results.filter(rs => rs.studentId !== id);
      });
      DB.set('results', results.filter(r => r.results && r.results.length > 0));

      toast('Student aur uska tamam data delete ho gaya.', 'info');
      renderTable();
    });
  }

  function applyFilters() {
    renderTable({
      search: document.getElementById('student-search').value,
      cls: document.getElementById('student-filter-class').value,
      section: document.getElementById('student-filter-section').value,
    });
  }

  function previewRoll() {
    if (!editId) {
      const cls = document.getElementById('modal-student-class').value;
      const sec = document.getElementById('modal-student-section').value;
      if (cls && sec) document.getElementById('modal-roll-display').textContent = `Auto Roll: ${getNextRoll(cls, sec)}`;
    }
  }

  // ---- ID CARD ----
  function openIDCard(id) {
    IDCard.openModal(id);
  }

  function renderIDCardModal(s) {
    const wrap = document.getElementById('id-card-render');
    // QR data
    const qrData = JSON.stringify({ id: s.id, roll: s.roll, name: s.name, cls: s.cls, section: s.section });
    wrap.innerHTML = `
      <div class="id-card-wrap print-id-area" id="printable-card">
        <div class="id-card">
          <div class="id-card-header">
            <div class="school-logo">🎓</div>
            <div>
              <div class="id-card-school-name">EduTrack School<span>Student Identity Card</span></div>
            </div>
          </div>
          <div class="id-card-body">
            <div class="id-card-photo-section">
              <div class="id-card-photo">
                ${s.photo ? `<img src="${s.photo}" alt="${s.name}">` : `<span style="font-size:32px">👤</span>`}
              </div>
              <div class="id-card-info">
                <div class="id-card-name">${s.name}</div>
                <div class="id-card-roll">${s.roll}</div>
                <div class="id-card-detail"><strong>Father:</strong> ${s.father || '-'}</div>
                <div class="id-card-detail"><strong>Class:</strong> ${s.cls} — Section ${s.section}</div>
                ${s.dob ? `<div class="id-card-detail"><strong>DOB:</strong> ${s.dob}</div>` : ''}
                ${s.blood ? `<div class="id-card-detail"><strong>Blood:</strong> ${s.blood}</div>` : ''}
              </div>
            </div>
            <div class="id-card-divider"></div>
            <div class="id-card-footer-data">
              <div>
                <div class="id-card-class-badge">${s.cls} — ${s.section}</div>
                ${s.phone ? `<div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:6px">📞 ${s.phone}</div>` : ''}
              </div>
              <div class="id-card-qr-section">
                <canvas id="id-qr-canvas" width="60" height="60"></canvas>
                <div class="id-card-qr-label">Scan for Info</div>
              </div>
            </div>
          </div>
          <div class="id-card-footer">Session 2024–2025 • EduTrack Management System</div>
        </div>
      </div>`;
    // Draw QR
    setTimeout(() => drawQR('id-qr-canvas', qrData, 60), 100);
  }

  function printIDCard() {
    window.print();
  }

  return { render, openAdd, openEdit, save, del, applyFilters, previewRoll, handlePhotoUpload, openIDCard, renderIDCardModal, printIDCard };
})();

// ================================================================
// TEACHERS MODULE
// ================================================================
const Teachers = (() => {
  let editId = null;

  function render() { renderTable(); populateClassSelect(); }

  function populateClassSelect(selId = 'modal-teacher-class') {
    const el = document.getElementById(selId);
    if (!el) return;
    el.innerHTML = `<option value="">Select Class</option>` + DB.get('classes').map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }

  function renderTable() {
    const teachers = DB.get('teachers');
    const tbody = document.getElementById('teachers-tbody');
    document.getElementById('teacher-count').textContent = `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''}`;
    if (!teachers.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">👩‍🏫</div><h5>No Teachers Found</h5><p>Add a teacher to get started.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = teachers.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${t.photo ? `<img src="${t.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">` :
        `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--success),#059669);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${Utils.avatar(t.name)}</div>`}
            <div>
              <div class="fw-semibold">${t.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">@${t.username || '-'}</div>
            </div>
          </div>
        </td>
        <td>${t.phone || '-'}</td>
        <td>${t.email || '-'}</td>
        <td><span style="background:var(--accent-light);color:var(--accent);font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px">${t.subject || '-'}</span></td>
        <td><span class="badge-class">${t.cls || '-'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary btn-icon me-1" onclick="Teachers.openEdit('${t.id}')">✏️</button>
          <button class="btn btn-sm btn-outline-danger btn-icon" onclick="Teachers.del('${t.id}')">🗑️</button>
        </td>
      </tr>`).join('');
  }

  function openAdd() {
    editId = null;
    document.getElementById('teacher-form').reset();
    document.getElementById('teacher-modal-title').textContent = 'Add Teacher';
    document.getElementById('teacher-photo-preview').style.display = 'none';
    document.getElementById('teacher-photo-placeholder').style.display = 'flex';
    populateClassSelect();
    new bootstrap.Modal(document.getElementById('teacherModal')).show();
  }

  function openEdit(id) {
    editId = id;
    const t = DB.get('teachers').find(x => x.id === id);
    if (!t) return;
    populateClassSelect();
    document.getElementById('teacher-modal-title').textContent = 'Edit Teacher';
    document.getElementById('modal-teacher-name').value = t.name;
    document.getElementById('modal-teacher-phone').value = t.phone || '';
    document.getElementById('modal-teacher-email').value = t.email || '';
    document.getElementById('modal-teacher-subject').value = t.subject || '';
    document.getElementById('modal-teacher-class').value = t.cls || '';
    document.getElementById('modal-teacher-username').value = t.username || '';
    document.getElementById('modal-teacher-password').value = t.password || '';
    if (t.photo) {
      document.getElementById('teacher-photo-preview').src = t.photo;
      document.getElementById('teacher-photo-preview').style.display = 'block';
      document.getElementById('teacher-photo-placeholder').style.display = 'none';
    } else {
      document.getElementById('teacher-photo-preview').style.display = 'none';
      document.getElementById('teacher-photo-placeholder').style.display = 'flex';
    }
    new bootstrap.Modal(document.getElementById('teacherModal')).show();
  }

  function handlePhotoUpload(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('teacher-photo-preview').src = e.target.result;
      document.getElementById('teacher-photo-preview').style.display = 'block';
      document.getElementById('teacher-photo-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function save() {
    const name = document.getElementById('modal-teacher-name').value.trim();
    const phone = document.getElementById('modal-teacher-phone').value.trim();
    const email = document.getElementById('modal-teacher-email').value.trim();
    const subject = document.getElementById('modal-teacher-subject').value.trim();
    const cls = document.getElementById('modal-teacher-class').value;
    const username = document.getElementById('modal-teacher-username').value.trim();
    const password = document.getElementById('modal-teacher-password').value.trim();
    const photoEl = document.getElementById('teacher-photo-preview');
    const photo = photoEl.style.display !== 'none' ? photoEl.src : '';
    if (!name) { toast('Name is required.', 'error'); return; }
    if (!editId && !username) { toast('Username is required for login.', 'error'); return; }
    let teachers = DB.get('teachers');
    // Check duplicate username
    if (username && teachers.find(t => t.username === username && t.id !== editId)) { toast('Username already exists.', 'error'); return; }
    if (editId) {
      teachers = teachers.map(t => t.id === editId ? { ...t, name, phone, email, subject, cls, username, password, photo } : t);
      toast('Teacher updated!');
    } else {
      teachers.push({ id: Utils.genId(), name, phone, email, subject, cls, username, password: password || 'teacher123', photo, createdAt: Date.now() });
      toast('Teacher added!');
    }
    DB.set('teachers', teachers);
    bootstrap.Modal.getInstance(document.getElementById('teacherModal'))?.hide();
    renderTable();
  }

  function del(id) {
    confirmDialog('Delete this teacher?', () => {
      DB.set('teachers', DB.get('teachers').filter(t => t.id !== id));
      toast('Teacher deleted.', 'info');
      renderTable();
    });
  }

  function applySearch() {
    const q = document.getElementById('teacher-search').value.toLowerCase();
    const all = DB.get('teachers');
    const filtered = q ? all.filter(t => t.name.toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q) || (t.username || '').toLowerCase().includes(q)) : all;
    const tbody = document.getElementById('teachers-tbody');
    if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🔍</div><h5>No Results</h5></div></td></tr>`; return; }
    tbody.innerHTML = filtered.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="d-flex align-items-center gap-2"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--success),#059669);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${Utils.avatar(t.name)}</div><div><div class="fw-semibold">${t.name}</div><div style="font-size:11px;color:var(--text-muted)">@${t.username || '-'}</div></div></div></td>
        <td>${t.phone || '-'}</td><td>${t.email || '-'}</td>
        <td><span style="background:var(--accent-light);color:var(--accent);font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px">${t.subject || '-'}</span></td>
        <td><span class="badge-class">${t.cls || '-'}</span></td>
        <td><button class="btn btn-sm btn-outline-primary btn-icon me-1" onclick="Teachers.openEdit('${t.id}')">✏️</button><button class="btn btn-sm btn-outline-danger btn-icon" onclick="Teachers.del('${t.id}')">🗑️</button></td>
      </tr>`).join('');
  }

  return { render, openAdd, openEdit, save, del, applySearch, handlePhotoUpload };
})();

// ================================================================
// CLASSES & SUBJECTS
// ================================================================
const Classes = (() => {
  function render() { renderList(); }
  function renderList() {
    const classes = DB.get('classes');
    const students = DB.get('students');
    document.getElementById('class-total-count').textContent = `${classes.length} classes`;
    const c = document.getElementById('classes-list');
    if (!classes.length) { c.innerHTML = `<div class="col-12"><div class="empty-state"><div class="empty-state-icon">🏫</div><h5>No Classes</h5></div></div>`; return; }
    c.innerHTML = classes.map(cls => {
      const cnt = students.filter(s => s.cls === cls.name).length;
      const sA = students.filter(s => s.cls === cls.name && s.section === 'A').length;
      const sB = students.filter(s => s.cls === cls.name && s.section === 'B').length;
      const sC = students.filter(s => s.cls === cls.name && s.section === 'C').length;
      return `<div class="col-sm-6 col-md-4 col-lg-3">
        <div class="card text-center p-0">
          <div style="background:linear-gradient(135deg,var(--primary),var(--primary-light));padding:20px;border-radius:var(--radius-lg) var(--radius-lg) 0 0">
            <div style="font-size:32px;margin-bottom:6px">🏫</div>
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:#fff">${cls.name}</div>
          </div>
          <div class="p-3">
            <div style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif">${cnt}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Total Students</div>
            <div class="d-flex justify-content-center gap-2 mb-3">
              <span class="badge-section">A: ${sA}</span>
              <span class="badge-section">B: ${sB}</span>
              <span class="badge-section">C: ${sC}</span>
            </div>
            <button class="btn btn-sm btn-outline-danger w-100" onclick="Classes.del('${cls.id}')">Delete Class</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  function add() {
    const input = document.getElementById('new-class-name');
    const name = input.value.trim();
    if (!name) { toast('Enter a class name.', 'error'); return; }
    const classes = DB.get('classes');
    if (classes.find(c => c.name.toLowerCase() === name.toLowerCase())) { toast('Class already exists.', 'error'); return; }
    classes.push({ id: Utils.genId(), name });
    DB.set('classes', classes);
    input.value = '';
    toast('Class added!');
    renderList();
  }
  function del(id) {
    confirmDialog('Delete this class? Students in this class will remain.', () => {
      DB.set('classes', DB.get('classes').filter(c => c.id !== id));
      toast('Class deleted.', 'info');
      renderList();
    });
  }
  return { render, add, del };
})();

const Subjects = (() => {
  function render() { renderList(); }
  function renderList() {
    const subjects = DB.get('subjects');
    const colors = ['#4f8ef7', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
    const emojis = ['📖', '➗', 'اردو', '🔬', '💻', '🕌', '🌍', '⚗️', '🧪', '🧬'];
    document.getElementById('subject-count').textContent = `${subjects.length} subjects`;
    const c = document.getElementById('subjects-list');
    if (!subjects.length) { c.innerHTML = `<div class="col-12"><div class="empty-state"><div class="empty-state-icon">📚</div><h5>No Subjects</h5></div></div>`; return; }
    c.innerHTML = subjects.map((s, i) => {
      const color = colors[i % colors.length];
      return `<div class="col-sm-6 col-md-4 col-lg-3">
        <div class="card p-3 d-flex flex-row align-items-center gap-3">
          <div style="width:44px;height:44px;background:${color}22;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;border:1px solid ${color}33">${emojis[i % emojis.length]}</div>
          <div class="flex-grow-1"><div class="fw-semibold" style="font-size:14px">${s.name}</div></div>
          <button class="btn btn-icon btn-sm btn-outline-danger" onclick="Subjects.del('${s.id}')">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }
  function add() {
    const input = document.getElementById('new-subject-name');
    const name = input.value.trim();
    if (!name) { toast('Enter a subject name.', 'error'); return; }
    const subjects = DB.get('subjects');
    if (subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) { toast('Subject already exists.', 'error'); return; }
    subjects.push({ id: Utils.genId(), name });
    DB.set('subjects', subjects);
    input.value = '';
    toast('Subject added!');
    renderList();
  }
  function del(id) {
    confirmDialog('Delete this subject?', () => {
      DB.set('subjects', DB.get('subjects').filter(s => s.id !== id));
      toast('Subject deleted.', 'info');
      renderList();
    });
  }
  return { render, add, del };
})();
