// ================================================================
// NEWFEATURES.JS — HBHS v3.0 Additional Modules
// 1. 📊 Progress Report Card (PDF/Print)
// 2. 💰 Salary Management
// 3. 📚 Library Management
// 4. 📢 Parent-Teacher Meeting Scheduler
// 5. 💬 Complaint & Feedback System
// 6. 🔒 Activity Log / Audit Trail
// 7. 📋 Staff Attendance & Leave Management
// 8. 💸 Expense Tracker (Bonus)
// ================================================================

// ---- Activity Logger (used across all modules) ----
const ActivityLog = (() => {
  function log(action, details, module = 'System') {
    const logs = DB.get('activity_logs', []);
    logs.unshift({
      id: Utils.genId(),
      action,
      details,
      module,
      user: APP.currentUser?.name || 'System',
      role: APP.currentPortal || 'system',
      timestamp: new Date().toISOString(),
    });
    // Keep only last 500 logs
    if (logs.length > 500) logs.length = 500;
    DB.set('activity_logs', logs);
  }
  return { log };
})();

// ================================================================
// 1. 📊 PROGRESS REPORT CARD
// ================================================================
const ProgressReport = (() => {

  function render() {
    const container = document.getElementById('progress-report-container');
    if (!container) return;
    const classes = DB.get('classes');
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">🎯 Generate Progress Report Card</div></div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label">Class</label>
              <select id="pr-class" class="form-select" onchange="ProgressReport.loadStudents()">
                <option value="">Select Class</option>
                ${classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Section</label>
              <select id="pr-section" class="form-select" onchange="ProgressReport.loadStudents()">
                <option value="">All</option>
                <option>A</option><option>B</option><option>C</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Student (Optional)</label>
              <select id="pr-student" class="form-select">
                <option value="">All Students</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Exam</label>
              <select id="pr-exam" class="form-select">
                <option value="">All Exams</option>
                ${[...new Set(DB.get('results').map(r=>r.exam).filter(Boolean))].map(e=>`<option value="${e}">${e}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-2">
              <button class="btn btn-primary w-100" onclick="ProgressReport.generateCard()">📄 Generate</button>
            </div>
          </div>
        </div>
      </div>
      <div id="report-card-output"></div>
    `;
  }

  function loadStudents() {
    const cls = document.getElementById('pr-class')?.value;
    const sec = document.getElementById('pr-section')?.value;
    const sel = document.getElementById('pr-student');
    if (!sel) return;
    let students = DB.get('students');
    if (cls) students = students.filter(s=>s.cls===cls||s.class===cls);
    if (sec) students = students.filter(s=>s.section===sec);
    sel.innerHTML = '<option value="">All Students</option>' + students.map(s=>`<option value="${s.id}">${s.name} (${s.roll})</option>`).join('');
  }

  function generateCard() {
    const cls = document.getElementById('pr-class')?.value;
    const sec = document.getElementById('pr-section')?.value;
    const stdId = document.getElementById('pr-student')?.value;
    const exam = document.getElementById('pr-exam')?.value;
    const output = document.getElementById('report-card-output');
    if (!output) return;

    let students = DB.get('students');
    if (cls) students = students.filter(s=>s.cls===cls||s.class===cls);
    if (sec) students = students.filter(s=>s.section===sec);
    if (stdId) students = students.filter(s=>s.id===stdId);

    if (!students.length) { toast('Koi student nahi mila!','error'); return; }

    // FIX: Correct data format use karo — results: [{cls, results:[{studentId, marks:{subId:score}, total, pct}], subjects:[{id,name}]}]
    const allResultGroups = DB.get('results', []);
    // FIX: Correct attendance format — [{date, cls, attendance:{[studentId]: 'present'|'absent'|'late'}}]
    const allAtt = DB.get('attendance', []);

    output.innerHTML = students.map(std => {
      // Filter result groups that contain this student's data
      let myResultGroups = allResultGroups.filter(rg =>
        rg.results && rg.results.some(rs => rs.studentId === std.id)
      );
      if (exam) myResultGroups = myResultGroups.filter(rg => rg.exam === exam);

      // Build subject marks map: subjectName -> {obtained, total, max_per_sub:100}
      const subjectMap = {};
      myResultGroups.forEach(rg => {
        const myRow = rg.results.find(rs => rs.studentId === std.id);
        if (!myRow) return;
        // rg.subjects = [{id, name}], myRow.marks = {subId: score}
        (rg.subjects || []).forEach(sub => {
          const score = myRow.marks ? (myRow.marks[sub.id] ?? 0) : 0;
          if (!subjectMap[sub.name]) subjectMap[sub.name] = { obtained: 0, total: 0 };
          subjectMap[sub.name].obtained += +score;
          subjectMap[sub.name].total += 100; // each subject max is 100
        });
      });

      const subjectRows = Object.entries(subjectMap).map(([subName, data]) => {
        const pct = data.total > 0 ? Math.round(data.obtained / data.total * 100) : 0;
        const grade = Utils.getGrade(pct);
        const clr = pct>=70?'#16a34a':pct>=50?'#d97706':'#dc2626';
        return `<tr>
          <td style="font-weight:600">${subName}</td>
          <td style="text-align:center">${data.obtained}</td>
          <td style="text-align:center">${data.total}</td>
          <td style="text-align:center;font-weight:700;color:${clr}">${pct}%</td>
          <td style="text-align:center;font-weight:700;color:${clr}">${grade}</td>
        </tr>`;
      }).join('');

      const totalObt = Object.values(subjectMap).reduce((a, b) => a + b.obtained, 0);
      const totalMax = Object.values(subjectMap).reduce((a, b) => a + b.total, 0);
      const overall = totalMax > 0 ? Math.round(totalObt / totalMax * 100) : 0;
      const overallGrade = Utils.getGrade(overall);

      // FIX: Correct attendance structure — attendance is stored as r.attendance[studentId]
      let attPresent = 0, attTotal = 0;
      allAtt.forEach(r => {
        if (r.attendance && r.attendance[std.id] !== undefined) {
          attTotal++;
          if (r.attendance[std.id] === 'present') attPresent++;
        }
      });
      const present = attPresent;
      const total = attTotal;
      const attPct = total > 0 ? Math.round(present / total * 100) : 0;

      // Remarks
      const remarks = overall>=80?'Excellent Performance! Keep it up! 🌟':
        overall>=60?'Good Performance. Work harder! 👍':
        overall>=40?'Average. Needs improvement. 📚':
        'Below average. Requires serious attention! ⚠️';

      return `
        <div class="report-card-wrap" id="rc-${std.id}" style="background:#fff;border:2px solid #1e40af;border-radius:12px;margin-bottom:32px;overflow:hidden;max-width:750px">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:24px;color:#fff;display:flex;align-items:center;gap:20px">
            <div style="font-size:56px">🎓</div>
            <div>
              <div style="font-size:20px;font-weight:800">Hira Baitul Hamd School</div>
              <div style="font-size:13px;opacity:.8">Sukkur, Sindh — Progress Report Card</div>
              <div style="font-size:12px;opacity:.7;margin-top:4px">${exam?'Exam: '+exam:'All Exams'} • Generated: ${Utils.fmtDate(new Date())}</div>
            </div>
          </div>
          <!-- Student Info -->
          <div style="padding:16px 24px;background:#f0f4ff;display:flex;gap:24px;flex-wrap:wrap;border-bottom:1px solid #e2e8f0">
            <div><span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Student</span><div style="font-weight:700;font-size:15px">${std.name}</div></div>
            <div><span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Roll No</span><div style="font-weight:700;font-size:15px">${std.roll}</div></div>
            <div><span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Class</span><div style="font-weight:700;font-size:15px">${std.cls||std.class} ${std.section||''}</div></div>
            <div><span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Father</span><div style="font-weight:700;font-size:15px">${std.father||'-'}</div></div>
            <div><span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Attendance</span><div style="font-weight:700;font-size:15px;color:${attPct>=75?'#16a34a':'#dc2626'}">${present}/${total} (${attPct}%)</div></div>
          </div>
          <!-- Marks Table -->
          <div style="padding:20px 24px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;color:#374151">Subject</th>
                  <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;color:#374151">Obtained</th>
                  <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;color:#374151">Total</th>
                  <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;color:#374151">Percentage</th>
                  <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;color:#374151">Grade</th>
                </tr>
              </thead>
              <tbody>${subjectRows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af">No results found</td></tr>'}</tbody>
            </table>
          </div>
          <!-- Overall & Remarks -->
          <div style="padding:16px 24px;background:#f0fdf4;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Overall Result</div>
              <div style="font-size:24px;font-weight:800;color:${overall>=60?'#16a34a':'#dc2626'}">${overall}% — Grade ${overallGrade}</div>
              <div style="font-size:13px;color:#374151;margin-top:4px;font-style:italic">${remarks}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:#6b7280;font-weight:600">Class Teacher Signature</div>
              <div style="margin-top:30px;border-top:1px solid #374151;padding-top:4px;font-size:12px;color:#6b7280">Signature</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    ActivityLog.log('Report Card Generated', `Class: ${cls||'All'}, ${students.length} students`, 'Progress Report');
    toast(`${students.length} report card(s) generate ho gayi!`);
  }

  function printAll() {
    const content = document.getElementById('report-card-output')?.innerHTML;
    if (!content) { toast('Pehle generate karein!','error'); return; }
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Report Cards — HBHS</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5}
      .report-card-wrap{page-break-after:always}
      @media print{body{background:#fff}}</style></head>
      <body>${content}<script>window.print();setTimeout(()=>window.close(),1000);</script></body></html>`);
    w.document.close();
    ActivityLog.log('Report Cards Printed', 'Print initiated', 'Progress Report');
  }

  return { render, loadStudents, generateCard, printAll };
})();

// ================================================================
// 2. 💰 SALARY MANAGEMENT
// ================================================================
const Salary = (() => {

  function render() {
    const container = document.getElementById('salary-container');
    if (!container) return;
    const teachers = DB.get('teachers');
    const salaries = DB.get('salaries', []);
    const months = [...new Set(salaries.map(s=>s.month))].sort().reverse();
    const curMonth = new Date().toISOString().slice(0,7);

    container.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="stat-card green"><div class="stat-icon">💰</div><div>
          <div class="stat-value">PKR ${(salaries.filter(s=>s.status==='paid'&&s.month===curMonth).reduce((a,b)=>a+(+b.amount||0),0)).toLocaleString()}</div>
          <div class="stat-label">Paid This Month</div>
        </div></div></div>
        <div class="col-md-4"><div class="stat-card red"><div class="stat-icon">⏳</div><div>
          <div class="stat-value">PKR ${(salaries.filter(s=>s.status==='pending'&&s.month===curMonth).reduce((a,b)=>a+(+b.amount||0),0)).toLocaleString()}</div>
          <div class="stat-label">Pending This Month</div>
        </div></div></div>
        <div class="col-md-4"><div class="stat-card blue"><div class="stat-icon">👩‍🏫</div><div>
          <div class="stat-value">${teachers.length}</div>
          <div class="stat-label">Total Staff</div>
        </div></div></div>
      </div>

      <!-- Add/Generate -->
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">➕ Generate Monthly Salaries</div></div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label">Month</label>
              <input type="month" id="sal-month" class="form-control" value="${curMonth}">
            </div>
            <div class="col-md-3">
              <label class="form-label">Default Salary (PKR)</label>
              <input type="number" id="sal-default-amount" class="form-control" value="25000" placeholder="e.g. 25000">
            </div>
            <div class="col-md-3">
              <button class="btn btn-primary" onclick="Salary.generateAll()">⚡ Generate for All Staff</button>
            </div>
            <div class="col-md-3">
              <button class="btn btn-outline-success" onclick="Salary.openAdd()">➕ Add Individual</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter -->
      <div class="card mb-3"><div class="card-body py-3">
        <div class="row g-2">
          <div class="col-md-4">
            <select id="sal-filter-month" class="form-select" onchange="Salary.render()">
              <option value="">All Months</option>
              ${months.map(m=>`<option value="${m}" ${m===curMonth?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-3">
            <select id="sal-filter-status" class="form-select" onchange="Salary.render()">
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div></div>

      <!-- Table -->
      <div class="card"><div class="card-body p-0"><div class="table-container">
        <table class="table"><thead><tr>
          <th>#</th><th>Teacher</th><th>Month</th><th>Basic Salary</th>
          <th>Bonus</th><th>Deduction</th><th>Net Salary</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody id="salary-tbody">${renderRows()}</tbody></table>
      </div></div></div>

      <!-- Modal -->
      <div class="modal fade" id="salaryModal" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content">
          <div class="modal-header"><h5 class="modal-title" id="sal-modal-title">Add Salary Record</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-12"><label class="form-label">Teacher <span class="text-danger">*</span></label>
                <select id="sal-teacher-id" class="form-select">
                  <option value="">Select Teacher</option>
                  ${teachers.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-6"><label class="form-label">Month</label><input type="month" id="sal-m" class="form-control" value="${curMonth}"></div>
              <div class="col-md-6"><label class="form-label">Basic Salary (PKR)</label><input type="number" id="sal-amount" class="form-control" placeholder="25000"></div>
              <div class="col-md-6"><label class="form-label">Bonus (PKR)</label><input type="number" id="sal-bonus" class="form-control" placeholder="0" value="0"></div>
              <div class="col-md-6"><label class="form-label">Deduction (PKR)</label><input type="number" id="sal-deduction" class="form-control" placeholder="0" value="0"></div>
              <div class="col-12"><label class="form-label">Status</label>
                <select id="sal-status" class="form-select"><option value="pending">Pending</option><option value="paid">Paid</option></select>
              </div>
              <div class="col-12"><label class="form-label">Notes</label><input type="text" id="sal-notes" class="form-control" placeholder="Any notes..."></div>
            </div>
          </div>
          <div class="modal-footer">
            <input type="hidden" id="sal-edit-id">
            <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="Salary.save()">Save</button>
          </div>
        </div></div>
      </div>
    `;
  }

  function renderRows() {
    const salaries = DB.get('salaries', []);
    const teachers = DB.get('teachers');
    const filterMonth = document.getElementById('sal-filter-month')?.value || '';
    const filterStatus = document.getElementById('sal-filter-status')?.value || '';

    let data = [...salaries];
    if (filterMonth) data = data.filter(s=>s.month===filterMonth);
    if (filterStatus) data = data.filter(s=>s.status===filterStatus);
    data.sort((a,b)=>b.month.localeCompare(a.month));

    if (!data.length) return '<tr><td colspan="9" style="text-align:center;padding:30px;color:#9ca3af">Koi record nahi mila</td></tr>';

    return data.map((s,i) => {
      const teacher = teachers.find(t=>t.id===s.teacherId);
      // FIX: Total deduction = manualDeduction + all QR-based dedLog amounts
      const qrDed = (s.dedLog||[]).reduce((a,d)=>a+d.amount, 0);
      const manDed = s.manualDeduction || 0;
      const totalDed = qrDed + manDed;
      // Ensure s.deduction is always synced (backward compat for old records)
      const displayDed = s.deduction !== undefined ? +s.deduction : totalDed;
      const net = (+s.amount||0)+(+s.bonus||0)-displayDed;
      const statusBadge = s.status==='paid'
        ? '<span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✅ PAID</span>'
        : '<span style="background:#fef9c3;color:#d97706;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">⏳ PENDING</span>';
      return `<tr>
        <td>${i+1}</td>
        <td>${teacher?.name||'Unknown'}</td>
        <td>${s.month}</td>
        <td>PKR ${(+s.amount||0).toLocaleString()}</td>
        <td style="color:#16a34a">+${(+s.bonus||0).toLocaleString()}</td>
        <td style="color:#dc2626">-${displayDed.toLocaleString()}</td>
        <td style="font-weight:700">PKR ${net.toLocaleString()}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-xs btn-outline-success" onclick="Salary.markPaid('${s.id}')">✅ Mark Paid</button>
            <button class="btn btn-xs btn-outline-primary" onclick="Salary.edit('${s.id}')">✏️</button>
            <button class="btn btn-xs btn-outline-danger" onclick="Salary.delete('${s.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function generateAll() {
    const month = document.getElementById('sal-month')?.value;
    const defaultAmt = +(document.getElementById('sal-default-amount')?.value)||25000;
    if (!month) { toast('Month select karein!','error'); return; }
    const teachers = DB.get('teachers');
    const salaries = DB.get('salaries',[]);
    let added = 0;
    teachers.forEach(t=>{
      const exists = salaries.find(s=>s.teacherId===t.id&&s.month===month);
      if (!exists) {
        salaries.push({ id: Utils.genId(), teacherId: t.id, month, amount: defaultAmt, bonus: 0, deduction: 0, status: 'pending', notes: 'Auto-generated' });
        added++;
      }
    });
    DB.set('salaries', salaries);
    ActivityLog.log('Salaries Generated', `Month: ${month}, ${added} records`, 'Salary');
    toast(`${added} salary records generate ho gaye!`);
    render();
  }

  function openAdd() {
    document.getElementById('sal-edit-id').value = '';
    document.getElementById('sal-modal-title').textContent = 'Add Salary Record';
    document.getElementById('sal-teacher-id').value = '';
    document.getElementById('sal-amount').value = '';
    document.getElementById('sal-bonus').value = '0';
    document.getElementById('sal-deduction').value = '0';
    document.getElementById('sal-status').value = 'pending';
    document.getElementById('sal-notes').value = '';
    new bootstrap.Modal(document.getElementById('salaryModal')).show();
  }

  function edit(id) {
    const s = DB.get('salaries',[]).find(s=>s.id===id);
    if (!s) return;
    document.getElementById('sal-edit-id').value = id;
    document.getElementById('sal-modal-title').textContent = 'Edit Salary Record';
    document.getElementById('sal-teacher-id').value = s.teacherId;
    document.getElementById('sal-m').value = s.month;
    document.getElementById('sal-amount').value = s.amount;
    document.getElementById('sal-bonus').value = s.bonus||0;
    // FIX: Show manualDeduction (admin-entered), not total deduction which includes QR deductions
    document.getElementById('sal-deduction').value = s.manualDeduction||0;
    document.getElementById('sal-status').value = s.status;
    document.getElementById('sal-notes').value = s.notes||'';
    new bootstrap.Modal(document.getElementById('salaryModal')).show();
  }

  function save() {
    const teacherId = document.getElementById('sal-teacher-id').value;
    const month = document.getElementById('sal-m').value;
    const amount = +document.getElementById('sal-amount').value;
    if (!teacherId||!month||!amount) { toast('Teacher, month aur amount lazmi hain!','error'); return; }
    const salaries = DB.get('salaries',[]);
    const editId = document.getElementById('sal-edit-id').value;
    // FIX: Manual deduction = admin-entered value (sal-deduction field)
    // QR deduction = dedLog se calculate — dono alag track karo
    const manualDeduction = +document.getElementById('sal-deduction').value||0;
    const record = {
      id: editId||Utils.genId(), teacherId, month, amount,
      bonus: +document.getElementById('sal-bonus').value||0,
      manualDeduction, // admin ka manual deduction alag field mein
      status: document.getElementById('sal-status').value,
      notes: document.getElementById('sal-notes').value,
    };
    if (editId) {
      const i = salaries.findIndex(s=>s.id===editId);
      if (i >= 0) {
        // FIX: QR se aaye dedLog aur qrDeduction preserve karo — sirf manual fields update karo
        record.dedLog = salaries[i].dedLog || [];
        record.deduction = (record.manualDeduction || 0) + (salaries[i].dedLog || []).reduce((a,d)=>a+d.amount,0);
        salaries[i] = record;
      }
    } else {
      record.dedLog = [];
      record.deduction = manualDeduction;
      salaries.push(record);
    }
    DB.set('salaries', salaries);
    bootstrap.Modal.getInstance(document.getElementById('salaryModal'))?.hide();
    ActivityLog.log('Salary Record Saved', `Month: ${month}`, 'Salary');
    toast('Salary record save ho gaya!');
    render();
  }

  function markPaid(id) {
    const salaries = DB.get('salaries',[]);
    const i = salaries.findIndex(s=>s.id===id);
    if (i>-1) { salaries[i].status='paid'; salaries[i].paidDate=Utils.todayStr(); }
    DB.set('salaries', salaries);
    ActivityLog.log('Salary Marked Paid', `ID: ${id}`, 'Salary');
    toast('Salary paid mark ho gayi!');
    render();
  }

  function deleteRecord(id) {
    confirmDialog('Yeh salary record delete karein?', ()=>{
      const salaries = DB.get('salaries',[]).filter(s=>s.id!==id);
      DB.set('salaries', salaries);
      ActivityLog.log('Salary Record Deleted', `ID: ${id}`, 'Salary');
      toast('Record delete ho gaya!');
      render();
    });
  }

  return { render, renderRows, generateAll, openAdd, edit, save, markPaid, delete: deleteRecord };
})();

// ================================================================
// 3. 📚 LIBRARY MANAGEMENT
// ================================================================
const Library = (() => {

  function render() {
    const container = document.getElementById('library-container');
    if (!container) return;
    const books = DB.get('library_books',[]);
    const issues = DB.get('library_issues',[]);
    const overdue = issues.filter(i=>!i.returnDate && new Date(i.dueDate)<new Date()).length;

    container.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-3"><div class="stat-card blue"><div class="stat-icon">📚</div><div><div class="stat-value">${books.length}</div><div class="stat-label">Total Books</div></div></div></div>
        <div class="col-md-3"><div class="stat-card green"><div class="stat-icon">✅</div><div><div class="stat-value">${books.filter(b=>b.available>0).length}</div><div class="stat-label">Available</div></div></div></div>
        <div class="col-md-3"><div class="stat-card orange"><div class="stat-icon">📖</div><div><div class="stat-value">${issues.filter(i=>!i.returnDate).length}</div><div class="stat-label">Issued</div></div></div></div>
        <div class="col-md-3"><div class="stat-card red"><div class="stat-icon">⏰</div><div><div class="stat-value">${overdue}</div><div class="stat-label">Overdue</div></div></div></div>
      </div>

      <!-- Tabs -->
      <div class="card mb-4">
        <div class="card-header" style="padding:0;border-bottom:1px solid var(--border)">
          <div class="d-flex">
            <button class="btn border-0 px-4 py-3 fw-600" style="border-radius:0;border-bottom:3px solid var(--accent);color:var(--accent)" onclick="Library.showTab('books',this)">📚 Books Catalog</button>
            <button class="btn border-0 px-4 py-3 fw-600" onclick="Library.showTab('issue',this)">📤 Issue / Return</button>
            <button class="btn border-0 px-4 py-3 fw-600" onclick="Library.showTab('history',this)">📋 History</button>
          </div>
        </div>

        <!-- Books Tab -->
        <div id="lib-tab-books">
          <div class="card-body border-bottom">
            <div class="row g-3 align-items-end">
              <div class="col-md-3"><input type="text" id="lib-search" class="form-control" placeholder="🔍 Search book..." oninput="Library.renderBooks()"></div>
              <div class="col-md-3">
                <select id="lib-cat-filter" class="form-select" onchange="Library.renderBooks()">
                  <option value="">All Categories</option>
                  ${[...new Set(books.map(b=>b.category).filter(Boolean))].map(c=>`<option>${c}</option>`).join('')}
                </select>
              </div>
              <div class="col-auto"><button class="btn btn-primary" onclick="Library.openAddBook()">➕ Add Book</button></div>
            </div>
          </div>
          <div class="card-body p-0"><div class="table-container">
            <table class="table"><thead><tr><th>#</th><th>Book</th><th>Author</th><th>Category</th><th>ISBN</th><th>Total</th><th>Available</th><th>Actions</th></tr></thead>
            <tbody id="lib-books-tbody"></tbody></table>
          </div></div>
        </div>

        <!-- Issue Tab -->
        <div id="lib-tab-issue" style="display:none">
          <div class="card-body">
            <div class="row g-3 align-items-end">
              <div class="col-md-4">
                <label class="form-label">Select Book</label>
                <select id="lib-issue-book" class="form-select">
                  <option value="">Select Book</option>
                  ${books.filter(b=>b.available>0).map(b=>`<option value="${b.id}">${b.title} (Available: ${b.available})</option>`).join('')}
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Select Student / Teacher</label>
                <select id="lib-issue-person" class="form-select">
                  <option value="">Select Person</option>
                  <optgroup label="Students">${DB.get('students').map(s=>`<option value="s:${s.id}">👤 ${s.name} (${s.roll})</option>`).join('')}</optgroup>
                  <optgroup label="Teachers">${DB.get('teachers').map(t=>`<option value="t:${t.id}">👩‍🏫 ${t.name}</option>`).join('')}</optgroup>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label">Due Date</label>
                <input type="date" id="lib-issue-due" class="form-control" value="${new Date(Date.now()+14*864e5).toISOString().split('T')[0]}">
              </div>
              <div class="col-auto"><button class="btn btn-success" onclick="Library.issueBook()">📤 Issue Book</button></div>
            </div>
          </div>
          <!-- Currently Issued -->
          <div class="card-body p-0 border-top">
            <div style="padding:12px 20px;font-weight:700;font-size:14px">📋 Currently Issued Books</div>
            <div class="table-container">
              <table class="table"><thead><tr><th>Book</th><th>Issued To</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody id="lib-issued-tbody"></tbody></table>
            </div>
          </div>
        </div>

        <!-- History Tab -->
        <div id="lib-tab-history" style="display:none">
          <div class="card-body p-0"><div class="table-container">
            <table class="table"><thead><tr><th>Book</th><th>Issued To</th><th>Issue Date</th><th>Return Date</th><th>Fine (PKR)</th></tr></thead>
            <tbody id="lib-history-tbody"></tbody></table>
          </div></div>
        </div>
      </div>

      <!-- Add Book Modal -->
      <div class="modal fade" id="libBookModal" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">📚 Add Book</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-12"><label class="form-label">Book Title <span class="text-danger">*</span></label><input type="text" id="lib-title" class="form-control" placeholder="e.g. Mathematics Class 9"></div>
              <div class="col-md-6"><label class="form-label">Author</label><input type="text" id="lib-author" class="form-control" placeholder="Author name"></div>
              <div class="col-md-6"><label class="form-label">Category</label><input type="text" id="lib-category" class="form-control" placeholder="e.g. Science, Literature..."></div>
              <div class="col-md-6"><label class="form-label">ISBN</label><input type="text" id="lib-isbn" class="form-control" placeholder="ISBN number"></div>
              <div class="col-md-3"><label class="form-label">Total Copies</label><input type="number" id="lib-total" class="form-control" placeholder="5" min="1"></div>
              <div class="col-md-3"><label class="form-label">Shelf No</label><input type="text" id="lib-shelf" class="form-control" placeholder="A-1"></div>
            </div>
          </div>
          <div class="modal-footer">
            <input type="hidden" id="lib-edit-id">
            <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="Library.saveBook()">Save Book</button>
          </div>
        </div></div>
      </div>
    `;
    renderBooks();
    renderIssued();
    renderHistory();
  }

  function showTab(tab, btn) {
    ['books','issue','history'].forEach(t=>{
      const el = document.getElementById(`lib-tab-${t}`);
      if(el) el.style.display = t===tab?'block':'none';
    });
    document.querySelectorAll('#library-container .card-header button').forEach(b=>{
      b.style.borderBottom='none'; b.style.color='';
    });
    if(btn) { btn.style.borderBottom='3px solid var(--accent)'; btn.style.color='var(--accent)'; }
    if(tab==='issue') renderIssued();
    if(tab==='history') renderHistory();
  }

  function renderBooks() {
    const tbody = document.getElementById('lib-books-tbody');
    if (!tbody) return;
    const books = DB.get('library_books',[]);
    const search = document.getElementById('lib-search')?.value.toLowerCase()||'';
    const cat = document.getElementById('lib-cat-filter')?.value||'';
    let data = books;
    if (search) data = data.filter(b=>b.title?.toLowerCase().includes(search)||b.author?.toLowerCase().includes(search));
    if (cat) data = data.filter(b=>b.category===cat);
    if (!data.length) { tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af">Koi book nahi mili</td></tr>'; return; }
    tbody.innerHTML = data.map((b,i)=>`<tr>
      <td>${i+1}</td>
      <td style="font-weight:600">${b.title}</td>
      <td>${b.author||'-'}</td>
      <td>${b.category||'-'}</td>
      <td style="font-size:11px">${b.isbn||'-'}</td>
      <td>${b.total||0}</td>
      <td><span style="background:${b.available>0?'#dcfce7':'#fee2e2'};color:${b.available>0?'#16a34a':'#dc2626'};padding:2px 8px;border-radius:10px;font-weight:700">${b.available||0}</span></td>
      <td><button class="btn btn-xs btn-outline-primary" onclick="Library.editBook('${b.id}')">✏️</button>
      <button class="btn btn-xs btn-outline-danger" onclick="Library.deleteBook('${b.id}')">🗑️</button></td>
    </tr>`).join('');
  }

  function renderIssued() {
    const tbody = document.getElementById('lib-issued-tbody');
    if (!tbody) return;
    const issues = DB.get('library_issues',[]).filter(i=>!i.returnDate);
    const books = DB.get('library_books',[]);
    const students = DB.get('students');
    const teachers = DB.get('teachers');
    if (!issues.length) { tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">Koi issued book nahi hai</td></tr>'; return; }
    tbody.innerHTML = issues.map(iss=>{
      const book = books.find(b=>b.id===iss.bookId);
      let person = '';
      if (iss.personType==='s') { const s=students.find(s=>s.id===iss.personId); person=s?`👤 ${s.name}`:'Unknown'; }
      else { const t=teachers.find(t=>t.id===iss.personId); person=t?`👩‍🏫 ${t.name}`:'Unknown'; }
      const overdue = new Date(iss.dueDate)<new Date();
      return `<tr>
        <td style="font-weight:600">${book?.title||'Unknown'}</td>
        <td>${person}</td>
        <td>${Utils.fmtDate(iss.issueDate)}</td>
        <td style="color:${overdue?'#dc2626':'inherit'}">${Utils.fmtDate(iss.dueDate)}${overdue?' ⚠️':''}</td>
        <td><span style="background:${overdue?'#fee2e2':'#fef9c3'};color:${overdue?'#dc2626':'#d97706'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${overdue?'OVERDUE':'ISSUED'}</span></td>
        <td><button class="btn btn-xs btn-success" onclick="Library.returnBook('${iss.id}')">↩️ Return</button></td>
      </tr>`;
    }).join('');
  }

  function renderHistory() {
    const tbody = document.getElementById('lib-history-tbody');
    if (!tbody) return;
    const issues = DB.get('library_issues',[]).filter(i=>i.returnDate);
    const books = DB.get('library_books',[]);
    const students = DB.get('students');
    const teachers = DB.get('teachers');
    if (!issues.length) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af">Koi history nahi mili</td></tr>'; return; }
    tbody.innerHTML = issues.reverse().map(iss=>{
      const book = books.find(b=>b.id===iss.bookId);
      let person = '';
      if (iss.personType==='s') { const s=students.find(s=>s.id===iss.personId); person=s?s.name:'Unknown'; }
      else { const t=teachers.find(t=>t.id===iss.personId); person=t?t.name:'Unknown'; }
      return `<tr>
        <td>${book?.title||'Unknown'}</td>
        <td>${person}</td>
        <td>${Utils.fmtDate(iss.issueDate)}</td>
        <td>${Utils.fmtDate(iss.returnDate)}</td>
        <td style="color:${iss.fine>0?'#dc2626':'#16a34a'}">${iss.fine>0?'PKR '+iss.fine:'No Fine'}</td>
      </tr>`;
    }).join('');
  }

  function openAddBook() {
    document.getElementById('lib-edit-id').value='';
    ['lib-title','lib-author','lib-category','lib-isbn','lib-total','lib-shelf'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    new bootstrap.Modal(document.getElementById('libBookModal')).show();
  }

  function editBook(id) {
    const b = DB.get('library_books',[]).find(b=>b.id===id);
    if (!b) return;
    document.getElementById('lib-edit-id').value=id;
    document.getElementById('lib-title').value=b.title||'';
    document.getElementById('lib-author').value=b.author||'';
    document.getElementById('lib-category').value=b.category||'';
    document.getElementById('lib-isbn').value=b.isbn||'';
    document.getElementById('lib-total').value=b.total||'';
    document.getElementById('lib-shelf').value=b.shelf||'';
    new bootstrap.Modal(document.getElementById('libBookModal')).show();
  }

  function saveBook() {
    const title = document.getElementById('lib-title').value.trim();
    if (!title) { toast('Book title lazmi hai!','error'); return; }
    const total = +document.getElementById('lib-total').value||1;
    const editId = document.getElementById('lib-edit-id').value;
    const books = DB.get('library_books',[]);
    const record = {
      id: editId||Utils.genId(),
      title, total,
      author: document.getElementById('lib-author').value,
      category: document.getElementById('lib-category').value,
      isbn: document.getElementById('lib-isbn').value,
      shelf: document.getElementById('lib-shelf').value,
      available: editId ? (books.find(b=>b.id===editId)?.available??total) : total,
    };
    if (editId) { const i=books.findIndex(b=>b.id===editId); books[i]=record; }
    else books.push(record);
    DB.set('library_books', books);
    bootstrap.Modal.getInstance(document.getElementById('libBookModal'))?.hide();
    ActivityLog.log('Book Added/Updated', title, 'Library');
    toast('Book save ho gayi!');
    render();
  }

  function deleteBook(id) {
    confirmDialog('Yeh book delete karein?', ()=>{
      const books = DB.get('library_books',[]).filter(b=>b.id!==id);
      DB.set('library_books', books);
      ActivityLog.log('Book Deleted', `ID: ${id}`, 'Library');
      toast('Book delete ho gayi!');
      render();
    });
  }

  function issueBook() {
    const bookId = document.getElementById('lib-issue-book').value;
    const personVal = document.getElementById('lib-issue-person').value;
    const dueDate = document.getElementById('lib-issue-due').value;
    if (!bookId||!personVal||!dueDate) { toast('Sab fields fill karein!','error'); return; }
    const [pType, pId] = personVal.split(':');
    const books = DB.get('library_books',[]);
    const bi = books.findIndex(b=>b.id===bookId);
    if (bi===-1||books[bi].available<=0) { toast('Yeh book available nahi hai!','error'); return; }
    books[bi].available--;
    DB.set('library_books', books);
    const issues = DB.get('library_issues',[]);
    issues.push({ id:Utils.genId(), bookId, personType:pType, personId:pId, issueDate:Utils.todayStr(), dueDate, returnDate:null, fine:0 });
    DB.set('library_issues', issues);
    ActivityLog.log('Book Issued', `Book: ${books[bi].title}`, 'Library');
    toast('Book issue ho gayi!');
    render();
  }

  function returnBook(issueId) {
    const issues = DB.get('library_issues',[]);
    const i = issues.findIndex(iss=>iss.id===issueId);
    if (i===-1) return;
    const iss = issues[i];
    // Calculate fine: PKR 5 per day overdue
    const dueDate = new Date(iss.dueDate);
    const today = new Date();
    const diffDays = Math.max(0, Math.floor((today-dueDate)/864e5));
    const fine = diffDays * 5;
    issues[i].returnDate = Utils.todayStr();
    issues[i].fine = fine;
    DB.set('library_issues', issues);
    // Return book count
    const books = DB.get('library_books',[]);
    const bi = books.findIndex(b=>b.id===iss.bookId);
    if (bi>-1) books[bi].available++;
    DB.set('library_books', books);
    ActivityLog.log('Book Returned', `Fine: PKR ${fine}`, 'Library');
    toast(fine>0?`Book return ho gayi! Fine: PKR ${fine}`:'Book return ho gayi! No fine.');
    render();
  }

  return { render, showTab, renderBooks, renderIssued, renderHistory, openAddBook, editBook, saveBook, deleteBook, issueBook, returnBook };
})();

// ================================================================
// 4. 📢 PARENT-TEACHER MEETING (PTM) SCHEDULER
// ================================================================
const PTM = (() => {

  function render() {
    const container = document.getElementById('ptm-container');
    if (!container) return;
    const meetings = DB.get('ptm_meetings',[]);
    const upcoming = meetings.filter(m=>m.date>=Utils.todayStr());
    const past = meetings.filter(m=>m.date<Utils.todayStr());

    container.innerHTML = `
      <!-- Schedule New -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div class="card-title">📢 Schedule PTM</div>
          <button class="btn btn-primary btn-sm" onclick="PTM.openAdd()">➕ Schedule Meeting</button>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <div style="background:var(--accent-light);padding:16px;border-radius:var(--radius-sm)">
                <div style="font-weight:700;color:var(--accent);margin-bottom:8px">📅 Upcoming Meetings (${upcoming.length})</div>
                ${upcoming.length ? upcoming.map(m=>`
                  <div style="background:#fff;padding:10px;border-radius:8px;margin-bottom:8px;border-left:3px solid var(--accent)">
                    <div style="font-weight:600;font-size:13px">${m.title}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:3px">📅 ${Utils.fmtDate(m.date)} • ⏰ ${m.time} • 🏫 ${m.venue||'School'}</div>
                    <div style="font-size:11px;color:#9ca3af">Class: ${m.cls||'All Classes'}</div>
                    <div class="d-flex gap-2 mt-2">
                      <button class="btn btn-xs btn-outline-primary" onclick="PTM.edit('${m.id}')">✏️ Edit</button>
                      <button class="btn btn-xs btn-outline-danger" onclick="PTM.delete('${m.id}')">🗑️</button>
                    </div>
                  </div>`).join('') : '<div style="color:#9ca3af;font-size:13px">Koi upcoming meeting nahi</div>'}
              </div>
            </div>
            <div class="col-md-6">
              <div style="background:var(--surface-2);padding:16px;border-radius:var(--radius-sm)">
                <div style="font-weight:700;margin-bottom:8px">📋 Past Meetings (${past.length})</div>
                ${past.length ? past.slice(-5).reverse().map(m=>`
                  <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                    <div style="font-weight:600">${m.title}</div>
                    <div style="color:#9ca3af;font-size:12px">${Utils.fmtDate(m.date)} • ${m.cls||'All Classes'}</div>
                  </div>`).join('') : '<div style="color:#9ca3af;font-size:13px">Koi past meeting nahi</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- All Meetings Table -->
      <div class="card"><div class="card-header"><div class="card-title">📋 All PTM Meetings</div></div>
        <div class="card-body p-0"><div class="table-container">
          <table class="table"><thead><tr><th>#</th><th>Title</th><th>Date</th><th>Time</th><th>Class</th><th>Venue</th><th>Agenda</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${renderRows(meetings)}</tbody></table>
        </div></div>
      </div>

      <!-- Modal -->
      <div class="modal fade" id="ptmModal" tabindex="-1">
        <div class="modal-dialog modal-lg"><div class="modal-content">
          <div class="modal-header"><h5 class="modal-title" id="ptm-modal-title">Schedule PTM</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-12"><label class="form-label">Meeting Title <span class="text-danger">*</span></label><input type="text" id="ptm-title" class="form-control" placeholder="e.g. Annual PTM 2025"></div>
              <div class="col-md-4"><label class="form-label">Date <span class="text-danger">*</span></label><input type="date" id="ptm-date" class="form-control"></div>
              <div class="col-md-4"><label class="form-label">Time</label><input type="time" id="ptm-time" class="form-control" value="10:00"></div>
              <div class="col-md-4"><label class="form-label">Duration</label>
                <select id="ptm-duration" class="form-select">
                  <option value="1 hour">1 Hour</option><option value="2 hours">2 Hours</option><option value="Half day">Half Day</option><option value="Full day">Full Day</option>
                </select>
              </div>
              <div class="col-md-6"><label class="form-label">Class</label>
                <select id="ptm-cls" class="form-select">
                  <option value="">All Classes</option>
                  ${DB.get('classes').map(c=>`<option>${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-6"><label class="form-label">Venue</label><input type="text" id="ptm-venue" class="form-control" placeholder="e.g. School Hall, Classroom 5A" value="School Hall"></div>
              <div class="col-12"><label class="form-label">Agenda / Description</label><textarea id="ptm-agenda" class="form-control" rows="3" placeholder="Meeting ke topics aur agenda likhein..."></textarea></div>
              <div class="col-12"><label class="form-label">Special Instructions (Parents ke liye)</label><textarea id="ptm-instructions" class="form-control" rows="2" placeholder="e.g. Progress reports saath laye aayein..."></textarea></div>
            </div>
          </div>
          <div class="modal-footer">
            <input type="hidden" id="ptm-edit-id">
            <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="PTM.save()">Schedule Meeting</button>
          </div>
        </div></div>
      </div>
    `;
  }

  function renderRows(meetings) {
    if (!meetings.length) return '<tr><td colspan="9" style="text-align:center;padding:30px;color:#9ca3af">Koi PTM schedule nahi</td></tr>';
    return [...meetings].reverse().map((m,i)=>{
      const isPast = m.date < Utils.todayStr();
      const status = isPast ? '<span style="background:#f0f0f0;color:#6b7280;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">PAST</span>' :
        '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">UPCOMING</span>';
      return `<tr>
        <td>${i+1}</td>
        <td style="font-weight:600">${m.title}</td>
        <td>${Utils.fmtDate(m.date)}</td>
        <td>${m.time||'-'}</td>
        <td>${m.cls||'All'}</td>
        <td>${m.venue||'-'}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#6b7280">${m.agenda||'-'}</td>
        <td>${status}</td>
        <td><div class="d-flex gap-1">
          <button class="btn btn-xs btn-outline-primary" onclick="PTM.edit('${m.id}')">✏️</button>
          <button class="btn btn-xs btn-outline-danger" onclick="PTM.delete('${m.id}')">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function openAdd() {
    document.getElementById('ptm-edit-id').value='';
    document.getElementById('ptm-modal-title').textContent='Schedule PTM Meeting';
    ['ptm-title','ptm-agenda','ptm-instructions'].forEach(id=>document.getElementById(id) && (document.getElementById(id).value=''));
    document.getElementById('ptm-date').value='';
    document.getElementById('ptm-time').value='10:00';
    document.getElementById('ptm-cls').value='';
    document.getElementById('ptm-venue').value='School Hall';
    new bootstrap.Modal(document.getElementById('ptmModal')).show();
  }

  function edit(id) {
    const m = DB.get('ptm_meetings',[]).find(m=>m.id===id);
    if (!m) return;
    document.getElementById('ptm-edit-id').value=id;
    document.getElementById('ptm-modal-title').textContent='Edit PTM Meeting';
    document.getElementById('ptm-title').value=m.title||'';
    document.getElementById('ptm-date').value=m.date||'';
    document.getElementById('ptm-time').value=m.time||'10:00';
    document.getElementById('ptm-cls').value=m.cls||'';
    document.getElementById('ptm-venue').value=m.venue||'';
    document.getElementById('ptm-agenda').value=m.agenda||'';
    document.getElementById('ptm-instructions').value=m.instructions||'';
    new bootstrap.Modal(document.getElementById('ptmModal')).show();
  }

  function save() {
    const title = document.getElementById('ptm-title').value.trim();
    const date = document.getElementById('ptm-date').value;
    if (!title||!date) { toast('Title aur date lazmi hain!','error'); return; }
    const meetings = DB.get('ptm_meetings',[]);
    const editId = document.getElementById('ptm-edit-id').value;
    const record = {
      id: editId||Utils.genId(), title, date,
      time: document.getElementById('ptm-time').value,
      cls: document.getElementById('ptm-cls').value,
      venue: document.getElementById('ptm-venue').value,
      agenda: document.getElementById('ptm-agenda').value,
      instructions: document.getElementById('ptm-instructions').value,
      duration: document.getElementById('ptm-duration').value,
    };
    if (editId) { const i=meetings.findIndex(m=>m.id===editId); meetings[i]=record; }
    else meetings.push(record);
    DB.set('ptm_meetings', meetings);
    bootstrap.Modal.getInstance(document.getElementById('ptmModal'))?.hide();
    ActivityLog.log('PTM Scheduled', `${title} on ${date}`, 'PTM');
    toast('Meeting schedule ho gayi!');
    render();
  }

  function deleteM(id) {
    confirmDialog('Yeh PTM delete karein?', ()=>{
      DB.set('ptm_meetings', DB.get('ptm_meetings',[]).filter(m=>m.id!==id));
      ActivityLog.log('PTM Deleted', `ID: ${id}`, 'PTM');
      toast('Meeting delete ho gayi!');
      render();
    });
  }

  return { render, openAdd, edit, save, delete: deleteM };
})();

// ================================================================
// 5. 💬 COMPLAINT & FEEDBACK SYSTEM
// ================================================================
const Complaints = (() => {

  function render() {
    const container = document.getElementById('complaints-container');
    if (!container) return;
    const complaints = DB.get('complaints',[]);
    const role = APP.currentPortal;
    const isAdmin = role==='admin';
    const pending = complaints.filter(c=>c.status==='pending').length;
    const resolved = complaints.filter(c=>c.status==='resolved').length;

    container.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="stat-card orange"><div class="stat-icon">📨</div><div><div class="stat-value">${complaints.length}</div><div class="stat-label">Total Complaints</div></div></div></div>
        <div class="col-md-4"><div class="stat-card red"><div class="stat-icon">⏳</div><div><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div></div></div>
        <div class="col-md-4"><div class="stat-card green"><div class="stat-icon">✅</div><div><div class="stat-value">${resolved}</div><div class="stat-label">Resolved</div></div></div></div>
      </div>

      <!-- Submit Complaint -->
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">📝 Submit Complaint / Feedback</div></div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Type</label>
              <select id="cmp-type" class="form-select">
                <option value="complaint">Complaint</option>
                <option value="feedback">Feedback</option>
                <option value="suggestion">Suggestion</option>
                <option value="appreciation">Appreciation</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Category</label>
              <select id="cmp-category" class="form-select">
                <option value="teacher">Teacher Related</option>
                <option value="academic">Academic</option>
                <option value="fees">Fees / Finance</option>
                <option value="facility">School Facility</option>
                <option value="transport">Transport</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Priority</label>
              <select id="cmp-priority" class="form-select">
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label">Subject <span class="text-danger">*</span></label>
              <input type="text" id="cmp-subject" class="form-control" placeholder="Brief subject of your complaint/feedback">
            </div>
            <div class="col-12">
              <label class="form-label">Description <span class="text-danger">*</span></label>
              <textarea id="cmp-description" class="form-control" rows="4" placeholder="Detail mein likhein..."></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Your Name (Optional for Anonymous)</label>
              <input type="text" id="cmp-name" class="form-control" placeholder="Leave blank for anonymous" value="${APP.currentUser?.name||''}">
            </div>
            <div class="col-auto">
              <button class="btn btn-primary" onclick="Complaints.submit()">📤 Submit</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Complaints List -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div class="card-title">📋 ${isAdmin?'All Complaints & Feedback':'My Submissions'}</div>
          <div class="d-flex gap-2">
            <select id="cmp-filter-status" class="form-select form-select-sm" onchange="Complaints.render()">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
        <div class="card-body p-0"><div class="table-container">
          <table class="table"><thead><tr>
            <th>#</th><th>Type</th><th>Subject</th><th>Category</th><th>From</th><th>Date</th><th>Priority</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody id="complaints-tbody"></tbody></table>
        </div></div>
      </div>
    `;
    renderRows();
  }

  function renderRows() {
    const tbody = document.getElementById('complaints-tbody');
    if (!tbody) return;
    let data = DB.get('complaints',[]);
    const role = APP.currentPortal;
    const filterStatus = document.getElementById('cmp-filter-status')?.value||'';
    if (role!=='admin') {
      const uid = APP.currentUser?.id;
      data = data.filter(c=>c.userId===uid||c.name===APP.currentUser?.name);
    }
    if (filterStatus) data = data.filter(c=>c.status===filterStatus);
    data = [...data].reverse();

    if (!data.length) { tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:#9ca3af">Koi complaint nahi mili</td></tr>'; return; }

    const typeColors = { complaint:'#fee2e2:#dc2626', feedback:'#dbeafe:#1d4ed8', suggestion:'#fef9c3:#d97706', appreciation:'#dcfce7:#16a34a' };
    const statusColors = { pending:'#fef9c3:#d97706', 'in-progress':'#dbeafe:#1d4ed8', resolved:'#dcfce7:#16a34a' };
    const priorityColors = { urgent:'#fee2e2:#dc2626', normal:'#f0f0f0:#6b7280', low:'#f0fdf4:#16a34a' };
    const isAdmin = role==='admin';

    tbody.innerHTML = data.map((c,i)=>{
      const [tBg,tClr] = (typeColors[c.type]||'#f0f0f0:#374151').split(':');
      const [sBg,sClr] = (statusColors[c.status]||'#f0f0f0:#6b7280').split(':');
      const [pBg,pClr] = (priorityColors[c.priority]||'#f0f0f0:#6b7280').split(':');
      return `<tr>
        <td>${i+1}</td>
        <td><span style="background:${tBg};color:${tClr};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;text-transform:uppercase">${c.type}</span></td>
        <td style="font-weight:600;max-width:180px">${c.subject}</td>
        <td style="font-size:12px;color:#6b7280">${c.category||'-'}</td>
        <td style="font-size:12px">${c.name||'Anonymous'}</td>
        <td style="font-size:12px">${Utils.fmtDate(c.date)}</td>
        <td><span style="background:${pBg};color:${pClr};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${c.priority?.toUpperCase()||'NORMAL'}</span></td>
        <td><span style="background:${sBg};color:${sClr};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${c.status?.toUpperCase().replace('-',' ')||'PENDING'}</span></td>
        <td><div class="d-flex gap-1">
          ${isAdmin?`
            <button class="btn btn-xs btn-outline-success" onclick="Complaints.updateStatus('${c.id}','resolved')">✅</button>
            <button class="btn btn-xs btn-outline-primary" onclick="Complaints.updateStatus('${c.id}','in-progress')">🔄</button>
          `:''}
          <button class="btn btn-xs btn-outline-secondary" onclick="Complaints.view('${c.id}')">👁️</button>
          ${isAdmin?`<button class="btn btn-xs btn-outline-danger" onclick="Complaints.delete('${c.id}')">🗑️</button>`:''}
        </div></td>
      </tr>`;
    }).join('');
  }

  function submit() {
    const subject = document.getElementById('cmp-subject').value.trim();
    const description = document.getElementById('cmp-description').value.trim();
    if (!subject||!description) { toast('Subject aur description lazmi hain!','error'); return; }
    const record = {
      id: Utils.genId(),
      type: document.getElementById('cmp-type').value,
      category: document.getElementById('cmp-category').value,
      priority: document.getElementById('cmp-priority').value,
      subject, description,
      name: document.getElementById('cmp-name').value.trim()||'Anonymous',
      userId: APP.currentUser?.id,
      date: Utils.todayStr(),
      status: 'pending',
    };
    const complaints = DB.get('complaints',[]);
    complaints.push(record);
    DB.set('complaints', complaints);
    // Clear form
    ['cmp-subject','cmp-description'].forEach(id=>document.getElementById(id) && (document.getElementById(id).value=''));
    ActivityLog.log('Complaint Submitted', subject, 'Complaints');
    toast('Aapki complaint/feedback submit ho gayi!');
    renderRows();
  }

  function updateStatus(id, status) {
    const complaints = DB.get('complaints',[]);
    const i = complaints.findIndex(c=>c.id===id);
    if (i>-1) { complaints[i].status=status; complaints[i].resolvedDate=Utils.todayStr(); }
    DB.set('complaints', complaints);
    ActivityLog.log('Complaint Status Updated', `Status: ${status}`, 'Complaints');
    toast(`Status update ho gaya: ${status}`);
    renderRows();
  }

  function view(id) {
    const c = DB.get('complaints',[]).find(c=>c.id===id);
    if (!c) return;
    // FIX: alert() hata kar proper modal use karo
    const typeColors = { complaint:'#fee2e2:#dc2626', feedback:'#dbeafe:#1d4ed8', suggestion:'#fef9c3:#d97706', appreciation:'#dcfce7:#16a34a' };
    const statusColors = { pending:'#fef9c3:#d97706', 'in-progress':'#dbeafe:#1d4ed8', resolved:'#dcfce7:#16a34a' };
    const [tBg,tClr] = (typeColors[c.type]||'#f0f0f0:#374151').split(':');
    const [sBg,sClr] = (statusColors[c.status]||'#f0f0f0:#6b7280').split(':');
    // Reuse confirmModal for viewing (change its content temporarily)
    document.getElementById('confirmMsg').innerHTML = `
      <div style="text-align:left">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <span style="background:${tBg};color:${tClr};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;text-transform:uppercase">${c.type}</span>
          <span style="background:${sBg};color:${sClr};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700">${(c.status||'').toUpperCase().replace('-',' ')}</span>
          <span style="background:#f0f0f0;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700">${(c.priority||'').toUpperCase()}</span>
        </div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">${c.subject}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">📁 Category: <strong>${c.category||'-'}</strong> &nbsp;|&nbsp; 👤 From: <strong>${c.name||'Anonymous'}</strong> &nbsp;|&nbsp; 📅 ${Utils.fmtDate(c.date)}</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:10px;font-size:13px;color:#374151;line-height:1.6">${c.description||'-'}</div>
      </div>`;
    document.getElementById('confirmOk').textContent = 'Close';
    document.getElementById('confirmOk').className = 'btn btn-secondary';
    const m = new bootstrap.Modal(document.getElementById('confirmModal'));
    document.getElementById('confirmOk').onclick = () => {
      m.hide();
      // Restore confirmOk to original
      document.getElementById('confirmOk').className = 'btn btn-danger';
    };
    m.show();
  }

  function deleteC(id) {
    confirmDialog('Yeh complaint delete karein?', ()=>{
      DB.set('complaints', DB.get('complaints',[]).filter(c=>c.id!==id));
      ActivityLog.log('Complaint Deleted', `ID: ${id}`, 'Complaints');
      toast('Delete ho gayi!');
      renderRows();
    });
  }

  return { render, renderRows, submit, updateStatus, view, delete: deleteC };
})();

// ================================================================
// 6. 🔒 ACTIVITY LOG / AUDIT TRAIL
// ================================================================
const AuditLog = (() => {

  function render() {
    const container = document.getElementById('audit-log-container');
    if (!container) return;
    const logs = DB.get('activity_logs',[]);
    const modules = [...new Set(logs.map(l=>l.module))];

    container.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="stat-card blue"><div class="stat-icon">📋</div><div><div class="stat-value">${logs.length}</div><div class="stat-label">Total Activities</div></div></div></div>
        <div class="col-md-4"><div class="stat-card green"><div class="stat-icon">👥</div><div><div class="stat-value">${[...new Set(logs.map(l=>l.user))].length}</div><div class="stat-label">Active Users</div></div></div></div>
        <div class="col-md-4"><div class="stat-card orange"><div class="stat-icon">📅</div><div><div class="stat-value">${logs.filter(l=>l.timestamp?.startsWith(Utils.todayStr())).length}</div><div class="stat-label">Today's Activities</div></div></div></div>
      </div>

      <!-- Filters -->
      <div class="card mb-3"><div class="card-body py-3">
        <div class="row g-2">
          <div class="col-md-3"><input type="text" id="al-search" class="form-control" placeholder="🔍 Search..." oninput="AuditLog.render()"></div>
          <div class="col-md-3">
            <select id="al-module" class="form-select" onchange="AuditLog.render()">
              <option value="">All Modules</option>
              ${modules.map(m=>`<option>${m}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-3">
            <select id="al-role" class="form-select" onchange="AuditLog.render()">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div class="col-auto">
            <button class="btn btn-outline-danger btn-sm" onclick="AuditLog.clearLogs()">🗑️ Clear Logs</button>
          </div>
        </div>
      </div></div>

      <!-- Log Table -->
      <div class="card"><div class="card-body p-0"><div class="table-container">
        <table class="table"><thead><tr><th>#</th><th>Action</th><th>Details</th><th>Module</th><th>User</th><th>Role</th><th>Time</th></tr></thead>
        <tbody id="al-tbody"></tbody></table>
      </div></div></div>
    `;
    renderRows();
  }

  function renderRows() {
    const tbody = document.getElementById('al-tbody');
    if (!tbody) return;
    let data = DB.get('activity_logs',[]);
    const search = document.getElementById('al-search')?.value.toLowerCase()||'';
    const module = document.getElementById('al-module')?.value||'';
    const role = document.getElementById('al-role')?.value||'';

    if (search) data = data.filter(l=>l.action?.toLowerCase().includes(search)||l.details?.toLowerCase().includes(search)||l.user?.toLowerCase().includes(search));
    if (module) data = data.filter(l=>l.module===module);
    if (role) data = data.filter(l=>l.role===role);

    if (!data.length) { tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px;color:#9ca3af">Koi activity nahi mili</td></tr>'; return; }

    const roleColors = { admin:'#fee2e2:#dc2626', teacher:'#fef9c3:#d97706', student:'#dbeafe:#1d4ed8', system:'#f0f0f0:#6b7280' };
    tbody.innerHTML = data.map((l,i)=>{
      const [bg,clr] = (roleColors[l.role]||'#f0f0f0:#6b7280').split(':');
      const dt = l.timestamp ? new Date(l.timestamp) : null;
      const timeStr = dt ? `${dt.toLocaleDateString('en-PK')} ${dt.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}` : '-';
      return `<tr>
        <td style="font-size:12px;color:#9ca3af">${i+1}</td>
        <td style="font-weight:600;font-size:13px">${l.action||'-'}</td>
        <td style="font-size:12px;color:#6b7280;max-width:200px">${l.details||'-'}</td>
        <td><span style="background:var(--accent-light);color:var(--accent);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${l.module||'System'}</span></td>
        <td style="font-size:13px;font-weight:600">${l.user||'System'}</td>
        <td><span style="background:${bg};color:${clr};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;text-transform:uppercase">${l.role||'system'}</span></td>
        <td style="font-size:11px;color:#9ca3af;white-space:nowrap">${timeStr}</td>
      </tr>`;
    }).join('');
  }

  function clearLogs() {
    confirmDialog('Saare activity logs clear karein? Yeh action undo nahi ho sakta!', ()=>{
      DB.set('activity_logs',[]);
      toast('Logs clear ho gaye!');
      render();
    }, 'Clear All');
  }

  return { render, renderRows, clearLogs };
})();

// ================================================================
// 7. 📋 STAFF ATTENDANCE & LEAVE MANAGEMENT
// ================================================================
const StaffAttendance = (() => {

  function render() {
    const container = document.getElementById('staff-attendance-container');
    if (!container) return;
    const teachers = DB.get('teachers');
    const staffAtt = DB.get('staff_attendance',[]);
    const leaves = DB.get('staff_leaves',[]);
    const today = Utils.todayStr();
    const todayAtt = staffAtt.filter(a=>a.date===today);
    const pendingLeaves = leaves.filter(l=>l.status==='pending').length;

    container.innerHTML = `
      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-md-3"><div class="stat-card green"><div class="stat-icon">✅</div><div><div class="stat-value">${todayAtt.filter(a=>a.status==='present').length}</div><div class="stat-label">Present Today</div></div></div></div>
        <div class="col-md-3"><div class="stat-card red"><div class="stat-icon">❌</div><div><div class="stat-value">${todayAtt.filter(a=>a.status==='absent').length}</div><div class="stat-label">Absent Today</div></div></div></div>
        <div class="col-md-3"><div class="stat-card orange"><div class="stat-icon">📝</div><div><div class="stat-value">${pendingLeaves}</div><div class="stat-label">Pending Leaves</div></div></div></div>
        <div class="col-md-3"><div class="stat-card blue"><div class="stat-icon">👩‍🏫</div><div><div class="stat-value">${teachers.length}</div><div class="stat-label">Total Staff</div></div></div></div>
      </div>

      <!-- Tabs -->
      <div class="card">
        <div class="card-header" style="padding:0">
          <div class="d-flex">
            <button class="btn border-0 px-4 py-3 fw-600" style="border-radius:0;border-bottom:3px solid var(--accent);color:var(--accent)" onclick="StaffAttendance.showTab('mark',this)">✅ Mark Attendance</button>
            <button class="btn border-0 px-4 py-3 fw-600" onclick="StaffAttendance.showTab('leaves',this)">📝 Leave Requests</button>
            <button class="btn border-0 px-4 py-3 fw-600" onclick="StaffAttendance.showTab('history',this)">📋 History</button>
          </div>
        </div>

        <!-- Mark Attendance Tab -->
        <div id="sa-tab-mark">
          <div class="card-body border-bottom">
            <div class="row g-3 align-items-end">
              <div class="col-md-3">
                <label class="form-label">Date</label>
                <input type="date" id="sa-date" class="form-control" value="${today}">
              </div>
              <div class="col-auto">
                <button class="btn btn-primary" onclick="StaffAttendance.loadForMark()">Load Staff</button>
                <button class="btn btn-success ms-2" onclick="StaffAttendance.saveAttendance()">💾 Save</button>
              </div>
            </div>
          </div>
          <div class="card-body p-0">
            <div id="sa-mark-list">
              <div style="padding:30px;text-align:center;color:#9ca3af">Date select kar ke "Load Staff" click karein</div>
            </div>
          </div>
        </div>

        <!-- Leave Requests Tab -->
        <div id="sa-tab-leaves" style="display:none">
          <div class="card-body border-bottom">
            <div style="font-weight:700;margin-bottom:12px">📝 Apply for Leave</div>
            <div class="row g-3 align-items-end">
              <div class="col-md-3">
                <label class="form-label">Teacher</label>
                <select id="lv-teacher" class="form-select">
                  <option value="">Select Teacher</option>
                  ${teachers.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label">From Date</label>
                <input type="date" id="lv-from" class="form-control" value="${today}">
              </div>
              <div class="col-md-2">
                <label class="form-label">To Date</label>
                <input type="date" id="lv-to" class="form-control" value="${today}">
              </div>
              <div class="col-md-2">
                <label class="form-label">Type</label>
                <select id="lv-type" class="form-select">
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">Reason</label>
                <input type="text" id="lv-reason" class="form-control" placeholder="Brief reason">
              </div>
              <div class="col-auto">
                <button class="btn btn-primary" onclick="StaffAttendance.applyLeave()">Apply Leave</button>
              </div>
            </div>
          </div>
          <div class="card-body p-0 border-top">
            <div class="table-container">
              <table class="table"><thead><tr><th>Teacher</th><th>From</th><th>To</th><th>Days</th><th>Type</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody id="lv-tbody"></tbody></table>
            </div>
          </div>
        </div>

        <!-- History Tab -->
        <div id="sa-tab-history" style="display:none">
          <div class="card-body border-bottom">
            <div class="row g-2">
              <div class="col-md-3">
                <select id="sa-hist-teacher" class="form-select" onchange="StaffAttendance.renderHistory()">
                  <option value="">All Teachers</option>
                  ${teachers.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2"><input type="month" id="sa-hist-month" class="form-control" value="${today.slice(0,7)}" oninput="StaffAttendance.renderHistory()"></div>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-container">
              <table class="table"><thead><tr><th>Date</th><th>Teacher</th><th>Status</th><th>Time In</th><th>Notes</th></tr></thead>
              <tbody id="sa-history-tbody"></tbody></table>
            </div>
          </div>
        </div>
      </div>
    `;
    renderLeaves();
    renderHistory();
  }

  function showTab(tab, btn) {
    ['mark','leaves','history'].forEach(t=>{
      const el=document.getElementById(`sa-tab-${t}`);
      if(el) el.style.display=t===tab?'block':'none';
    });
    document.querySelectorAll('#staff-attendance-container .card-header button').forEach(b=>{
      b.style.borderBottom='none'; b.style.color='';
    });
    if(btn){ btn.style.borderBottom='3px solid var(--accent)'; btn.style.color='var(--accent)'; }
    if(tab==='leaves') renderLeaves();
    if(tab==='history') renderHistory();
  }

  function loadForMark() {
    const date = document.getElementById('sa-date').value;
    if (!date) { toast('Date select karein!','error'); return; }
    const teachers = DB.get('teachers');
    const existing = DB.get('staff_attendance',[]).filter(a=>a.date===date);
    const list = document.getElementById('sa-mark-list');
    if (!teachers.length) { list.innerHTML='<div style="padding:20px;color:#9ca3af;text-align:center">Koi teacher nahi hai</div>'; return; }
    list.innerHTML = `<div style="padding:12px 20px;background:var(--surface-2);font-size:12px;font-weight:600;color:var(--text-muted)">Staff for ${Utils.fmtDate(date)}</div>` +
      teachers.map(t=>{
        const att = existing.find(a=>a.teacherId===t.id);
        return `<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)">
          <div style="flex:1;font-weight:600">${t.name}</div>
          <div style="font-size:12px;color:#9ca3af">${t.subject||''}</div>
          <div class="d-flex gap-2">
            <label style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px">
              <input type="radio" name="sa-${t.id}" value="present" ${att?.status==='present'?'checked':''}>
              <span style="color:#16a34a;font-weight:600">Present</span>
            </label>
            <label style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px">
              <input type="radio" name="sa-${t.id}" value="absent" ${att?.status==='absent'?'checked':''}>
              <span style="color:#dc2626;font-weight:600">Absent</span>
            </label>
            <label style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px">
              <input type="radio" name="sa-${t.id}" value="late" ${att?.status==='late'?'checked':''}>
              <span style="color:#d97706;font-weight:600">Late</span>
            </label>
            <label style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px">
              <input type="radio" name="sa-${t.id}" value="leave" ${att?.status==='leave'?'checked':''}>
              <span style="color:#7c3aed;font-weight:600">On Leave</span>
            </label>
          </div>
        </div>`;
      }).join('');
  }

  function saveAttendance() {
    const date = document.getElementById('sa-date').value;
    if (!date) { toast('Date select karein!','error'); return; }
    const teachers = DB.get('teachers');
    let staffAtt = DB.get('staff_attendance',[]).filter(a=>a.date!==date);
    let saved = 0;
    teachers.forEach(t=>{
      const sel = document.querySelector(`input[name="sa-${t.id}"]:checked`);
      if (sel) {
        staffAtt.push({ id:Utils.genId(), teacherId:t.id, date, status:sel.value });
        saved++;
      }
    });
    DB.set('staff_attendance', staffAtt);
    ActivityLog.log('Staff Attendance Saved', `Date: ${date}, ${saved} records`, 'Staff Attendance');
    toast(`${saved} staff attendance records save ho gaye!`);
    renderHistory();
  }

  function applyLeave() {
    const teacherId = document.getElementById('lv-teacher').value;
    const from = document.getElementById('lv-from').value;
    const to = document.getElementById('lv-to').value;
    const type = document.getElementById('lv-type').value;
    const reason = document.getElementById('lv-reason').value;
    if (!teacherId||!from||!to) { toast('Teacher aur dates lazmi hain!','error'); return; }
    const days = Math.max(1, Math.floor((new Date(to)-new Date(from))/864e5)+1);
    const leaves = DB.get('staff_leaves',[]);
    leaves.push({ id:Utils.genId(), teacherId, from, to, days, type, reason, status:'pending', appliedDate:Utils.todayStr() });
    DB.set('staff_leaves', leaves);
    ActivityLog.log('Leave Applied', `Days: ${days}, Type: ${type}`, 'Staff Leave');
    toast('Leave application submit ho gayi!');
    renderLeaves();
  }

  function renderLeaves() {
    const tbody = document.getElementById('lv-tbody');
    if (!tbody) return;
    const leaves = DB.get('staff_leaves',[]);
    const teachers = DB.get('teachers');
    if (!leaves.length) { tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:20px;color:#9ca3af">Koi leave record nahi</td></tr>'; return; }
    const statusColors = { pending:'#fef9c3:#d97706', approved:'#dcfce7:#16a34a', rejected:'#fee2e2:#dc2626' };
    tbody.innerHTML = [...leaves].reverse().map(l=>{
      const t = teachers.find(t=>t.id===l.teacherId);
      const [bg,clr] = (statusColors[l.status]||'#f0f0f0:#6b7280').split(':');
      return `<tr>
        <td style="font-weight:600">${t?.name||'Unknown'}</td>
        <td>${Utils.fmtDate(l.from)}</td>
        <td>${Utils.fmtDate(l.to)}</td>
        <td style="font-weight:700">${l.days}</td>
        <td style="font-size:12px">${l.type}</td>
        <td style="font-size:12px;color:#6b7280">${l.reason||'-'}</td>
        <td><span style="background:${bg};color:${clr};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${l.status?.toUpperCase()}</span></td>
        <td>
          ${l.status==='pending'?`
            <button class="btn btn-xs btn-success" onclick="StaffAttendance.updateLeave('${l.id}','approved')">✅ Approve</button>
            <button class="btn btn-xs btn-danger ms-1" onclick="StaffAttendance.updateLeave('${l.id}','rejected')">❌ Reject</button>
          `:`<span style="font-size:12px;color:#9ca3af">${l.status}</span>`}
        </td>
      </tr>`;
    }).join('');
  }

  function updateLeave(id, status) {
    const leaves = DB.get('staff_leaves',[]);
    const i = leaves.findIndex(l=>l.id===id);
    if (i>-1) { leaves[i].status=status; leaves[i].actionDate=Utils.todayStr(); }
    DB.set('staff_leaves', leaves);
    ActivityLog.log('Leave Updated', `Status: ${status}`, 'Staff Leave');
    toast(`Leave ${status}!`);
    renderLeaves();
    render(); // refresh stats
  }

  function renderHistory() {
    const tbody = document.getElementById('sa-history-tbody');
    if (!tbody) return;
    let data = DB.get('staff_attendance',[]);
    const filterTeacher = document.getElementById('sa-hist-teacher')?.value||'';
    const filterMonth = document.getElementById('sa-hist-month')?.value||'';
    if (filterTeacher) data = data.filter(a=>a.teacherId===filterTeacher);
    if (filterMonth) data = data.filter(a=>a.date?.startsWith(filterMonth));
    const teachers = DB.get('teachers');
    data = [...data].sort((a,b)=>b.date.localeCompare(a.date));
    if (!data.length) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af">Koi record nahi</td></tr>'; return; }
    const statusColors = { present:'#dcfce7:#16a34a', absent:'#fee2e2:#dc2626', late:'#fef9c3:#d97706', leave:'#ede9fe:#7c3aed' };
    tbody.innerHTML = data.map(a=>{
      const t = teachers.find(t=>t.id===a.teacherId);
      const [bg,clr] = (statusColors[a.status]||'#f0f0f0:#6b7280').split(':');
      return `<tr>
        <td>${Utils.fmtDate(a.date)}</td>
        <td style="font-weight:600">${t?.name||'Unknown'}</td>
        <td><span style="background:${bg};color:${clr};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;text-transform:uppercase">${a.status}</span></td>
        <td style="font-size:12px;color:#9ca3af">${a.timeIn||'-'}</td>
        <td style="font-size:12px;color:#6b7280">${a.notes||'-'}</td>
      </tr>`;
    }).join('');
  }

  return { render, showTab, loadForMark, saveAttendance, applyLeave, renderLeaves, updateLeave, renderHistory };
})();

// ================================================================
// 8. 💸 EXPENSE TRACKER (BONUS)
// ================================================================
const Expenses = (() => {

  function render() {
    const container = document.getElementById('expense-container');
    if (!container) return;
    const expenses = DB.get('expenses',[]);
    const curMonth = Utils.todayStr().slice(0,7);
    const thisMonth = expenses.filter(e=>e.date?.startsWith(curMonth));
    const total = thisMonth.reduce((a,b)=>a+(+b.amount||0),0);
    const categories = [...new Set(expenses.map(e=>e.category).filter(Boolean))];

    container.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="stat-card red"><div class="stat-icon">💸</div><div><div class="stat-value">PKR ${total.toLocaleString()}</div><div class="stat-label">This Month Expenses</div></div></div></div>
        <div class="col-md-4"><div class="stat-card blue"><div class="stat-icon">📋</div><div><div class="stat-value">${thisMonth.length}</div><div class="stat-label">Transactions</div></div></div></div>
        <div class="col-md-4"><div class="stat-card orange"><div class="stat-icon">🗂️</div><div><div class="stat-value">${categories.length}</div><div class="stat-label">Categories</div></div></div></div>
      </div>

      <!-- Add Expense -->
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">➕ Add Expense</div></div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label">Category <span class="text-danger">*</span></label>
              <input type="text" id="exp-category" class="form-control" placeholder="e.g. Electricity, Stationery..." list="exp-cat-list">
              <datalist id="exp-cat-list">
                <option>Electricity Bill</option><option>Water Bill</option><option>Stationery</option>
                <option>Furniture</option><option>Maintenance</option><option>Transport</option>
                <option>Salary</option><option>Events</option><option>Other</option>
              </datalist>
            </div>
            <div class="col-md-3">
              <label class="form-label">Amount (PKR) <span class="text-danger">*</span></label>
              <input type="number" id="exp-amount" class="form-control" placeholder="e.g. 5000">
            </div>
            <div class="col-md-2">
              <label class="form-label">Date</label>
              <input type="date" id="exp-date" class="form-control" value="${Utils.todayStr()}">
            </div>
            <div class="col-md-3">
              <label class="form-label">Description</label>
              <input type="text" id="exp-desc" class="form-control" placeholder="Optional details">
            </div>
            <div class="col-auto">
              <button class="btn btn-primary" onclick="Expenses.add()">Add</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter & Table -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div class="card-title">📋 Expense Records</div>
          <div class="d-flex gap-2">
            <input type="month" id="exp-filter-month" class="form-control form-control-sm" value="${curMonth}" oninput="Expenses.render()">
            <select id="exp-filter-cat" class="form-select form-select-sm" onchange="Expenses.render()">
              <option value="">All Categories</option>
              ${categories.map(c=>`<option>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="card-body p-0"><div class="table-container">
          <table class="table"><thead><tr><th>#</th><th>Date</th><th>Category</th><th>Amount</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody id="exp-tbody"></tbody></table>
        </div></div>
      </div>
    `;
    renderRows();
  }

  function renderRows() {
    const tbody = document.getElementById('exp-tbody');
    if (!tbody) return;
    let data = DB.get('expenses',[]);
    const month = document.getElementById('exp-filter-month')?.value||'';
    const cat = document.getElementById('exp-filter-cat')?.value||'';
    if (month) data = data.filter(e=>e.date?.startsWith(month));
    if (cat) data = data.filter(e=>e.category===cat);
    data = [...data].sort((a,b)=>b.date?.localeCompare(a.date));
    if (!data.length) { tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:30px;color:#9ca3af">Koi expense nahi mila</td></tr>'; return; }
    tbody.innerHTML = data.map((e,i)=>`<tr>
      <td>${i+1}</td>
      <td>${Utils.fmtDate(e.date)}</td>
      <td style="font-weight:600">${e.category||'-'}</td>
      <td style="font-weight:700;color:#dc2626">PKR ${(+e.amount||0).toLocaleString()}</td>
      <td style="font-size:12px;color:#6b7280">${e.description||'-'}</td>
      <td><button class="btn btn-xs btn-outline-danger" onclick="Expenses.delete('${e.id}')">🗑️</button></td>
    </tr>`).join('');
  }

  function add() {
    const category = document.getElementById('exp-category').value.trim();
    const amount = +document.getElementById('exp-amount').value;
    const date = document.getElementById('exp-date').value;
    if (!category||!amount||!date) { toast('Category, amount aur date lazmi hain!','error'); return; }
    const expenses = DB.get('expenses',[]);
    expenses.push({ id:Utils.genId(), category, amount, date, description:document.getElementById('exp-desc').value });
    DB.set('expenses', expenses);
    document.getElementById('exp-category').value='';
    document.getElementById('exp-amount').value='';
    document.getElementById('exp-desc').value='';
    ActivityLog.log('Expense Added', `PKR ${amount} - ${category}`, 'Expenses');
    toast('Expense add ho gaya!');
    render();
  }

  function deleteExpense(id) {
    confirmDialog('Yeh expense delete karein?', ()=>{
      DB.set('expenses', DB.get('expenses',[]).filter(e=>e.id!==id));
      ActivityLog.log('Expense Deleted', `ID: ${id}`, 'Expenses');
      toast('Delete ho gaya!');
      render();
    });
  }

  return { render, renderRows, add, delete: deleteExpense };
})();
