// ===== بيانات اللعبة (محفوظة محلياً أثناء العرض) =====
let gameData = {
  playedIds: new Set(),
  // لم تعد هناك حاجة لتخزين بيانات اللاعبين محلياً
  prizes: {
    prize50: 5,   // 5 فائزين 50 = 250
    prize25: 14   // 14 فائزين 25 = 350
  },
};

// ===== رابط Google Apps Script URL الذي أنشأته =====
const googleAppsScriptURL = 'https://script.google.com/macros/s/AKfycbwSjk3Gb7TneL-1oHc98m1xrE7M5CUisobZuur1uhvyGK4IAyjYdf84kvn1oPP6XVni/exec';


// ===== تعريف القطاعات (الزوايا كما هي) =====
const segments = [
  { name: '50 شيكل', icon: '💰', class: 'win-50', startAngle: 0, endAngle: 72, stopAngle: 36 },
  { name: 'شماسي سيارة', icon: '☂️', class: 'win-sunshade', startAngle: 72, endAngle: 144, stopAngle: 108 },
  { name: '25 شيكل', icon: '💵', class: 'win-25', startAngle: 144, endAngle: 216, stopAngle: 180 },
  { name: 'حظ أوفر', icon: '🍀', class: 'win-luck', startAngle: 216, endAngle: 288, stopAngle: 252 },
  { name: 'مطره مي', icon: '🚰', class: 'win-water', startAngle: 288, endAngle: 360, stopAngle: 324 }
];

// ===== عناصر DOM =====
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const resultDiv = document.getElementById('result');
// لم تعد هناك حاجة لزر التصدير
// const exportBtn = document.getElementById('exportBtn');

// تهيئة الأحداث
document.addEventListener('DOMContentLoaded', function() {
  spinBtn.addEventListener('click', startSpin);
  // حذف event listener لزر التصدير
  // exportBtn.addEventListener('click', exportToExcel);
  updateStats();
});

// ===== دوال التحقق والرسائل =====
function validateInput() {
  const id = document.getElementById('playerId').value.trim();
  const phone = document.getElementById('playerPhone').value.trim();

  document.getElementById('errorMsg').style.display = 'none';
  document.getElementById('successMsg').style.display = 'none';

  if (!/^\d{9}$/.test(id)) { showError('يجب أن يكون رقم الهوية 9 أرقام فقط'); return false; }
  if (!/^05\d{8}$/.test(phone)) { showError('يجب أن يكون رقم الهاتف 10 أرقام ويبدأ بـ 05'); return false; }
  if (gameData.playedIds.has(id)) { showError('هذا الرقم قد لعب مسبقاً'); return false; }

  return true;
}
function showError(message) {
  const errorDiv = document.getElementById('errorMsg');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}
function showSuccess(message) {
  const successDiv = document.getElementById('successMsg');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
}

// ===== مؤثر confetti =====
function createConfetti() {
  const colors = ['#f00','#0f0','#00f','#ff0','#f0f','#0ff'];
  for (let i=0;i<60;i++){
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random()*window.innerWidth + 'px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
    confetti.style.animationDelay = Math.random()*1.5 + 's';
    document.body.appendChild(confetti);
    setTimeout(()=>document.body.removeChild(confetti), 2200);
  }
}

// ===== وظيفة بدء الدوران (اللوجيك لم يتغير) =====
function startSpin() {
  if (!validateInput()) return;

  spinBtn.disabled = true;
  resultDiv.style.display = 'none';

  let availableSegments = [];
  segments.forEach((segment, index) => {
    if (segment.name === '50 شيكل' && gameData.prizes.prize50 <= 0) return;
    if (segment.name === '25 شيكل' && gameData.prizes.prize25 <= 0) return;
    availableSegments.push(index);
  });

  if (availableSegments.length === 0) {
    availableSegments = segments.filter(s => s.name !== '50 شيكل' && s.name !== '25 شيكل').map((_, i) => i);
  }

  const selectedSegmentIndex = availableSegments[Math.floor(Math.random() * availableSegments.length)];
  const selectedSegment = segments[selectedSegmentIndex];

  const baseRotations = 5 * 360;
  const stopAngle = 360 - selectedSegment.stopAngle;
  const totalRotation = baseRotations + stopAngle;

  wheel.style.transition = 'none';
  wheel.style.transform = `rotate(5deg)`;

  setTimeout(()=> {
    wheel.style.transition = 'transform 4s cubic-bezier(0.17,0.89,0.32,0.98)';
    wheel.style.transform = `rotate(${totalRotation}deg)`;
  }, 50);

  setTimeout(()=> {
    showResult(selectedSegment);

    const id = document.getElementById('playerId').value.trim();
    const phone = document.getElementById('playerPhone').value.trim();
    const prize = selectedSegment.name;

    gameData.playedIds.add(id);

    // إرسال البيانات إلى Google Sheets
    sendToGoogleSheets(id, phone, prize);
    
    if (prize === '50 شيكل') {
      gameData.prizes.prize50--;
      createConfetti();
    } else if (prize === '25 شيكل') {
      gameData.prizes.prize25--;
      createConfetti();
    }

    // تحديث الإحصائيات (تحديث العدد الإجمالي فقط)
    updateStats();

    document.getElementById('playerId').value = '';
    document.getElementById('playerPhone').value = '';
    spinBtn.disabled = false;

  }, 4200);
}

// عرض النتيجة
function showResult(result) {
  resultDiv.innerHTML = `${result.icon} ${result.name} ${result.icon}`;
  resultDiv.className = `result ${result.class}`;
  resultDiv.style.display = 'flex';
}

// ===== تحديث الإحصائيات (معدّل) =====
function updateStats() {
  // بما أن البيانات لا تُحفظ محلياً، يجب عليك الاعتماد على مصدر خارجي لعدد اللاعبين.
  // في هذه الحالة، سنعتمد على عدد الـ IDs التي لعبت فقط.
  document.getElementById('totalPlayers').textContent = gameData.playedIds.size;
 
  // تأثير التحديث البصري
  const statElement = document.getElementById('totalPlayers');
  if (statElement && statElement.parentElement) {
    statElement.parentElement.classList.add('highlight');
    setTimeout(()=> statElement.parentElement.classList.remove('highlight'), 1400);
  }
}


// تحديث قائمة اللاعبين (تبقى مخفية)
// تم حذف هذه الوظيفة لأن البيانات لم تعد تُحفظ محلياً
// function updatePlayersList() {
//   const listDiv = document.getElementById('playersList');
//   let html = '<h3>قائمة اللاعبين:</h3>';
//   gameData.players.slice(-10).reverse().forEach(player => {
//     html += `<div class="player-item">${player.id} - ${player.phone} - ${player.prize} - ${player.timestamp}</div>`;
//   });
//   listDiv.innerHTML = html;
// }

// ===== تصدير إلى Excel (تم حذفه بالكامل) =====
// function exportToExcel() { ... }

// دالة مساعدة للوقت
// لم تعد هناك حاجة لهذه الدالة لأن Google Sheets يسجل الوقت بنفسه
// function getGregorianNow() { ... }


// ===== دالة جديدة لإرسال البيانات إلى Google Sheets =====
function sendToGoogleSheets(id, phone, prize) {
  const data = {
    id: id,
    phone: phone,
    prize: prize
  };
  
  const formData = new FormData();
  for (const key in data) {
    formData.append(key, data[key]);
  }

  fetch(googleAppsScriptURL, {
    method: 'POST',
    mode: 'no-cors', // مهم جداً
    body: formData
  }).then(response => {
    console.log('Data sent to Google Sheets');
  }).catch(error => {
    console.error('Error sending data to Google Sheets:', error);
  });
}