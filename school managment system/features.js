// ================================================================
// FEATURES.JS — New Modules
// 1. Reports & Export (PDF/Print)
// 2. Exam Schedule / Calendar
// 3. Parent Portal
// 4. Result Card (Printable)
// 5. Fee Receipt Print
// 6. Homework / Assignments
// 7. Notifications System
// 8. Password Change
// ================================================================

// ================================================================
// 1. REPORTS MODULE
// ================================================================
const Reports = (() => {

  function render() {
    const el = document.getElementById('page-reports');
    if (!el) return;
    const container = document.getElementById('reports-container');
    if (!container) return;
    container.innerHTML = `
      <div class="row g-4">
        <!-- Attendance Report -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header"><div class="card-title">📋 Attendance Report</div></div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label fw-bold">Select Class</label>
                <select id="rep-att-class" class="form-select">
                  <option value="">All Classes</option>
                  ${DB.get('classes').map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Date Range</label>
                <div class="row g-2">
                  <div class="col-6"><input type="date" id="rep-att-from" class="form-control" value="${new Date(Date.now()-30*864e5).toISOString().split('T')[0]}"></div>
                  <div class="col-6"><input type="date" id="rep-att-to" class="form-control" value="${Utils.todayStr()}"></div>
                </div>
              </div>
              <button class="btn btn-primary w-100" onclick="Reports.printAttendance()">🖨️ Print Attendance Report</button>
            </div>
          </div>
        </div>

        <!-- Fee Report -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header"><div class="card-title">💰 Fee Collection Report</div></div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label fw-bold">Month</label>
                <input type="month" id="rep-fee-month" class="form-control" value="${new Date().toISOString().slice(0,7)}">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Status</label>
                <select id="rep-fee-status" class="form-select">
                  <option value="">All</option>
                  <option value="paid">Paid Only</option>
                  <option value="pending">Pending Only</option>
                </select>
              </div>
              <button class="btn btn-success w-100" onclick="Reports.printFeeReport()">🖨️ Print Fee Report</button>
            </div>
          </div>
        </div>

        <!-- Result Report -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header"><div class="card-title">📊 Result / Marks Report</div></div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label fw-bold">Select Class</label>
                <select id="rep-res-class" class="form-select">
                  <option value="">All Classes</option>
                  ${DB.get('classes').map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Exam</label>
                <select id="rep-res-exam" class="form-select">
                  <option value="">All Exams</option>
                  ${[...new Set(DB.get('results').map(r=>r.exam))].map(e=>`<option value="${e}">${e}</option>`).join('')}
                </select>
              </div>
              <button class="btn btn-warning w-100" onclick="Reports.printResultReport()">🖨️ Print Result Report</button>
            </div>
          </div>
        </div>

        <!-- Student List Report -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header"><div class="card-title">👥 Student List Report</div></div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label fw-bold">Select Class</label>
                <select id="rep-std-class" class="form-select">
                  <option value="">All Classes</option>
                  ${DB.get('classes').map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Include Fields</label>
                <div class="d-flex gap-3 flex-wrap">
                  <div class="form-check"><input class="form-check-input" type="checkbox" id="rep-inc-phone" checked><label class="form-check-label" for="rep-inc-phone">Phone</label></div>
                  <div class="form-check"><input class="form-check-input" type="checkbox" id="rep-inc-father" checked><label class="form-check-label" for="rep-inc-father">Father</label></div>
                  <div class="form-check"><input class="form-check-input" type="checkbox" id="rep-inc-dob"><label class="form-check-label" for="rep-inc-dob">DOB</label></div>
                </div>
              </div>
              <button class="btn btn-info w-100" style="color:#fff" onclick="Reports.printStudentList()">🖨️ Print Student List</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function _printHeader(title) {
    return `<html><head><title>${title}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
      h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
      .school-name { font-size: 22px; font-weight: bold; text-align: center; color: #1e40af; }
      .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { background: #1e40af; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; }
      td { padding: 6px 10px; border-bottom: 1px solid #ddd; }
      tr:nth-child(even) td { background: #f8faff; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
      .paid { background: #dcfce7; color: #166534; }
      .pending { background: #fee2e2; color: #991b1b; }
      .present { background: #dcfce7; color: #166534; }
      .absent { background: #fee2e2; color: #991b1b; }
      .late { background: #fef9c3; color: #854d0e; }
      .summary { margin-top: 16px; padding: 12px; background: #f0f4ff; border-radius: 6px; }
      .summary span { margin-right: 20px; font-weight: bold; }
      .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <div class="school-name">Hira Baitul Hamd</div>
    <h1>${title}</h1>
    <div class="subtitle">Sukkur — Printed on: ${new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'})}</div>`;
  }

  function printAttendance() {
    const cls = document.getElementById('rep-att-class').value;
    const from = document.getElementById('rep-att-from').value;
    const to = document.getElementById('rep-att-to').value;
    const students = DB.get('students').filter(s => !cls || s.cls === cls);
    const attendance = DB.get('attendance').filter(r => r.date >= from && r.date <= to && (!cls || r.cls === cls));

    let rows = students.map(s => {
      let present=0, absent=0, late=0;
      attendance.forEach(r => {
        const st = r.attendance?.[s.id];
        if (st === 'present') present++;
        else if (st === 'absent') absent++;
        else if (st === 'late') late++;
      });
      const total = present+absent+late;
      const pct = total ? Math.round(present/total*100) : 0;
      return `<tr>
        <td>${s.roll}</td><td>${s.name}</td><td>${s.cls} ${s.section}</td>
        <td><span class="badge present">${present}</span></td>
        <td><span class="badge absent">${absent}</span></td>
        <td><span class="badge late">${late}</span></td>
        <td style="font-weight:bold;color:${pct>=75?'#166534':'#991b1b'}">${pct}%</td>
      </tr>`;
    }).join('');

    const w = window.open('','_blank');
    w.document.write(_printHeader(`Attendance Report — ${from} to ${to}${cls?' | Class: '+cls:''}`) +
      `<table><thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Hira Baitul Hamd School Management System</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  function printFeeReport() {
    const month = document.getElementById('rep-fee-month').value;
    const status = document.getElementById('rep-fee-status').value;
    const students = DB.get('students');
    let fees = DB.get('fees').filter(f => (!month || f.month === month) && (!status || f.status === status));

    let total=0, totalPaid=0, totalPending=0;
    let rows = fees.map((f,i) => {
      const s = students.find(st=>st.id===f.studentId);
      total += f.amount;
      if (f.status==='paid') totalPaid += f.amount;
      else totalPending += f.amount;
      return `<tr>
        <td>${i+1}</td><td>${s?.name||'-'}</td><td>${s?.cls||'-'}</td>
        <td>${f.month}</td><td>PKR ${f.amount.toLocaleString()}</td>
        <td><span class="badge ${f.status}">${f.status==='paid'?'✅ Paid':'⏳ Pending'}</span></td>
      </tr>`;
    }).join('');

    const w = window.open('','_blank');
    w.document.write(_printHeader(`Fee Report — ${month||'All Months'}`) +
      `<div class="summary"><span>Total: PKR ${total.toLocaleString()}</span><span style="color:#166534">Paid: PKR ${totalPaid.toLocaleString()}</span><span style="color:#991b1b">Pending: PKR ${totalPending.toLocaleString()}</span></div>
      <table><thead><tr><th>#</th><th>Student</th><th>Class</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Hira Baitul Hamd School Management System</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  function printResultReport() {
    const cls = document.getElementById('rep-res-class').value;
    const examName = document.getElementById('rep-res-exam').value;
    const students = DB.get('students').filter(s => !cls || s.cls === cls);
    const results = DB.get('results').filter(r => (!cls || r.cls === cls) && (!examName || r.exam === examName));

    let rows = '';
    students.forEach(s => {
      results.forEach(r => {
        const myData = r.results?.find(rs=>rs.studentId===s.id);
        if (!myData) return;
        rows += `<tr>
          <td>${s.roll}</td><td>${s.name}</td><td>${s.cls} ${s.section}</td>
          <td>${r.exam}</td><td>${myData.total}</td>
          <td>${myData.pct}%</td><td style="font-weight:bold">${Utils.getGrade(myData.pct)}</td>
        </tr>`;
      });
    });
    if (!rows) rows = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">No data found</td></tr>`;

    const w = window.open('','_blank');
    w.document.write(_printHeader(`Result Report${cls?' — Class: '+cls:''}${examName?' | '+examName:''}`) +
      `<table><thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Exam</th><th>Marks</th><th>%</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Hira Baitul Hamd School Management System</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  function printStudentList() {
    const cls = document.getElementById('rep-std-class').value;
    const incPhone = document.getElementById('rep-inc-phone').checked;
    const incFather = document.getElementById('rep-inc-father').checked;
    const incDob = document.getElementById('rep-inc-dob').checked;
    const students = DB.get('students').filter(s => !cls || s.cls === cls);

    const extraTh = `${incFather?'<th>Father</th>':''}${incPhone?'<th>Phone</th>':''}${incDob?'<th>DOB</th>':''}`;
    const rows = students.map((s,i) => `<tr>
      <td>${i+1}</td><td>${s.roll}</td><td>${s.name}</td><td>${s.cls} ${s.section}</td>
      ${incFather?`<td>${s.father||'-'}</td>`:''}
      ${incPhone?`<td>${s.phone||'-'}</td>`:''}
      ${incDob?`<td>${s.dob||'-'}</td>`:''}
    </tr>`).join('');

    const w = window.open('','_blank');
    w.document.write(_printHeader(`Student List${cls?' — Class: '+cls:''}`) +
      `<div class="summary"><span>Total Students: ${students.length}</span></div>
      <table><thead><tr><th>#</th><th>Roll</th><th>Name</th><th>Class</th>${extraTh}</tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Hira Baitul Hamd School Management System</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  // Printable Result Card for a student
  function printResultCard(studentId) {
    const s = DB.get('students').find(st=>st.id===studentId);
    if (!s) return;
    const results = DB.get('results');
    const myResults = results.filter(r => r.results?.some(rs=>rs.studentId===s.id));

    let examSections = myResults.map(r => {
      const myData = r.results?.find(rs=>rs.studentId===s.id);
      if (!myData) return '';
      return `<div style="margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#1e40af;color:#fff">
              <th colspan="3" style="padding:8px;text-align:left">${r.exam} — ${r.date}</th>
              <th style="padding:8px;text-align:center">Total: ${myData.total} | ${myData.pct}% | Grade: ${Utils.getGrade(myData.pct)}</th>
            </tr>
            <tr style="background:#dbeafe">
              <th style="padding:6px 10px">Subject</th><th style="padding:6px 10px">Marks</th><th style="padding:6px 10px">Out of</th><th style="padding:6px 10px">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${r.subjects.map(sub=>{
              const m = myData.marks[sub.id]??0;
              const pct2 = Math.round(m/100*100);
              return `<tr><td style="padding:6px 10px;border-bottom:1px solid #ddd">${sub.name}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #ddd;font-weight:bold">${m}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #ddd">100</td>
                <td style="padding:6px 10px;border-bottom:1px solid #ddd">${Utils.getGrade(pct2)}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    }).join('');

    if (!examSections) examSections = '<p style="text-align:center;color:#888;padding:20px">No results yet.</p>';

    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Result Card — ${s.name}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; }
      .header { text-align: center; border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
      .school { font-size: 22px; font-weight: bold; color: #1e40af; }
      .student-info { display: flex; gap: 16px; background: #f0f4ff; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
      .info-item { flex: 1; }
      .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
      .info-val { font-size: 14px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; }
      .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
    </style></head><body>
    <div class="header">
      <div class="school">🎓 Hira Baitul Hamd</div>
      <div style="font-size:16px;margin-top:4px">Student Progress Report Card</div>
      <div style="font-size:11px;color:#666;margin-top:2px">Sukkur, Sindh</div>
    </div>
    <div class="student-info">
      <div class="info-item"><div class="info-label">Student Name</div><div class="info-val">${s.name}</div></div>
      <div class="info-item"><div class="info-label">Roll No</div><div class="info-val">${s.roll}</div></div>
      <div class="info-item"><div class="info-label">Class</div><div class="info-val">${s.cls} — Section ${s.section}</div></div>
      <div class="info-item"><div class="info-label">Father's Name</div><div class="info-val">${s.father||'-'}</div></div>
    </div>
    ${examSections}
    <div class="footer">Hira Baitul Hamd School Management System | Printed: ${new Date().toLocaleDateString('en-PK')}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  // Fee Receipt
  function printFeeReceipt(feeId) {
    const fee = DB.get('fees').find(f=>f.id===feeId);
    if (!fee) return;
    const s = DB.get('students').find(st=>st.id===fee.studentId);
    if (!s) return;
    const receiptNo = 'RCP-' + feeId.toUpperCase().slice(-6);
    const paidDate = fee.paidAt ? new Date(fee.paidAt).toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'}) : Utils.todayStr();
    const monthLabel = Fees.monthLabel(fee.month);

    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Fee Receipt — ${s.name}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; padding: 30px; max-width: 420px; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 20px; }
      .school { font-size: 20px; font-weight: bold; color: #1e40af; }
      .receipt-box { border: 2px solid #1e40af; border-radius: 10px; padding: 20px; }
      .title { font-size: 14px; font-weight: bold; text-align: center; background: #1e40af; color: #fff; padding: 8px; border-radius: 6px; margin-bottom: 16px; }
      .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #ddd; font-size: 13px; }
      .row .label { color: #555; }
      .row .val { font-weight: bold; }
      .amount-row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #1e40af; margin-top: 8px; }
      .stamp { text-align: center; margin-top: 16px; }
      .paid-stamp { display: inline-block; border: 3px solid #166534; color: #166534; font-size: 22px; font-weight: bold; padding: 8px 20px; border-radius: 6px; transform: rotate(-5deg); }
      .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #888; }
    </style></head><body>
    <div class="header">
      <div class="school">🎓 Hira Baitul Hamd</div>
      <div style="font-size:11px;color:#666">Sukkur, Sindh | School Management System</div>
    </div>
    <div class="receipt-box">
      <div class="title">FEE RECEIPT</div>
      <div class="row"><span class="label">Receipt No.</span><span class="val">${receiptNo}</span></div>
      <div class="row"><span class="label">Student Name</span><span class="val">${s.name}</span></div>
      <div class="row"><span class="label">Roll Number</span><span class="val">${s.roll}</span></div>
      <div class="row"><span class="label">Class</span><span class="val">${s.cls} — Section ${s.section}</span></div>
      <div class="row"><span class="label">Father's Name</span><span class="val">${s.father||'-'}</span></div>
      <div class="row"><span class="label">Fee Month</span><span class="val">${monthLabel}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="val">${paidDate}</span></div>
      <div class="amount-row"><span>Total Amount</span><span>PKR ${fee.amount.toLocaleString()}</span></div>
      ${fee.status==='paid'?`<div class="stamp"><div class="paid-stamp">✅ PAID</div></div>`:''}
    </div>
    <div class="footer">This is a computer-generated receipt. | Hira Baitul Hamd</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return { render, printAttendance, printFeeReport, printResultReport, printStudentList, printResultCard, printFeeReceipt };
})();


// ================================================================
// 2. EXAM CALENDAR / SCHEDULE MODULE
// ================================================================
const ExamCalendar = (() => {

  function getExams() { return DB.get('examSchedule', []); }
  function saveExams(e) { DB.set('examSchedule', e); }

  function render() {
    const container = document.getElementById('exam-calendar-container');
    if (!container) return;
    renderCalendar(container);
  }

  function renderCalendar(container) {
    const exams = getExams();
    const upcoming = exams.filter(e=>e.date>=Utils.todayStr()).sort((a,b)=>a.date.localeCompare(b.date));
    const past = exams.filter(e=>e.date<Utils.todayStr()).sort((a,b)=>b.date.localeCompare(a.date));

    container.innerHTML = `
      <div class="row g-4">
        <div class="col-md-5">
          <div class="card">
            <div class="card-header">
              <div class="card-title">📅 Add Exam / Holiday</div>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label fw-bold">Title</label>
                <input type="text" id="exam-title" class="form-control" placeholder="e.g. Annual Exam — Mathematics">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Date</label>
                <input type="date" id="exam-date" class="form-control" value="${Utils.todayStr()}">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Type</label>
                <select id="exam-type" class="form-select">
                  <option value="exam">📝 Exam</option>
                  <option value="holiday">🏖️ Holiday</option>
                  <option value="event">🎉 Event</option>
                  <option value="test">📋 Test / Quiz</option>
                  <option value="result">📊 Result Day</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Class (optional)</label>
                <select id="exam-class" class="form-select">
                  <option value="">All Classes</option>
                  ${DB.get('classes').map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Note (optional)</label>
                <textarea id="exam-note" class="form-control" rows="2" placeholder="Additional details..."></textarea>
              </div>
              <button class="btn btn-primary w-100" onclick="ExamCalendar.save()">➕ Add to Calendar</button>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card mb-3">
            <div class="card-header"><div class="card-title">⏳ Upcoming (${upcoming.length})</div></div>
            <div class="card-body p-0">
              ${!upcoming.length ? `<div class="empty-state" style="padding:24px"><div class="empty-state-icon">📅</div><p>No upcoming exams or events.</p></div>` :
              upcoming.map(e=>_examRow(e)).join('')}
            </div>
          </div>
          ${past.length ? `<div class="card">
            <div class="card-header"><div class="card-title">✅ Past Events (${past.length})</div></div>
            <div class="card-body p-0">
              ${past.slice(0,5).map(e=>_examRow(e, true)).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>`;
  }

  function _examRow(e, isPast=false) {
    const colors = { exam:'#3b82f6', holiday:'#10b981', event:'#f59e0b', test:'#8b5cf6', result:'#ef4444' };
    const icons = { exam:'📝', holiday:'🏖️', event:'🎉', test:'📋', result:'📊' };
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);${isPast?'opacity:.6':''}">
      <div style="min-width:48px;background:${colors[e.type]||'#6b7280'};color:#fff;border-radius:8px;text-align:center;padding:6px">
        <div style="font-size:18px">${icons[e.type]||'📌'}</div>
        <div style="font-size:9px;font-weight:700">${e.type?.toUpperCase()}</div>
      </div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${e.title}</div>
        <div style="font-size:12px;color:var(--text-muted)">📅 ${e.date}${e.cls?' &nbsp;|&nbsp; Class: '+e.cls:''}</div>
        ${e.note?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${e.note}</div>`:''}
      </div>
      <button class="btn btn-sm btn-outline-danger btn-icon" onclick="ExamCalendar.del('${e.id}')">🗑️</button>
    </div>`;
  }

  function save() {
    const title = document.getElementById('exam-title').value.trim();
    const date = document.getElementById('exam-date').value;
    const type = document.getElementById('exam-type').value;
    const cls = document.getElementById('exam-class').value;
    const note = document.getElementById('exam-note').value.trim();
    if (!title || !date) { toast('Title aur Date zaroori hain!', 'error'); return; }
    const exams = getExams();
    exams.push({ id: Utils.genId(), title, date, type, cls, note, createdAt: Date.now() });
    saveExams(exams);
    toast('Calendar mein add ho gaya! 📅');
    render();
  }

  function del(id) {
    confirmDialog('Is event ko delete karein?', () => {
      saveExams(getExams().filter(e=>e.id!==id));
      toast('Deleted!', 'info');
      render();
    });
  }

  function getUpcoming(limit=5) {
    return getExams().filter(e=>e.date>=Utils.todayStr()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,limit);
  }

  return { render, save, del, getUpcoming };
})();


// ================================================================
// 3. PARENT PORTAL
// ================================================================
const ParentPortal = (() => {

  function renderLogin() {
    // Parent logs in with child's Roll Number
    const container = document.getElementById('parent-login-container');
    if (!container) return;
    container.innerHTML = `
      <div class="card" style="max-width:400px;margin:0 auto">
        <div class="card-header"><div class="card-title">👨‍👩‍👦 Parent Login</div></div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Apne bache ka Roll Number enter karein</p>
          <div class="mb-3">
            <label class="form-label fw-bold">Child Roll Number</label>
            <input type="text" id="parent-roll" class="form-control" placeholder="e.g. 5th-A-001">
          </div>
          <button class="btn btn-primary w-100" onclick="ParentPortal.login()">🔍 View Child's Info</button>
        </div>
      </div>`;
  }

  function login() {
    const roll = document.getElementById('parent-roll').value.trim();
    const s = DB.get('students').find(st=>st.roll.toLowerCase()===roll.toLowerCase());
    if (!s) { toast('Roll Number nahi mila!', 'error'); return; }
    renderDashboard(s);
  }

  function renderDashboard(s) {
    const container = document.getElementById('parent-content-container');
    if (!container) return;

    const fees = DB.get('fees').filter(f=>f.studentId===s.id);
    const totalPaid = fees.filter(f=>f.status==='paid').reduce((a,b)=>a+b.amount,0);
    const totalPending = fees.filter(f=>f.status==='pending').reduce((a,b)=>a+b.amount,0);
    const pendingCount = fees.filter(f=>f.status==='pending').length;

    const attendance = DB.get('attendance');
    let present=0, total=0;
    attendance.forEach(r => {
      if (r.attendance?.[s.id]) {
        total++;
        if (r.attendance[s.id]==='present') present++;
      }
    });
    const attPct = total ? Math.round(present/total*100) : 0;

    const results = DB.get('results');
    const myResults = results.flatMap(r=>r.results?.filter(rs=>rs.studentId===s.id)||[]);
    const avgPct = myResults.length ? Math.round(myResults.reduce((a,b)=>a+b.pct,0)/myResults.length) : 0;

    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-body" style="background:linear-gradient(135deg,var(--accent),#7c3aed);border-radius:var(--radius);color:#fff;padding:20px">
          <div style="display:flex;align-items:center;gap:16px">
            ${s.photo?`<img src="${s.photo}" style="width:64px;height:64px;border-radius:50%;border:3px solid rgba(255,255,255,.4);object-fit:cover">`:`<div style="width:64px;height:64px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700">${Utils.avatar(s.name)}</div>`}
            <div>
              <div style="font-size:22px;font-weight:800">${s.name}</div>
              <div style="font-size:13px;opacity:.8">Roll: ${s.roll} &nbsp;|&nbsp; Class ${s.cls} — ${s.section}</div>
              ${s.father?`<div style="font-size:12px;opacity:.7">Father: ${s.father}</div>`:''}
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-4">
          <div class="stat-card ${attPct>=75?'green':'red'} p-3 text-center">
            <div style="font-size:24px;font-weight:800;color:${attPct>=75?'var(--success)':'var(--danger)'}">${attPct}%</div>
            <div style="font-size:12px;color:var(--text-muted)">Attendance</div>
            ${attPct<75?`<div style="font-size:10px;color:var(--danger);margin-top:4px">⚠️ Low!</div>`:''}
          </div>
        </div>
        <div class="col-4">
          <div class="stat-card blue p-3 text-center">
            <div style="font-size:24px;font-weight:800;color:var(--accent)">${avgPct}%</div>
            <div style="font-size:12px;color:var(--text-muted)">Avg Marks</div>
          </div>
        </div>
        <div class="col-4">
          <div class="stat-card ${pendingCount>0?'red':'green'} p-3 text-center">
            <div style="font-size:24px;font-weight:800;color:${pendingCount>0?'var(--danger)':'var(--success)'}">${pendingCount}</div>
            <div style="font-size:12px;color:var(--text-muted)">Fee Pending</div>
          </div>
        </div>
      </div>

      <!-- Fee Status -->
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">💰 Fee Status</div></div>
        <div class="card-body p-0">
          <div class="table-container">
            <table class="table">
              <thead><tr><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${fees.length ? fees.slice(-6).reverse().map(f=>`<tr>
                  <td>${Fees.monthLabel(f.month)}</td>
                  <td>PKR ${f.amount.toLocaleString()}</td>
                  <td><span style="background:${f.status==='paid'?'var(--success-light)':'var(--danger-light)'};color:${f.status==='paid'?'var(--success)':'var(--danger)'};font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600">${f.status==='paid'?'✅ Paid':'⏳ Pending'}</span></td>
                </tr>`).join('') : '<tr><td colspan="3"><div class="empty-state" style="padding:20px"><p>No fee records</p></div></td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Notices -->
      <div class="card">
        <div class="card-header"><div class="card-title">📢 School Notices</div></div>
        <div class="card-body p-0">
          ${DB.get('notices').slice(-5).reverse().map(n=>`
            <div class="notice-item ${n.type==='urgent'?'urgent':''}" style="padding:12px 16px;border-bottom:1px solid var(--border)">
              <div style="font-weight:600;font-size:13px">${n.type==='urgent'?'🔴 ':''} ${n.title}</div>
              <div style="font-size:12px;color:var(--text-muted)">${n.content}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">📅 ${n.date}</div>
            </div>`).join('') || '<div class="empty-state" style="padding:20px"><p>No notices</p></div>'}
        </div>
      </div>

      <div class="mt-3 text-center">
        <button class="btn btn-outline-secondary" onclick="ParentPortal.renderLogin()">🔄 Doosra Student Dekhein</button>
      </div>`;

    document.getElementById('parent-login-container').style.display='none';
    container.style.display='block';
  }

  function init() {
    const cont = document.getElementById('parent-content-container');
    if (cont) cont.style.display='none';
    renderLogin();
  }

  return { renderLogin, login, renderDashboard, init };
})();


// ================================================================
// 4. HOMEWORK / ASSIGNMENTS MODULE
// ================================================================
const Homework = (() => {

  function getHW() { return DB.get('homework', []); }
  function saveHW(h) { DB.set('homework', h); }

  function render() {
    const container = document.getElementById('homework-container');
    if (!container) return;
    const isStudent = APP.currentPortal === 'student';
    const isTeacher = APP.currentPortal === 'teacher';
    const isAdmin = APP.currentPortal === 'admin';

    const hw = getHW();
    let filtered = hw;

    if (isStudent) {
      const s = DB.get('students').find(st=>st.id===APP.currentUser?.id);
      filtered = hw.filter(h=>!h.cls || h.cls===s?.cls);
    } else if (isTeacher) {
      filtered = hw.filter(h=>h.teacherId===APP.currentUser?.id || !h.teacherId);
    }

    const upcoming = filtered.filter(h=>h.dueDate>=Utils.todayStr()).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    const past = filtered.filter(h=>h.dueDate<Utils.todayStr()).sort((a,b)=>b.dueDate.localeCompare(a.dueDate));

    container.innerHTML = `
      ${(isTeacher||isAdmin) ? `
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">➕ Naya Homework / Assignment</div></div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label fw-bold">Title</label>
              <input type="text" id="hw-title" class="form-control" placeholder="e.g. Math Chapter 3 Exercise">
            </div>
            <div class="col-md-2">
              <label class="form-label fw-bold">Subject</label>
              <select id="hw-subject" class="form-select">
                ${DB.get('subjects').map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label fw-bold">Class</label>
              <select id="hw-class" class="form-select">
                <option value="">All</option>
                ${DB.get('classes').map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label fw-bold">Due Date</label>
              <input type="date" id="hw-due" class="form-control" value="${new Date(Date.now()+2*864e5).toISOString().split('T')[0]}">
            </div>
            <div class="col-md-2 d-flex align-items-end">
              <button class="btn btn-primary w-100" onclick="Homework.save()">➕ Add</button>
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">Description</label>
              <textarea id="hw-desc" class="form-control" rows="2" placeholder="Details..."></textarea>
            </div>
          </div>
        </div>
      </div>` : ''}

      <div class="card mb-3">
        <div class="card-header"><div class="card-title">📚 Active Homework (${upcoming.length})</div></div>
        <div class="card-body p-0">
          ${!upcoming.length ? `<div class="empty-state" style="padding:24px"><div class="empty-state-icon">📚</div><p>Koi active homework nahi hai.</p></div>` :
          upcoming.map(h=>_hwRow(h, isTeacher||isAdmin)).join('')}
        </div>
      </div>

      ${past.length ? `<div class="card">
        <div class="card-header"><div class="card-title">✅ Past Homework (${past.length})</div></div>
        <div class="card-body p-0">
          ${past.slice(0,5).map(h=>_hwRow(h, isTeacher||isAdmin, true)).join('')}
        </div>
      </div>` : ''}`;
  }

  function _hwRow(h, canDelete=false, isPast=false) {
    const daysLeft = Math.ceil((new Date(h.dueDate)-new Date())/864e5);
    return `<div style="padding:14px 16px;border-bottom:1px solid var(--border);${isPast?'opacity:.6':''}">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${h.title}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
            📚 ${h.subject} ${h.cls?`&nbsp;|&nbsp; Class: ${h.cls}`:''} &nbsp;|&nbsp; 📅 Due: ${h.dueDate}
            ${!isPast?`<span style="background:${daysLeft<=1?'var(--danger-light)':daysLeft<=3?'var(--warning-light)':'var(--success-light)'};color:${daysLeft<=1?'var(--danger)':daysLeft<=3?'var(--warning)':'var(--success)'};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;margin-left:6px">${daysLeft<=0?'Today!':daysLeft+' din baki'}</span>`:''}
          </div>
          ${h.desc?`<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${h.desc}</div>`:''}
        </div>
        ${canDelete?`<button class="btn btn-sm btn-outline-danger btn-icon" onclick="Homework.del('${h.id}')">🗑️</button>`:''}
      </div>
    </div>`;
  }

  function save() {
    const title = document.getElementById('hw-title').value.trim();
    const subject = document.getElementById('hw-subject').value;
    const cls = document.getElementById('hw-class').value;
    const dueDate = document.getElementById('hw-due').value;
    const desc = document.getElementById('hw-desc').value.trim();
    if (!title || !dueDate) { toast('Title aur Due Date zaroori hain!', 'error'); return; }
    const hw = getHW();
    hw.push({ id: Utils.genId(), title, subject, cls, dueDate, desc, teacherId: APP.currentUser?.id, createdAt: Date.now() });
    saveHW(hw);
    document.getElementById('hw-title').value='';
    document.getElementById('hw-desc').value='';
    toast('Homework add ho gaya! 📚');
    render();
  }

  function del(id) {
    confirmDialog('Homework delete karein?', () => {
      saveHW(getHW().filter(h=>h.id!==id));
      toast('Deleted!', 'info');
      render();
    });
  }

  function getActiveCount() {
    return getHW().filter(h=>h.dueDate>=Utils.todayStr()).length;
  }

  return { render, save, del, getActiveCount };
})();


// ================================================================
// 5. NOTIFICATIONS SYSTEM
// ================================================================
const Notifications = (() => {

  function getAll() { return DB.get('appNotifications', []); }
  function saveAll(n) { DB.set('appNotifications', n); }

  function add(msg, type='info', link='') {
    const notifs = getAll();
    notifs.unshift({ id:Utils.genId(), msg, type, link, read:false, time:Date.now() });
    if (notifs.length > 50) notifs.pop();
    saveAll(notifs);
    updateBadge();
  }

  function markRead(id) {
    saveAll(getAll().map(n=>n.id===id?{...n,read:true}:n));
    updateBadge();
    render();
  }

  function markAllRead() {
    saveAll(getAll().map(n=>({...n,read:true})));
    updateBadge();
    render();
  }

  function del(id) {
    saveAll(getAll().filter(n=>n.id!==id));
    updateBadge();
    render();
  }

  function unreadCount() { return getAll().filter(n=>!n.read).length; }

  function updateBadge() {
    const badge = document.getElementById('notif-badge');
    const count = unreadCount();
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  function render() {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    const notifs = getAll();
    if (!notifs.length) {
      container.innerHTML = `<div class="empty-state" style="padding:40px"><div class="empty-state-icon">🔔</div><h5>Koi notification nahi</h5></div>`;
      return;
    }
    container.innerHTML = `
      <div class="d-flex justify-content-end mb-3">
        <button class="btn btn-sm btn-outline-secondary" onclick="Notifications.markAllRead()">✅ Sab Read Mark Karein</button>
      </div>
      ${notifs.map(n=>`
        <div style="display:flex;gap:12px;align-items:start;padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:8px;background:${n.read?'var(--surface)':'var(--accent-light)'};cursor:pointer" onclick="Notifications.markRead('${n.id}')">
          <div style="font-size:20px">${{info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[n.type]||'🔔'}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:${n.read?'400':'600'}">${n.msg}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${new Date(n.time).toLocaleString('en-PK')}</div>
          </div>
          ${!n.read?`<div style="width:8px;height:8px;background:var(--accent);border-radius:50%;margin-top:4px"></div>`:''}
          <button class="btn btn-sm btn-outline-danger btn-icon" onclick="event.stopPropagation();Notifications.del('${n.id}')">✕</button>
        </div>`).join('')}`;
  }

  function checkAutoNotifications() {
    const today = Utils.todayStr();
    const lastCheck = localStorage.getItem('et_lastNotifCheck');
    if (lastCheck === today) return;
    localStorage.setItem('et_lastNotifCheck', today);

    // Check pending fees
    const pendingFees = DB.get('fees').filter(f=>f.status==='pending' && f.month < new Date().toISOString().slice(0,7));
    if (pendingFees.length > 0) {
      add(`⚠️ ${pendingFees.length} fee records overdue hain. Fee Management check karein.`, 'warning');
    }

    // Check upcoming exams
    const tomorrow = new Date(Date.now()+864e5).toISOString().split('T')[0];
    const upcomingExams = DB.get('examSchedule',[]).filter(e=>e.date===tomorrow);
    upcomingExams.forEach(e=>{
      add(`📅 Kal: ${e.title}`, 'info');
    });

    // Check homework due soon
    const hwDueSoon = DB.get('homework',[]).filter(h=>{
      const days = Math.ceil((new Date(h.dueDate)-new Date())/864e5);
      return days >= 0 && days <= 1;
    });
    if (hwDueSoon.length) add(`📚 ${hwDueSoon.length} homework(s) aaj ya kal due hain!`, 'warning');

    updateBadge();
  }

  function init() {
    updateBadge();
    checkAutoNotifications();
  }

  return { render, add, markRead, markAllRead, del, unreadCount, updateBadge, init };
})();


// ================================================================
// 6. PASSWORD CHANGE MODULE
// ================================================================
const PasswordChange = (() => {

  function render() {
    const container = document.getElementById('profile-settings-container');
    if (!container) return;
    const u = APP.currentUser;
    const role = APP.currentPortal;

    container.innerHTML = `
      <div class="row g-4">
        <!-- Profile Info -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header"><div class="card-title">👤 Profile Info</div></div>
            <div class="card-body">
              <div style="text-align:center;margin-bottom:20px">
                <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;margin:0 auto 12px">
                  ${Utils.avatar(u?.name)}
                </div>
                <div style="font-size:18px;font-weight:700">${u?.name}</div>
                <div style="font-size:13px;color:var(--text-muted)">${role.charAt(0).toUpperCase()+role.slice(1)}</div>
              </div>
              <div class="row g-2">
                <div class="col-6"><div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px"><div style="font-size:11px;color:var(--text-muted)">Username</div><div style="font-weight:600">${u?.username||u?.roll||'-'}</div></div></div>
                <div class="col-6"><div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px"><div style="font-size:11px;color:var(--text-muted)">Role</div><div style="font-weight:600">${role}</div></div></div>
                ${u?.email?`<div class="col-12"><div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px"><div style="font-size:11px;color:var(--text-muted)">Email</div><div style="font-weight:600">${u.email}</div></div></div>`:''}
              </div>
            </div>
          </div>
        </div>

        <!-- Password Change -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header"><div class="card-title">🔐 Password Change</div></div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label fw-bold">Current Password</label>
                <input type="password" id="pw-current" class="form-control" placeholder="Purana password">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">New Password</label>
                <input type="password" id="pw-new" class="form-control" placeholder="Naya password (min 6 chars)">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Confirm New Password</label>
                <input type="password" id="pw-confirm" class="form-control" placeholder="Dubara likhen">
              </div>
              <button class="btn btn-primary w-100" onclick="PasswordChange.change()">🔐 Password Change Karein</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function change() {
    const curr = document.getElementById('pw-current').value;
    const nw = document.getElementById('pw-new').value;
    const conf = document.getElementById('pw-confirm').value;

    if (!curr || !nw || !conf) { toast('Sab fields fill karein!', 'error'); return; }
    if (nw.length < 6) { toast('New password kam az kam 6 characters ka hona chahiye!', 'error'); return; }
    if (nw !== conf) { toast('New passwords match nahi karte!', 'error'); return; }

    const role = APP.currentPortal;
    const u = APP.currentUser;

    const storeKey = role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students';
    const users = DB.get(storeKey);
    const userIdx = users.findIndex(x=>x.id===u.id);

    if (userIdx === -1) { toast('User nahi mila!', 'error'); return; }

    const actualUser = users[userIdx];
    const storedPass = actualUser.password || actualUser.roll;

    if (storedPass !== curr) { toast('Current password galat hai!', 'error'); return; }

    users[userIdx] = { ...actualUser, password: nw };
    DB.set(storeKey, users);
    APP.currentUser = { ...u, password: nw };
    sessionStorage.setItem('et_session', JSON.stringify(APP.currentUser));

    ['pw-current','pw-new','pw-confirm'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    toast('Password successfully change ho gaya! 🔐');
    Notifications.add('🔐 Aapka password change ho gaya.', 'success');
  }

  return { render, change };
})();
