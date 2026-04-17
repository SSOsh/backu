/**
 * 빠큐 - Interactive Pop Web App
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
let animationId = null;

// 성능 제한
const MAX_PARTICLES = 300;

// 설정 로드
function loadSettings() {
    const saved = localStorage.getItem('backuSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        fadeTime = settings.fadeTime || 0.5;
        effectType = settings.effectType || 'firework';
        updateUI();
    }
}

// 설정 저장
function saveSettings() {
    localStorage.setItem('backuSettings', JSON.stringify({
        fadeTime,
        effectType
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
}

// Canvas 리사이즈
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

// 이모지 클래스
class Emoji {
    constructor(x, y) {
        this.x = x;
        this.y = y;
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
        ctx.fillText('🖕', 0, 0);
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

        // 시간에 맞게 속도 스케일링 (기준: 0.5초)
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
    constructor(x, y, velocity, scale, duration) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.duration = duration;
        this.opacity = 1;
        this.rotation = Math.random() * Math.PI * 2;
        this.createdAt = performance.now();

        // 시간에 맞게 속도 스케일링 (기준: 0.5초)
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
        ctx.fillText('🖕', 0, 0);
        ctx.restore();
    }
}

// 불꽃놀이 효과 생성
function createFirework(x, y, scale) {
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'];
    // 파티클 수 제한 (scale 커져도 최대 80개)
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
function createEmojiSpread(x, y, scale) {
    // 파티클 수 제한 (scale 커져도 최대 30개)
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

        particles.push(new EmojiParticle(x, y, velocity, particleScale, fadeTime));
    }
}

// 햅틱 피드백
function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// 현재 활성 이모지 (누르고 있는 중)
let currentEmoji = null;
let lastTime = performance.now();

// 포인터 이벤트 핸들러
canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;

    currentEmoji = new Emoji(x, y);
    activeEmojis.push(currentEmoji);

    vibrate(10);
});

canvas.addEventListener('pointermove', (e) => {
    if (currentEmoji) {
        currentEmoji.x = e.clientX;
        currentEmoji.y = e.clientY;
    }
});

canvas.addEventListener('pointerup', (e) => {
    if (currentEmoji) {
        const scale = currentEmoji.scale;
        const x = currentEmoji.x;
        const y = currentEmoji.y;

        // 효과 생성
        if (effectType === 'firework') {
            createFirework(x, y, scale);
        } else {
            createEmojiSpread(x, y, scale);
        }

        // 페이드 아웃 시작
        currentEmoji.startFade();
        currentEmoji = null;

        vibrate([20, 50, 30]);
    }
});

canvas.addEventListener('pointercancel', () => {
    if (currentEmoji) {
        currentEmoji.startFade();
        currentEmoji = null;
    }
});

// 전체 클리어
function clearAll() {
    activeEmojis = [];
    particles = [];
    currentEmoji = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    // 404 화면 표시
    document.getElementById('error404').classList.add('show');

    // 짧은 딜레이 후 구글로 이동
    setTimeout(() => {
        window.location.replace('https://www.google.com');
    }, 100);
}

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
const modalClose = document.querySelector('.modal-close');

aboutBtn.addEventListener('click', () => {
    aboutModal.classList.add('show');
});

modalClose.addEventListener('click', () => {
    aboutModal.classList.remove('show');
});

aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
        aboutModal.classList.remove('show');
    }
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

    // 캔버스 클리어
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 현재 누르고 있는 이모지 성장
    if (currentEmoji) {
        currentEmoji.grow(deltaTime);
    }

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
