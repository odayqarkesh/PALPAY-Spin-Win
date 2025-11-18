// ===== بيانات اللعبة (معدّلة: فقط 40 جائزة بقيمة 25 شيكل) =====
let gameData = {
    playedIds: new Set(),
    prizes: {
        prize25: 40,      // التعديل: 40 جائزة بقيمة 25 شيكل
        mug: 0,           // التعديل: تم إيقاف الكؤوس (0)
        prize50: 0,       // 0
        prize100: 0,      // 0
        sunShade: 0       // 0
    }
};

// ===== رابط Google Apps Script URL (لم يتغير) =====
const googleAppsScriptURL = 'https://script.google.com/macros/s/AKfycbxZ7NtD5UqDnwiQzbqUNP4zpbWzA6NIGyBgzGiDGX_UK2xlZoHWNyKSaR6j_XFl0g/exec';

// ===== تعريف القطاعات =====
// التعديل: جعلنا winnable: false للجميع ما عدا الـ 25 شيكل
const segments = [
    { name: '50 شيكل', icon: '💰', class: 'win-50', startAngle: 0, endAngle: 72, stopAngle: 36, winnable: false },      // منظر
    { name: '100 شيكل', icon: '💵', class: 'win-100', startAngle: 72, endAngle: 144, stopAngle: 108, winnable: false }, // منظر
    { name: '25 شيكل', icon: '💵', class: 'win-25', startAngle: 144, endAngle: 216, stopAngle: 180, winnable: true },   // الوحيدة القابلة للربح
    { name: 'MUG', icon: '☕', class: 'win-mug', startAngle: 216, endAngle: 288, stopAngle: 252, winnable: false },      // منظر (تم الإيقاف)
    { name: 'شمسية سيارة', icon: '🚗', class: 'win-sunshade', startAngle: 288, endAngle: 360, stopAngle: 324, winnable: false } // منظر
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

// ===== وظيفة بدء الدوران =====
function startSpin() {
    if (!validateInput()) return;

    spinBtn.disabled = true;
    resultDiv.style.display = 'none';

    // فلترة القطاعات القابلة للربح فقط
    // بما أننا وضعنا winnable: true فقط للـ 25 شيكل، القائمة ستحتوي عليها فقط
    const winnableSegments = segments.filter(segment => {
        if (!segment.winnable) return false; 

        // التحقق من العدد المتبقي
        if (segment.name === '25 شيكل' && gameData.prizes.prize25 <= 0) return false;
        
        return true;
    });

    if (winnableSegments.length === 0) {
        showError('عذراً، لقد نفدت جميع الجوائز!');
        spinBtn.disabled = false;
        return;
    }

    // بما أن القائمة تحتوي فقط على خيار واحد، سيتم اختياره دائماً
    const selectedSegment = winnableSegments[Math.floor(Math.random() * winnableSegments.length)];

    // حساب زاوية الدوران لتقف عند القطاع المختار
    const baseRotations = 5 * 360;
    const stopAngle = 360 - selectedSegment.stopAngle;
    const totalRotation = baseRotations + stopAngle;

    // إضافة تغيير طفيف عشوائي (+/- 10 درجات) لجعل الوقوف يبدو واقعياً داخل القطاع
    const randomOffset = Math.floor(Math.random() * 20) - 10; 
    const finalRotation = totalRotation + randomOffset;

    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(5deg)`;

    setTimeout(() => {
        wheel.style.transition = 'transform 4s cubic-bezier(0.17,0.89,0.32,0.98)';
        wheel.style.transform = `rotate(${finalRotation}deg)`;
    }, 50);

    setTimeout(() => {
        showResult(selectedSegment);

        const id = document.getElementById('playerId').value.trim();
        const phone = document.getElementById('playerPhone').value.trim();
        const prize = selectedSegment.name;
        const timestamp = getGregorianNow();

        gameData.playedIds.add(id);
        sendToGoogleSheets(id, phone, prize, timestamp);
        
        // خصم الجائزة
        if(prize === '25 شيكل') {
            gameData.prizes.prize25--;
            createConfetti();
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

// ===== تحديث الإحصائيات =====
function updateStats() {
    document.getElementById('totalPlayers').textContent = gameData.playedIds.size;
    
    const totalPlayersElement = document.getElementById('totalPlayers');
    if (totalPlayersElement && totalPlayersElement.parentElement) {
        totalPlayersElement.parentElement.classList.add('highlight');
        setTimeout(() => totalPlayersElement.parentElement.classList.remove('highlight'), 1400);
    }
}

// ===== دالة الإرسال (بدون تغيير) =====
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
