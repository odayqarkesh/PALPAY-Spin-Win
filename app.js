
let gameData = {
    playedIds: new Set(),
    prizes: {
        prize50: 2,          
        bottle: 15,        
        packagePalPay: 10   
    }
};


const googleAppsScriptURL = 'https://script.google.com/macros/s/AKfycbxK1nn3DZ3dV2kRgnPC2tuObDk-4vF0Wnhw_LcMkQU3U2cjoRdLFge38rlgCjZFhXmg/exec';


const segments = [
    { name: '50 شيكل', icon: '💰', class: 'win-50', startAngle: 0, endAngle: 120, stopAngle: 60, winnable: true, prizeKey: 'prize50' },
    { name: 'مطرة', icon: '🥤', class: 'win-mug', startAngle: 120, endAngle: 240, stopAngle: 180, winnable: true, prizeKey: 'bottle' },
    { name: 'بكج بال باي', icon: '🎁', class: 'win-25', startAngle: 240, endAngle: 360, stopAngle: 300, winnable: true, prizeKey: 'packagePalPay' }
];

// =====  DOM =====
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

    // فلترة القطاعات المتاحة بناءً على المخزون المتبقي
    const winnableSegments = segments.filter(segment => {
        if (!segment.winnable) return false; 
        if (gameData.prizes[segment.prizeKey] <= 0) return false;
        return true;
    });

    if (winnableSegments.length === 0) {
        showError('عذراً، لقد نفدت جميع الجوائز!');
        spinBtn.disabled = false;
        return;
    }

    // اختيار قطاع عشوائي من الجوائز المتبقية
    const selectedSegment = winnableSegments[Math.floor(Math.random() * winnableSegments.length)];

    // حساب زاوية الدوران لتقف عند القطاع المختار
    const baseRotations = 5 * 360;
    const stopAngle = 360 - selectedSegment.stopAngle;
    const totalRotation = baseRotations + stopAngle;

    // إضافة تغيير طفيف عشوائي لتبدو الوقفة طبيعية داخل القطاع العريض (120 درجة)
    const randomOffset = Math.floor(Math.random() * 40) - 20; 
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
        
        // خصم الجائزة وتشغيل الحفلة
        gameData.prizes[selectedSegment.prizeKey]--;
        createConfetti();

        // إرسال البيانات إلى Google Sheets
        sendToGoogleSheets(id, phone, prize, timestamp);

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

// ===== دالة الإرسال المتوافقة مع السيرفر وتمنع الـ CORS =====
function sendToGoogleSheets(id, phone, prize, timestamp) {
    const data = { id, phone, prize, timestamp };
    
    const formBody = [];
    for (const property in data) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(data[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    const finalBody = formBody.join("&");

    fetch(googleAppsScriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: finalBody
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
