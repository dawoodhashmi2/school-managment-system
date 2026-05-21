
// ================================================================
// NEWFEATURES3.JS — HBHS v3.3
// 1. 📜 Certificate Generator (Merit + Attendance)
// 2. 📅 Student Promotion (Year-end class upgrade)
// 3. 🌙 Dark Mode
// 4. ⚙️ School Settings (logo, name, address)
// ================================================================

// ================================================================
// 4. SCHOOL SETTINGS (load first — used by certificates)
// ================================================================
const SchoolSettings = (() => {
  function get() {
    return DB.getObj('schoolSettings', {
      name: 'Hira Baitul Hamd School',
      address: 'Sukkur, Sindh, Pakistan',
      phone: '',
      email: '',
      logo: '',
      website: '',
      motto: 'Excellence in Education',
      estYear: '2000',
      principalName: '',
    });
  }
  function save(s) { DB.set('schoolSettings', s); }

  function render() {
    const c = document.getElementById('school-settings-container');
    if (!c) return;
    const s = get();
    c.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="card h-100">
            <div class="card-body text-center p-4">
              <div id="ss-logo-preview" style="width:120px;height:120px;margin:0 auto 16px;border-radius:50%;border:3px dashed var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--surface-2);cursor:pointer" onclick="document.getElementById('ss-logo-input').click()">
                ${s.logo ? `<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : `<div style="text-align:center"><div style="font-size:2.5rem">🏫</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">Logo Upload</div></div>`}
              </div>
              <input type="file" id="ss-logo-input" accept="image/*" style="display:none" onchange="SchoolSettings.uploadLogo(this)">
              <button class="btn btn-sm btn-outline-primary" onclick="document.getElementById('ss-logo-input').click()">📷 Logo Upload Karein</button>
              ${s.logo ? `<br><button class="btn btn-sm btn-outline-danger mt-2" onclick="SchoolSettings.removeLogo()">🗑️ Remove</button>` : ''}
              <div class="mt-4 p-3" style="background:var(--surface-2);border-radius:12px;text-align:left">
                <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px">Preview:</div>
                <div style="font-size:15px;font-weight:700;color:var(--primary)">${s.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">${s.address}</div>
                ${s.motto ? `<div style="font-size:11px;color:var(--accent);font-style:italic;margin-top:4px">"${s.motto}"</div>` : ''}
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="card">
            <div class="card-body p-4">
              <h6 class="fw-bold mb-4">⚙️ School Information</h6>
              <div class="row g-3">
                <div class="col-md-12">
                  <label class="form-label fw-semibold">School Name <span class="text-danger">*</span></label>
                  <input type="text" id="ss-name" class="form-control" value="${s.name}" placeholder="School ka naam">
                </div>
                <div class="col-md-12">
                  <label class="form-label fw-semibold">Address / Pata</label>
                  <input type="text" id="ss-address" class="form-control" value="${s.address}" placeholder="City, Province, Pakistan">
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Phone Number</label>
                  <input type="text" id="ss-phone" class="form-control" value="${s.phone}" placeholder="e.g. 071-XXXXXXX">
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Email</label>
                  <input type="email" id="ss-email" class="form-control" value="${s.email}" placeholder="school@example.com">
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Website</label>
                  <input type="text" id="ss-website" class="form-control" value="${s.website}" placeholder="www.school.edu.pk">
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Established Year</label>
                  <input type="number" id="ss-est" class="form-control" value="${s.estYear}" placeholder="e.g. 2000">
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Principal Name</label>
                  <input type="text" id="ss-principal" class="form-control" value="${s.principalName}" placeholder="Principal ka naam">
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">School Motto</label>
                  <input type="text" id="ss-motto" class="form-control" value="${s.motto}" placeholder="e.g. Excellence in Education">
                </div>
                <div class="col-12 pt-2">
                  <button class="btn btn-primary px-4" onclick="SchoolSettings.saveSettings()">💾 Save Settings</button>
                  <small class="text-muted ms-3">Yeh settings certificates aur ID cards mein use hongi</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function uploadLogo(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const s = get(); s.logo = e.target.result; save(s);
      render(); toast('Logo save ho gaya! ✅', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    const s = get(); s.logo = ''; save(s); render(); toast('Logo remove ho gaya!', 'info');
  }

  function saveSettings() {
    const s = get();
    s.name = document.getElementById('ss-name')?.value?.trim() || s.name;
    s.address = document.getElementById('ss-address')?.value?.trim() || s.address;
    s.phone = document.getElementById('ss-phone')?.value?.trim() || '';
    s.email = document.getElementById('ss-email')?.value?.trim() || '';
    s.website = document.getElementById('ss-website')?.value?.trim() || '';
    s.estYear = document.getElementById('ss-est')?.value?.trim() || s.estYear;
    s.principalName = document.getElementById('ss-principal')?.value?.trim() || '';
    s.motto = document.getElementById('ss-motto')?.value?.trim() || '';
    save(s);
    // Update sidebar brand name
    const brand = document.querySelector('.brand-name');
    if (brand) brand.textContent = s.name;
    render(); toast('Settings save ho gayi! ✅', 'success');
  }

  return { get, render, uploadLogo, removeLogo, saveSettings };
})();

// ================================================================
// 1. CERTIFICATE GENERATOR
// ================================================================
const Certificates = (() => {
  function render() {
    const c = document.getElementById('certificates-container');
    if (!c) return;
    const students = DB.get('students');
    const classes = DB.get('classes').map(x => x.name);
    c.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="card" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;cursor:pointer" onclick="Certificates.setType('merit')"><div class="card-body text-center py-4"><div style="font-size:2.5rem">🏆</div><div style="font-size:16px;font-weight:700;margin-top:8px">Merit Certificate</div><div style="font-size:12px;opacity:.85">Top students ke liye</div></div></div></div>
        <div class="col-md-4"><div class="card" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;cursor:pointer" onclick="Certificates.setType('attendance')"><div class="card-body text-center py-4"><div style="font-size:2.5rem">✅</div><div style="font-size:16px;font-weight:700;margin-top:8px">Attendance Certificate</div><div style="font-size:12px;opacity:.85">Regular students ke liye</div></div></div></div>
        <div class="col-md-4"><div class="card" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;cursor:pointer" onclick="Certificates.setType('completion')"><div class="card-body text-center py-4"><div style="font-size:2.5rem">🎓</div><div style="font-size:16px;font-weight:700;margin-top:8px">Completion Certificate</div><div style="font-size:12px;opacity:.85">Class complete karne pe</div></div></div></div>
      </div>
      <div class="card">
        <div class="card-body">
          <h6 class="fw-bold mb-3" id="cert-type-label">🏆 Merit Certificate — Settings</h6>
          <div class="row g-3 mb-3">
            <div class="col-md-3">
              <label class="form-label">Certificate Type</label>
              <select id="cert-type" class="form-select" onchange="Certificates.changeType()">
                <option value="merit">🏆 Merit Certificate</option>
                <option value="attendance">✅ Attendance Certificate</option>
                <option value="completion">🎓 Completion Certificate</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Class Filter</label>
              <select id="cert-class" class="form-select" onchange="Certificates.loadStudents()">
                <option value="">All Classes</option>
                ${classes.map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Session / Year</label>
              <input type="text" id="cert-session" class="form-control" value="${new Date().getFullYear()}" placeholder="e.g. 2025">
            </div>
            <div class="col-md-3 d-flex align-items-end gap-2">
              <button class="btn btn-primary" onclick="Certificates.loadStudents()">🔄 Load</button>
              <button class="btn btn-success" onclick="Certificates.printAll()">🖨️ Print All</button>
            </div>
          </div>
          <div id="cert-student-list" class="row g-3">
            ${renderStudentList(students)}
          </div>
        </div>
      </div>`;
  }

  function renderStudentList(students) {
    if (!students.length) return '<div class="col-12"><p class="text-muted text-center py-4">Koi student nahi.</p></div>';
    return students.map(s => `
      <div class="col-md-6 col-lg-4">
        <div class="card" style="border:1px solid var(--border)">
          <div class="card-body p-3 d-flex align-items-center gap-3">
            ${s.photo ? `<img src="${s.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">` :
              `<div style="width:40px;height:40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0">${(s.name||'?')[0]}</div>`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.cls} ${s.section||''} • ${s.roll}</div>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="Certificates.printOne('${s.id}')" style="flex-shrink:0">🖨️</button>
          </div>
        </div>
      </div>`).join('');
  }

  function setType(type) {
    const sel = document.getElementById('cert-type');
    if (sel) { sel.value = type; changeType(); }
  }

  function changeType() {
    const type = document.getElementById('cert-type')?.value;
    const label = document.getElementById('cert-type-label');
    const labels = { merit: '🏆 Merit Certificate — Settings', attendance: '✅ Attendance Certificate — Settings', completion: '🎓 Completion Certificate — Settings' };
    if (label) label.textContent = labels[type] || '';
  }

  function loadStudents() {
    const cls = document.getElementById('cert-class')?.value;
    let students = DB.get('students');
    if (cls) students = students.filter(s => s.cls === cls);
    document.getElementById('cert-student-list').innerHTML = renderStudentList(students);
  }

  function buildCert(student, type, session) {
    const sch = SchoolSettings.get();
    const results = DB.get('results', []);
    const attendance = DB.get('attendance', []);
    const today = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });

    // Calculate for merit
    let extraText = '', achievement = '';
    if (type === 'merit') {
      const classStudents = DB.get('students').filter(s => s.cls === student.cls);
      const stats = classStudents.map(s => {
        let tot = 0, mx = 0;
        results.forEach(r => {
          const my = r.results?.find(x => x.studentId === s.id);
          if (!my) return;
          (r.subjects || []).forEach(sub => {
            if (my.marks && !Array.isArray(my.marks)) { tot += parseInt(my.marks[sub.id]) || 0; mx += parseInt(sub.total || sub.maxMarks || 100); }
          });
        });
        const pct = mx > 0 ? Math.round((tot / mx) * 100) : 0;
        return { id: s.id, pct };
      }).sort((a, b) => b.pct - a.pct);
      const rank = stats.findIndex(s => s.id === student.id) + 1;
      const myStats = stats.find(s => s.id === student.id);
      const rl = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : rank + 'th';
      extraText = `having secured <strong>${rl} Position</strong> in class ${student.cls} with <strong>${myStats?.pct || 0}%</strong> marks`;
      achievement = `${rl} Position — ${myStats?.pct || 0}%`;
    } else if (type === 'attendance') {
      const myAtt = attendance.filter(a => a.records?.some(r => r.studentId === student.id));
      const present = myAtt.filter(a => a.records?.find(r => r.studentId === student.id)?.status === 'present').length;
      const total = myAtt.length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      extraText = `having maintained <strong>${pct}% attendance</strong> (${present}/${total} days) during the academic session ${session}`;
      achievement = `${pct}% Attendance`;
    } else {
      extraText = `having successfully completed the academic requirements of <strong>Class ${student.cls}</strong> for the session ${session}`;
      achievement = `Class ${student.cls} Completed`;
    }

    const colors = { merit: { h: '#b45309', bg: '#fffbeb', border: '#f59e0b', ribbon: '#f59e0b', icon: '🏆' },
                     attendance: { h: '#065f46', bg: '#f0fdf4', border: '#10b981', ribbon: '#10b981', icon: '⭐' },
                     completion: { h: '#3730a3', bg: '#eef2ff', border: '#6366f1', ribbon: '#6366f1', icon: '🎓' } };
    const col = colors[type];

    return `
      <div style="width:780px;margin:0 auto 50px;background:${col.bg};border:8px double ${col.border};border-radius:4px;font-family:'Times New Roman',serif;position:relative;page-break-after:always;padding:0">
        <!-- Corner ornaments -->
        <div style="position:absolute;top:12px;left:12px;width:60px;height:60px;border-top:3px solid ${col.border};border-left:3px solid ${col.border}"></div>
        <div style="position:absolute;top:12px;right:12px;width:60px;height:60px;border-top:3px solid ${col.border};border-right:3px solid ${col.border}"></div>
        <div style="position:absolute;bottom:12px;left:12px;width:60px;height:60px;border-bottom:3px solid ${col.border};border-left:3px solid ${col.border}"></div>
        <div style="position:absolute;bottom:12px;right:12px;width:60px;height:60px;border-bottom:3px solid ${col.border};border-right:3px solid ${col.border}"></div>

        <div style="padding:48px 60px">
          <!-- School Header -->
          <div style="text-align:center;border-bottom:2px solid ${col.border};padding-bottom:20px;margin-bottom:24px">
            ${sch.logo ? `<img src="${sch.logo}" style="height:70px;margin-bottom:10px;border-radius:50%">` : `<div style="font-size:3rem;margin-bottom:6px">${col.icon}</div>`}
            <div style="font-size:26px;font-weight:700;color:${col.h};letter-spacing:1px">${sch.name}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:4px">${sch.address}${sch.phone ? ' • ' + sch.phone : ''}</div>
            ${sch.motto ? `<div style="font-size:12px;color:${col.h};font-style:italic;margin-top:4px">"${sch.motto}"</div>` : ''}
          </div>

          <!-- Certificate Title -->
          <div style="text-align:center;margin-bottom:28px">
            <div style="display:inline-block;background:${col.ribbon};color:#fff;padding:8px 40px;border-radius:4px;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase">
              ${type === 'merit' ? 'Merit Certificate' : type === 'attendance' ? 'Attendance Certificate' : 'Certificate of Completion'}
            </div>
          </div>

          <!-- Certificate Body -->
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:15px;color:#374151;margin-bottom:20px">This is to certify that</div>
            <div style="font-size:32px;font-weight:700;color:${col.h};border-bottom:2px solid ${col.border};display:inline-block;padding-bottom:4px;min-width:300px;letter-spacing:1px">${student.name}</div>
            <div style="font-size:14px;color:#6b7280;margin-top:8px">Son/Daughter of <strong>${student.father || '—'}</strong> • Roll No: <strong>${student.roll}</strong></div>
            <div style="font-size:14px;color:#6b7280;margin-top:4px">Class <strong>${student.cls} ${student.section || ''}</strong></div>
          </div>

          <div style="text-align:center;font-size:16px;color:#374151;line-height:1.8;margin-bottom:28px;padding:0 30px">
            is hereby awarded this certificate for ${extraText} during the academic session <strong>${session}</strong>.
          </div>

          <!-- Achievement Badge -->
          <div style="text-align:center;margin-bottom:32px">
            <div style="display:inline-block;background:${col.border};color:#fff;padding:6px 28px;border-radius:20px;font-size:14px;font-weight:700">
              ${col.icon} ${achievement}
            </div>
          </div>

          <!-- Signatures -->
          <div style="display:flex;justify-content:space-between;margin-top:8px">
            <div style="text-align:center">
              <div style="border-top:1px solid #374151;width:150px;margin:0 auto"></div>
              <div style="font-size:13px;margin-top:6px;font-weight:700">${sch.principalName || 'Principal'}</div>
              <div style="font-size:12px;color:#6b7280">Principal</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:13px;color:#9ca3af">Date: ${today}</div>
              <div style="font-size:12px;color:#9ca3af;margin-top:4px">Issued by ${sch.name}</div>
            </div>
            <div style="text-align:center">
              <div style="border-top:1px solid #374151;width:150px;margin:0 auto"></div>
              <div style="font-size:13px;margin-top:6px;font-weight:700">Class Teacher</div>
              <div style="font-size:12px;color:#6b7280">Signature</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function printOne(sid) {
    const s = DB.get('students').find(x => x.id === sid);
    if (!s) return;
    const type = document.getElementById('cert-type')?.value || 'merit';
    const session = document.getElementById('cert-session')?.value || new Date().getFullYear();
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Certificate — ${s.name}</title><style>body{margin:0;padding:30px;background:#f5f5f5}@media print{body{background:#fff;padding:0}}</style></head><body>${buildCert(s, type, session)}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  function printAll() {
    const cls = document.getElementById('cert-class')?.value;
    const type = document.getElementById('cert-type')?.value || 'merit';
    const session = document.getElementById('cert-session')?.value || new Date().getFullYear();
    let students = DB.get('students');
    if (cls) students = students.filter(s => s.cls === cls);
    if (!students.length) { toast('Koi student nahi!', 'error'); return; }
    const cards = students.map(s => buildCert(s, type, session)).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Certificates</title><style>body{margin:0;padding:30px;background:#f5f5f5}@media print{body{background:#fff;padding:0}}</style></head><body>${cards}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
    toast(`${students.length} certificates print ho rahe hain!`, 'success');
  }

  return { render, setType, changeType, loadStudents, printOne, printAll };
})();

// ================================================================
// 2. STUDENT PROMOTION
// ================================================================
const Promotion = (() => {
  function render() {
    const c = document.getElementById('promotion-container');
    if (!c) return;
    const classes = DB.get('classes').map(x => x.name);
    const students = DB.get('students');

    c.innerHTML = `
      <div class="card mb-4" style="border:2px solid #f59e0b;background:#fffbeb">
        <div class="card-body py-2 px-3">
          <small style="color:#92400e;font-weight:600">⚠️ Warning: Promotion se student ki class permanently change ho jaati hai. Pehle backup zaroor lein!</small>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-body">
          <h6 class="fw-bold mb-3">📅 Year-End Promotion Settings</h6>
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label">From Class</label>
              <select id="promo-from" class="form-select" onchange="Promotion.loadPreview()">
                <option value="">Select Class</option>
                ${classes.slice(0, -1).map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">To Class</label>
              <select id="promo-to" class="form-select">
                <option value="">Auto (Next Class)</option>
                ${classes.map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Min % to Pass</label>
              <input type="number" id="promo-min-pct" class="form-control" value="40" min="0" max="100">
            </div>
            <div class="col-md-3 d-flex gap-2 align-items-end">
              <button class="btn btn-primary" onclick="Promotion.loadPreview()">👁️ Preview</button>
            </div>
          </div>
        </div>
      </div>

      <div id="promo-preview-area"></div>
    `;
  }

  function getNextClass(currentClass) {
    const classes = DB.get('classes').map(x => x.name);
    const idx = classes.indexOf(currentClass);
    return idx >= 0 && idx < classes.length - 1 ? classes[idx + 1] : null;
  }

  function loadPreview() {
    const fromCls = document.getElementById('promo-from')?.value;
    const minPct = parseInt(document.getElementById('promo-min-pct')?.value) || 40;
    if (!fromCls) { document.getElementById('promo-preview-area').innerHTML = '<p class="text-muted text-center py-3">Upar se class select karein.</p>'; return; }

    const toCls = document.getElementById('promo-to')?.value || getNextClass(fromCls);
    if (!toCls) { toast('Agle class ka naam nahi mila!', 'error'); return; }
    document.getElementById('promo-to').value = toCls;

    const students = DB.get('students').filter(s => s.cls === fromCls);
    const results = DB.get('results', []);

    const withStats = students.map(s => {
      let tot = 0, mx = 0;
      results.forEach(r => {
        const my = r.results?.find(x => x.studentId === s.id);
        if (!my) return;
        (r.subjects || []).forEach(sub => {
          if (my.marks && !Array.isArray(my.marks)) { tot += parseInt(my.marks[sub.id]) || 0; mx += parseInt(sub.total || sub.maxMarks || 100); }
        });
      });
      const pct = mx > 0 ? Math.round((tot / mx) * 100) : null;
      const pass = pct !== null ? pct >= minPct : true; // no results = assume pass
      return { ...s, pct, pass };
    });

    const passing = withStats.filter(s => s.pass);
    const failing = withStats.filter(s => !s.pass);

    const area = document.getElementById('promo-preview-area');
    area.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="card text-center" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">✅</div><div style="font-size:1.8rem;font-weight:700">${passing.length}</div><div style="font-size:12px;opacity:.85">Promote Honge (${fromCls} → ${toCls})</div></div></div></div>
        <div class="col-md-4"><div class="card text-center" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">❌</div><div style="font-size:1.8rem;font-weight:700">${failing.length}</div><div style="font-size:12px;opacity:.85">Rok Liye Jayenge (${fromCls})</div></div></div></div>
        <div class="col-md-4"><div class="card text-center" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">👥</div><div style="font-size:1.8rem;font-weight:700">${students.length}</div><div style="font-size:12px;opacity:.85">Total Students in ${fromCls}</div></div></div></div>
      </div>

      ${passing.length > 0 ? `
      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0 text-success">✅ Promote Honge — ${fromCls} → ${toCls}</h6>
            <button class="btn btn-success fw-bold" onclick="Promotion.doPromotion('${fromCls}','${toCls}',${minPct})">🚀 Promote Karein (${passing.length} Students)</button>
          </div>
          <div class="table-container" style="max-height:280px;overflow-y:auto">
            <table class="table table-sm table-hover">
              <thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Result</th><th>Status</th></tr></thead>
              <tbody>${passing.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.roll}</td><td>${s.pct !== null ? s.pct + '%' : 'No Result'}</td><td><span class="badge bg-success">✅ Pass → ${toCls}</span></td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>` : ''}

      ${failing.length > 0 ? `
      <div class="card">
        <div class="card-body">
          <h6 class="fw-bold mb-3 text-danger">❌ Rok Liye Jayenge — ${fromCls} mein hi rahenge</h6>
          <div class="table-container" style="max-height:200px;overflow-y:auto">
            <table class="table table-sm">
              <thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Percentage</th><th>Status</th></tr></thead>
              <tbody>${failing.map((s, i) => `<tr style="background:#fef2f2"><td>${i + 1}</td><td>${s.name}</td><td>${s.roll}</td><td style="color:#ef4444;font-weight:700">${s.pct}%</td><td><span class="badge bg-danger">❌ Fail — Same Class</span></td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>` : ''}
    `;
  }

  function doPromotion(fromCls, toCls, minPct) {
    confirmDialog(`${fromCls} ke pass students ko ${toCls} mein promote karein? Yeh action undo nahi hogi!`, () => {
      const students = DB.get('students');
      const results = DB.get('results', []);
      let promoted = 0;

      const updated = students.map(s => {
        if (s.cls !== fromCls) return s;
        let tot = 0, mx = 0;
        results.forEach(r => {
          const my = r.results?.find(x => x.studentId === s.id);
          if (!my) return;
          (r.subjects || []).forEach(sub => {
            if (my.marks && !Array.isArray(my.marks)) { tot += parseInt(my.marks[sub.id]) || 0; mx += parseInt(sub.total || sub.maxMarks || 100); }
          });
        });
        const pct = mx > 0 ? Math.round((tot / mx) * 100) : 100;
        if (pct >= minPct) { promoted++; return { ...s, cls: toCls }; }
        return s;
      });

      DB.set('students', updated);
      toast(`🎉 ${promoted} students ${fromCls} se ${toCls} mein promote ho gaye!`, 'success');
      render();
    }, 'Promote Karein');
  }

  return { render, loadPreview, doPromotion };
})();

// ================================================================
// 3. DARK MODE
// ================================================================
const DarkMode = (() => {
  function init() {
    const dark = localStorage.getItem('hbhs_dark') === '1';
    if (dark) enable(false);
    // Add toggle button to topbar
    const actions = document.getElementById('topbar-actions');
    if (actions && !document.getElementById('dark-mode-btn')) {
      const btn = document.createElement('button');
      btn.id = 'dark-mode-btn';
      btn.className = 'topbar-btn border-0';
      btn.title = 'Dark/Light Mode';
      btn.innerHTML = dark ? '☀️' : '🌙';
      btn.style.cssText = 'font-size:18px;background:none;cursor:pointer';
      btn.onclick = toggle;
      actions.insertBefore(btn, actions.firstChild);
    }
  }

  function enable(save = true) {
    document.documentElement.setAttribute('data-theme', 'dark');
    const btn = document.getElementById('dark-mode-btn');
    if (btn) btn.innerHTML = '☀️';
    if (save) localStorage.setItem('hbhs_dark', '1');
  }

  function disable(save = true) {
    document.documentElement.removeAttribute('data-theme');
    const btn = document.getElementById('dark-mode-btn');
    if (btn) btn.innerHTML = '🌙';
    if (save) localStorage.setItem('hbhs_dark', '0');
  }

  function toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) disable(); else enable();
    toast(isDark ? '☀️ Light mode on!' : '🌙 Dark mode on!', 'info');
  }

  return { init, toggle, enable, disable };
})();
