/**
 * 몰래 날려버려 - Interactive Pop Web App
 * @author suho.do
 * @since 2024-01
 */

// Canvas 설정
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 상태 관리
let activeEmojis = [];
let particles = [];
let fadeTime = 0.5;
let effectType = 'firework';
let selectedEmoji = '🖕';
let animationId = null;

// 멀티터치 지원
let activePointers = new Map();

// 콤보 카운터
let comboCount = 0;
let comboTimer = null;
const COMBO_TIMEOUT = 2000;

// 성능 제한
const MAX_PARTICLES = 300;

// 설정 로드
function loadSettings() {
    const saved = localStorage.getItem('backuSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        fadeTime = settings.fadeTime || 0.5;
        effectType = settings.effectType || 'firework';
        selectedEmoji = settings.selectedEmoji || '🖕';
        updateUI();
    }
}

// 설정 저장
function saveSettings() {
    localStorage.setItem('backuSettings', JSON.stringify({
        fadeTime,
        effectType,
        selectedEmoji
    }));
}

// UI 업데이트
function updateUI() {
    document.querySelectorAll('.fade-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.time) === fadeTime);
    });
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.effect === effectType);
    });
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.emoji === selectedEmoji);
    });
}

// Canvas 리사이즈
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

// 화면 흔들림 효과
function shakeScreen(intensity = 'normal') {
    document.body.classList.remove('shake', 'shake-intense');
    void document.body.offsetWidth; // reflow
    
    if (intensity === 'intense') {
        document.body.classList.add('shake-intense');
        setTimeout(() => document.body.classList.remove('shake-intense'), 500);
    } else {
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 300);
    }
}

// 콤보 카운터 업데이트
function updateCombo() {
    comboCount++;

    const counter = document.getElementById('comboCounter');
    const countEl = document.getElementById('comboCount');

    countEl.textContent = comboCount;
    
    // 콤보 숫자에 따른 색상 변화
    if (comboCount >= 30) {
        countEl.style.color = '#ff0000'; // 빨강 (폭발)
        countEl.style.textShadow = '0 0 20px #ff0000, 0 0 40px #ff4757';
    } else if (comboCount >= 20) {
        countEl.style.color = '#ff9f43'; // 주황
        countEl.style.textShadow = '0 0 20px #ff9f43, 0 0 40px #ff9f43';
    } else if (comboCount >= 10) {
        countEl.style.color = '#feca57'; // 노랑
        countEl.style.textShadow = '0 0 20px #feca57, 0 0 40px #feca57';
    } else {
        countEl.style.color = 'white';
        countEl.style.textShadow = '0 0 20px rgba(108, 92, 231, 0.8), 0 0 40px rgba(108, 92, 231, 0.5)';
    }

    counter.classList.add('show');
    counter.classList.remove('pulse');
    void counter.offsetWidth; // reflow
    counter.classList.add('pulse');

    // 고콤보 시 화면 흔들림 강화
    if (comboCount % 10 === 0) {
        shakeScreen('intense');
    }

    // 콤보 타이머 리셋
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
        counter.classList.remove('show');
        comboCount = 0;
    }, COMBO_TIMEOUT);
}

// 이모지 클래스
class Emoji {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.scale = 1;
        this.maxScale = 5;
        this.growing = true;
        this.opacity = 1;
        this.fadeStartTime = null;
        this.rotation = (Math.random() - 0.5) * 0.3;
    }

    grow(deltaTime) {
        if (this.growing && this.scale < this.maxScale) {
            this.scale += deltaTime * 3;
            if (this.scale > this.maxScale) {
                this.scale = this.maxScale;
            }
        }
    }

    startFade() {
        this.growing = false;
        this.fadeStartTime = performance.now();
    }

    update(currentTime) {
        if (this.fadeStartTime) {
            const elapsed = (currentTime - this.fadeStartTime) / 1000;
            this.opacity = Math.max(0, 1 - elapsed / fadeTime);
            return this.opacity > 0;
        }
        return true;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.font = `${40 * this.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}

// 파티클 클래스 (불꽃놀이용)
class Particle {
    constructor(x, y, color, velocity, size, duration) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.duration = duration;
        this.opacity = 1;
        this.createdAt = performance.now();

        const timeScale = 0.5 / duration;
        this.velocity = {
            x: velocity.x * timeScale,
            y: velocity.y * timeScale
        };
        this.gravity = 150 * timeScale * timeScale;
        this.friction = Math.pow(0.98, timeScale);
    }

    update(deltaTime) {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity * deltaTime;

        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        const elapsed = (performance.now() - this.createdAt) / 1000;
        this.opacity = Math.max(0, 1 - elapsed / this.duration);

        return this.opacity > 0;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 이모지 파티클 클래스 (이모지 확산용)
class EmojiParticle {
    constructor(x, y, velocity, scale, duration, emoji) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.duration = duration;
        this.emoji = emoji;
        this.opacity = 1;
        this.rotation = Math.random() * Math.PI * 2;
        this.createdAt = performance.now();

        const timeScale = 0.5 / duration;
        this.velocity = {
            x: velocity.x * timeScale,
            y: velocity.y * timeScale
        };
        this.gravity = 200 * timeScale * timeScale;
        this.friction = Math.pow(0.97, timeScale);
        this.rotationSpeed = (Math.random() - 0.5) * 10 * timeScale;
    }

    update(deltaTime) {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity * deltaTime;

        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;

        const elapsed = (performance.now() - this.createdAt) / 1000;
        this.opacity = Math.max(0, 1 - elapsed / this.duration);

        return this.opacity > 0;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.font = `${30 * this.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}

// 불꽃놀이 효과 생성
function createFirework(x, y, scale) {
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'];
    const particleCount = Math.min(80, Math.floor(30 + scale * 10));
    const available = MAX_PARTICLES - particles.length;
    const actualCount = Math.min(particleCount, available);

    for (let i = 0; i < actualCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.3;
        const speed = (200 + Math.random() * 200) * scale;
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = (4 + Math.random() * 4) * scale;

        particles.push(new Particle(x, y, color, velocity, size, fadeTime));
    }
}

// 이모지 확산 효과 생성
function createEmojiSpread(x, y, scale, emoji) {
    const particleCount = Math.min(30, Math.floor(10 + scale * 4));
    const available = MAX_PARTICLES - particles.length;
    const actualCount = Math.min(particleCount, available);

    for (let i = 0; i < actualCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.5;
        const speed = (250 + Math.random() * 200) * scale;
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        const particleScale = (0.5 + Math.random() * 0.5) * scale;

        particles.push(new EmojiParticle(x, y, velocity, particleScale, fadeTime, emoji));
    }
}

// 햅틱 피드백
function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

let lastTime = performance.now();

// 멀티터치 포인터 이벤트 핸들러
canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const emoji = new Emoji(e.clientX, e.clientY, selectedEmoji);
    activeEmojis.push(emoji);
    activePointers.set(e.pointerId, emoji);
    vibrate(10);
});

canvas.addEventListener('pointermove', (e) => {
    const emoji = activePointers.get(e.pointerId);
    if (emoji) {
        emoji.x = e.clientX;
        emoji.y = e.clientY;
    }
});

canvas.addEventListener('pointerup', (e) => {
    const emoji = activePointers.get(e.pointerId);
    if (emoji) {
        const scale = emoji.scale;
        const x = emoji.x;
        const y = emoji.y;

        // 효과 생성
        if (effectType === 'firework') {
            createFirework(x, y, scale);
        } else {
            createEmojiSpread(x, y, scale, emoji.emoji);
        }

        // 화면 흔들림 (scale이 2 이상일 때)
        if (scale >= 2) {
            shakeScreen();
        }

        // 콤보 업데이트
        updateCombo();

        // 페이드 아웃 시작
        emoji.startFade();
        activePointers.delete(e.pointerId);

        vibrate([20, 50, 30]);
    }
});

canvas.addEventListener('pointercancel', (e) => {
    const emoji = activePointers.get(e.pointerId);
    if (emoji) {
        emoji.startFade();
        activePointers.delete(e.pointerId);
    }
});

// 전체 클리어
function clearAll() {
    activeEmojis = [];
    particles = [];
    activePointers.clear();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 콤보 리셋
    comboCount = 0;
    document.getElementById('comboCounter').classList.remove('show');
    if (comboTimer) clearTimeout(comboTimer);
}

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        clearAll();
    } else if (e.key === 'q' || e.key === 'Q') {
        escape();
    }
});

// Clear 버튼
document.getElementById('clearBtn').addEventListener('click', clearAll);

// 탈출 버튼 (보스 키)
document.getElementById('escapeBtn').addEventListener('click', escape);

function escape() {
    document.getElementById('error404').classList.add('show');
    setTimeout(() => {
        window.location.replace('https://www.google.com');
    }, 100);
}

// 이모지 선택
document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedEmoji = btn.dataset.emoji;
        updateUI();
        saveSettings();
    });
});

// Fade-out 시간 설정
document.querySelectorAll('.fade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        fadeTime = parseFloat(btn.dataset.time);
        updateUI();
        saveSettings();
    });
});

// 효과 타입 설정
document.querySelectorAll('.effect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        effectType = btn.dataset.effect;
        updateUI();
        saveSettings();
    });
});

// About 모달
const aboutModal = document.getElementById('aboutModal');
const aboutBtn = document.getElementById('aboutBtn');

aboutBtn.addEventListener('click', () => {
    aboutModal.classList.add('show');
});

// 공유 모달
const shareModal = document.getElementById('shareModal');
const shareBtn = document.getElementById('shareBtn');

shareBtn.addEventListener('click', () => {
    shareModal.classList.add('show');
});

// 모달 닫기
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('show');
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

// 공유 기능
const SHARE_URL = 'https://ssosh.github.io/backu/';
const SHARE_TEXT = '스트레스 받을 때 몰래 날려버려 🖕';

document.querySelectorAll('.share-social-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const platform = btn.dataset.platform;
        let shareUrl = '';

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;
                window.open(shareUrl, '_blank');
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`;
                window.open(shareUrl, '_blank');
                break;
            case 'kakao':
                // 카카오톡 공유 (카카오 SDK 없이 모바일 앱 스킴 사용)
                const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(SHARE_URL)}`;
                window.open(kakaoUrl, '_blank');
                break;
            case 'copy':
                navigator.clipboard.writeText(SHARE_URL).then(() => {
                    showToast('링크가 복사되었습니다!');
                    shareModal.classList.remove('show');
                });
                break;
        }
    });
});

// 계좌 복사
document.getElementById('copyBtn').addEventListener('click', () => {
    const account = '3333-26-7184989';
    navigator.clipboard.writeText(account).then(() => {
        showToast('계좌번호가 복사되었습니다!');
    }).catch(() => {
        showToast('복사에 실패했습니다.');
    });
});

// 토스트 메시지
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 애니메이션 루프
function animate(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 모든 활성 포인터의 이모지 성장
    activePointers.forEach(emoji => {
        emoji.grow(deltaTime);
    });

    // 이모지 업데이트 및 그리기
    activeEmojis = activeEmojis.filter(emoji => {
        const alive = emoji.update(currentTime);
        if (alive) {
            emoji.draw();
        }
        return alive;
    });

    // 파티클 업데이트 및 그리기
    particles = particles.filter(particle => {
        const alive = particle.update(deltaTime);
        if (alive) {
            particle.draw();
        }
        return alive;
    });

    animationId = requestAnimationFrame(animate);
}

// 초기화
function init() {
    resizeCanvas();
    loadSettings();
    lastTime = performance.now();
    animate(lastTime);
}

// 윈도우 리사이즈 이벤트
window.addEventListener('resize', resizeCanvas);

// 앱 시작
init();
