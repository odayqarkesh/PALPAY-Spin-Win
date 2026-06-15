// ===== بيانات اللعبة والمخزون المتبقي للجوائز =====
let gameData = {
    playedIds: new Set(),
    prizes: {
        prize50: 2,         // قسم 50 شيكل - شخصين فقط
        bottle: 9,         // قسم مطرة - 15 مطرة
        packagePalPay: 9   // قسم بكج بال باي - 10 بكجات
    }
};

// ===== رابط Google Apps Script الخاص بك =====
const googleAppsScriptURL = 'https://script.google.com/macros/s/AKfycbyOJqiztzKudU1sTpt-Q57h_DjPBDx5mvfEjMDnGNOiZTEMrxrB6r27P9eOUD9WaCCeRQ/exec';

// ===== حساب الزوايا الدقيقة بناءً على السهم العلوي الثابت (زاوية 0/360) =====
const segments = [
    { name: '50 شيكل', icon: '💰', class: 'win-50', stopAngle: 60, prizeKey: 'prize50' },
    { name: 'مطرة', icon: '🥤', class: 'win-bottle', stopAngle: 180, prizeKey: 'bottle' },
    { name: 'بكج بال باي', icon: '🎁', class: 'win-package', stopAngle: 300, prizeKey: 'packagePalPay' }
];

// ===== عناصر DOM =====
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const resultDiv = document.getElementById('result');

// تهيئة الأحداث عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    spinBtn.addEventListener('click', startSpin);
    updateStats();
});

// ===== دوال التحقق والرسائل =====
function validateInput() {
    const id = document.getElementById('playerId').value.trim();
    const phone = document.getElementById('playerPhone').value.trim();

    document.getElementById('errorMsg').style.display = 'none';

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

// ===== مؤثر confetti (الاحتفال بالفوز) =====
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

// ===== وظيفة بدء الدوران وحساب حركة العجلة =====
function startSpin() {
    if (!validateInput()) return;

    spinBtn.disabled = true;
    resultDiv.style.display = 'none';

    // تصفية الجوائز المتاحة في المخزن
    const winnableSegments = segments.filter(segment => gameData.prizes[segment.prizeKey] > 0);

    if (winnableSegments.length === 0) {
        showError('عذراً، لقد نفدت جميع الجوائز!');
        spinBtn.disabled = false;
        return;
    }

    // اختيار الجائزة عشوائياً من المتاح
    const selectedSegment = winnableSegments[Math.floor(Math.random() * winnableSegments.length)];

    const baseRotations = 5 * 360; // 5 لفات كاملة للحركة البصرية
    const stopAngle = 360 - selectedSegment.stopAngle; // عكس الاتجاه ليطابق السهم العلوي تماماً
    const totalRotation = baseRotations + stopAngle;

    // إضافة تذبذب خفيف ليقف السهم بمنتصف القطاع بشكل مريحوطبيعي
    const randomOffset = Math.floor(Math.random() * 40) - 20;
    const finalRotation = totalRotation + randomOffset;

    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(0deg)`;

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
        gameData.prizes[selectedSegment.prizeKey]--;
        createConfetti();

        // إرسال البيانات فوراً إلى شيت جوجل الخاص بك
        sendToGoogleSheets(id, phone, prize, timestamp);

        updateStats();

        document.getElementById('playerId').value = '';
        document.getElementById('playerPhone').value = '';
        spinBtn.disabled = false;

    }, 4200);
}

// عرض النتيجة أسفل الشاشة
function showResult(result) {
    resultDiv.innerHTML = `${result.icon} ${result.name} ${result.icon}`;
    resultDiv.className = `result ${result.class}`;
    resultDiv.style.display = 'flex';
}

// تحديث العداد السفلي
function updateStats() {
    const totalPlayersElement = document.getElementById('totalPlayers');
    if (totalPlayersElement) {
        totalPlayersElement.textContent = gameData.playedIds.size;
    }
}

// إرسال البيانات المباشرة إلى Google Sheets
function sendToGoogleSheets(id, phone, prize, timestamp) {
    const data = { id, phone, prize, timestamp };
    fetch(googleAppsScriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .catch(error => console.error('Error sending data:', error));
}

// جلب التوقيت الحالي
function getGregorianNow() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
