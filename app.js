// ===== بيانات اللعبة (معدّلة حسب القواعد الجديدة) =====
let gameData = {
    playedIds: new Set(),
    prizes: {
        prize25: 16,      // 16 فائزين * 25 شيكل = 400 شيكل
        cup: 25,          // 20 كوب كحد أقصى
        waterBottle: 25,  // 20 مطرة كحد أقصى
      //  sunShade: 35      // 30 شمسية سيارة كحد أقصى
    }
};

// ===== رابط Google Apps Script URL الذي أنشأته =====
const googleAppsScriptURL = 'https://script.google.com/macros/s/AKfycbxZ7NtD5UqDnwiQzbqUNP4zpbWzA6NIGyBgzGiDGX_UK2xlZoHWNyKSaR6j_XFl0g/exec';

// ===== تعريف القطاعات (مع تعديل جائزة الكوب) =====
const segments = [
    { name: '50 شيكل', icon: '💵', class: 'win-50', startAngle: 0, endAngle: 72, stopAngle: 36 },
    { name: '100 شيكل', icon: '💰', class: 'win-sunshade', startAngle: 72, endAngle: 144, stopAngle: 108 },
    { name: '25 شيكل', icon: '💵', class: 'win-25', startAngle: 144, endAngle: 216, stopAngle: 180 },
    { name: 'Cup', icon: '🏆', class: 'win-cup', startAngle: 216, endAngle: 288, stopAngle: 252 }, 
    { name: 'مطره مي', icon: '🚰', class: 'win-water', startAngle: 288, endAngle: 360, stopAngle: 324 }
];

// ===== عناصر DOM =====
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const resultDiv = document.getElementById('result');

// تهيئة الأحداث
document.addEventListener('DOMContentLoaded', function() {
    spinBtn.addEventListener('click', startSpin);
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
    const colors = ['#27ae60','#3498db','#f1c40f','#e74c3c'];
    for (let i=0; i<80; i++){
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 1.5 + 's';
        document.body.appendChild(confetti);
        setTimeout(() => document.body.removeChild(confetti), 2200);
    }
}

// ===== وظيفة بدء الدوران (اللوجيك الجديد لاختيار الجوائز المتاحة) =====
function startSpin() {
    if (!validateInput()) return;

    spinBtn.disabled = true;
    resultDiv.style.display = 'none';

    // فلترة القطاعات القابلة للربح فقط
    const winnableSegments = segments.filter(segment => {
        // إذا كان اسم القطاع هو '50 شيكل'، لا يمكن ربحه حالياً 
        if (segment.name === '50 شيكل') return false;
        if (segment.name === '100 شيكل') return false;
        // التحقق من توافر الجوائز المحدودة
        if (segment.name === '25 شيكل' && gameData.prizes.prize25 <= 0) return false;
        if (segment.name === 'Cup' && gameData.prizes.cup <= 0) return false; 
        if (segment.name === 'مطره مي' && gameData.prizes.waterBottle <= 0) return false;
      //  if (segment.name === 'شماسي سيارة' && gameData.prizes.sunShade <= 0) return false;
        
        return true;
    });

    if (winnableSegments.length === 0) {
        showError('عذراً، لقد نفدت جميع الجوائز!');
        spinBtn.disabled = false;
        return;
    }

    const selectedSegment = winnableSegments[Math.floor(Math.random() * winnableSegments.length)];

    const baseRotations = 5 * 360;
    const stopAngle = 360 - selectedSegment.stopAngle;
    const totalRotation = baseRotations + stopAngle;

    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(5deg)`;

    setTimeout(() => {
        wheel.style.transition = 'transform 4s cubic-bezier(0.17,0.89,0.32,0.98)';
        wheel.style.transform = `rotate(${totalRotation}deg)`;
    }, 50);

    setTimeout(() => {
        showResult(selectedSegment);

        const id = document.getElementById('playerId').value.trim();
        const phone = document.getElementById('playerPhone').value.trim();
        const prize = selectedSegment.name;
        const timestamp = getGregorianNow();

        gameData.playedIds.add(id);
        sendToGoogleSheets(id, phone, prize, timestamp);
        
        // تحديث عدد الجوائز المتبقية
        switch(prize) {
            case '25 شيكل':
                gameData.prizes.prize25--;
                createConfetti();
                break;
            case 'Cup': // تم التعديل هنا لـ 'Cup'
                gameData.prizes.cup--;
                createConfetti();
                break;
            case 'مطره مي':
                gameData.prizes.waterBottle--;
                break;
        /*    case 'شماسي سيارة':
                gameData.prizes.sunShade--;
                break;*/
            // لا يوجد حالة لـ 'حظ أوفر' هنا بعد الآن
        }

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

// ===== تحديث الإحصائيات (مبسطة) =====
function updateStats() {
    document.getElementById('totalPlayers').textContent = gameData.playedIds.size;
    
    const totalPlayersElement = document.getElementById('totalPlayers');
    if (totalPlayersElement && totalPlayersElement.parentElement) {
        totalPlayersElement.parentElement.classList.add('highlight');
        setTimeout(() => totalPlayersElement.parentElement.classList.remove('highlight'), 1400);
    }
}

// ===== دالة لإرسال البيانات إلى Google Sheets (مُحسّنة) =====
function sendToGoogleSheets(id, phone, prize, timestamp) {
    const data = { id, phone, prize, timestamp };
    
    fetch(googleAppsScriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(() => {
        console.log('Data sent to Google Sheets successfully.');
        showSuccess('تم تسجيل فوزك بنجاح!');
    })
    .catch(error => {
        console.error('Error sending data to Google Sheets:', error);
        showError('حدث خطأ أثناء تسجيل البيانات، يرجى المحاولة مرة أخرى.');
    });
}

// دالة مساعدة للحصول على الوقت الحالي
function getGregorianNow() {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}





