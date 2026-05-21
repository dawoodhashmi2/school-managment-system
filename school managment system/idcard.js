// ================================================================
// IDCARD.JS  —  Student ID Card System
// ================================================================

const IDCard = (() => {

  function _makeQR(containerId, student, size) {
    if (typeof QRAttendance !== 'undefined') {
      QRAttendance.generateQR(containerId, student, size || 120);
    }
  }

  function _cardHTML(student, qrId) {
    const year = new Date().getFullYear();
    return `
      <div class="idc-card">
        <div class="idc-bg-circles">
          <span class="idc-circle c1"></span>
          <span class="idc-circle c2"></span>
          <span class="idc-circle c3"></span>
        </div>
        <div class="idc-header">
          <div class="idc-school-logo">🎓</div>
          <div class="idc-school-info">
            <div class="idc-school-name">Hira Baitul Hamd</div>
            <div class="idc-school-sub">STUDENT IDENTITY CARD</div>
          </div>
          <div class="idc-session-badge">${year}-${String(year+1).slice(-2)}</div>
        </div>
        <div class="idc-body">
          <div class="idc-photo-col">
            <div class="idc-photo-frame">
              ${student.photo
                ? '<img src="' + student.photo + '" alt="' + student.name + '">'
                : '<div class="idc-photo-initials">' + Utils.avatar(student.name) + '</div>'}
            </div>
            <div class="idc-blood-badge">${student.blood || 'N/A'}</div>
          </div>
          <div class="idc-info-col">
            <div class="idc-student-name">${student.name}</div>
            <div class="idc-roll-chip">Roll # ${student.roll}</div>
            <div class="idc-fields">
              <div class="idc-field">
                <span class="idc-field-label">Father</span>
                <span class="idc-field-val">${student.father || '-'}</span>
              </div>
              <div class="idc-field">
                <span class="idc-field-label">Class</span>
                <span class="idc-field-val">${student.cls} - ${student.section}</span>
              </div>
              ${student.dob ? '<div class="idc-field"><span class="idc-field-label">DOB</span><span class="idc-field-val">' + student.dob + '</span></div>' : ''}
              ${student.phone ? '<div class="idc-field"><span class="idc-field-label">Phone</span><span class="idc-field-val">' + student.phone + '</span></div>' : ''}
            </div>
          </div>
        </div>
        <div class="idc-qr-section">
          <div class="idc-qr-divider"><span>📷 Attendance QR Code</span></div>
          <div class="idc-qr-main">
            <div class="idc-qr-left">
              <div id="${qrId}" class="idc-qr-big-box"></div>
              <div class="idc-qr-scan-label">Scan to mark attendance</div>
            </div>
            <div class="idc-qr-right">
              <div class="idc-qr-student-name">${student.name}</div>
              <div class="idc-qr-roll">🪪 ${student.roll}</div>
              <div class="idc-qr-cls">📚 Class ${student.cls} — Section ${student.section}</div>
              ${student.father ? '<div class="idc-qr-father">👤 ' + student.father + '</div>' : ''}
              <div class="idc-qr-school">🏫 Hira Baitul Hamd</div>
            </div>
          </div>
        </div>
        <div class="idc-footer">
          <span>Session ${year}-${year+1}</span>
          <span>|</span>
          <span>Hira Baitul Hamd - Sukkur</span>
          <span>|</span>
          <span>If found, please return to school</span>
        </div>
      </div>`;
  }

  function renderCard(student, containerId) {
    containerId = containerId || 'id-card-render';
    var wrap = document.getElementById(containerId);
    if (!wrap) return;

    var qrId = 'idc-qr-' + containerId;
    var isStudent = (typeof APP !== 'undefined' && APP.currentPortal === 'student');

    var attendanceBtn = isStudent ? '' : '<button class="btn btn-warning idc-btn" onclick="IDCard.markAttendanceNow(\'' + student.id + '\')">Attendance Mark</button>';

    wrap.innerHTML =
      '<div class="id-card-outer">' +
        _cardHTML(student, qrId) +
        '<div class="idc-actions">' +
          '<button class="btn btn-primary idc-btn" onclick="IDCard.printCard()">Print</button>' +
          '<button class="btn btn-success idc-btn" onclick="IDCard.downloadCard(\'' + student.id + '\')">Save Image</button>' +
          attendanceBtn +
        '</div>' +
      '</div>';

    setTimeout(function() { _makeQR(qrId, student, 160); }, 120);
  }

  function openModal(studentId) {
    var student = DB.get('students').find(function(s) { return s.id === studentId; });
    if (!student) { toast('Student nahi mila!', 'error'); return; }

    var modalEl  = document.getElementById('idCardModal');
    var renderEl = document.getElementById('id-card-modal-render');
    if (!modalEl || !renderEl) { toast('Modal nahi mila!', 'error'); return; }

    var qrId = 'idc-qr-modal';
    renderEl.innerHTML =
      '<div class="id-card-outer" style="padding:0">' + _cardHTML(student, qrId) + '</div>' +
      '<div class="idc-actions" style="margin-top:12px">' +
        '<button class="btn btn-warning w-100" onclick="IDCard.markAttendanceNow(\'' + student.id + '\')">Attendance Mark Karein</button>' +
      '</div>';

    setTimeout(function() { _makeQR(qrId, student, 160); }, 120);
    new bootstrap.Modal(modalEl).show();
  }

  function markAttendanceNow(studentId) {
    var student = DB.get('students').find(function(s) { return s.id === studentId; });
    if (!student) { toast('Student nahi mila!', 'error'); return; }
    if (APP.currentPortal === 'student') {
      toast('Attendance sirf Admin ya Teacher mark kar sakte hain!', 'error');
      return;
    }
    if (typeof QRAttendance !== 'undefined') {
      QRAttendance.markAttendance(student);
    }
  }

  function printCard() {
    window.print();
  }

  function downloadCard(studentId) {
    var card = document.querySelector('.idc-card');
    if (!card) { toast('Card nahi mili!', 'error'); return; }
    if (typeof html2canvas !== 'undefined') {
      html2canvas(card, { scale: 2, useCORS: true, backgroundColor: null })
        .then(function(canvas) {
          var a = document.createElement('a');
          a.download = 'idcard-' + studentId + '.png';
          a.href = canvas.toDataURL('image/png');
          a.click();
          toast('ID Card save ho gayi!');
        });
    } else {
      window.print();
    }
  }

  return {
    renderCard: renderCard,
    openModal: openModal,
    printCard: printCard,
    downloadCard: downloadCard,
    markAttendanceNow: markAttendanceNow,
  };

})();
