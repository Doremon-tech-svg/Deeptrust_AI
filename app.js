const BACKEND_URL = "http://localhost:5000";

// ---- STATE ----
let selectedFile = null;
let analysisResult = null;
let walletAddress = null;
let blockchainData = null;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initDropZone();
  initFileInput();
  log("Frontend ready. Connect wallet and upload an image to begin.", "info");
});

// ---- PARTICLES ----
function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.setProperty('--dur', `${6 + Math.random() * 10}s`);
    p.style.setProperty('--delay', `${Math.random() * 10}s`);
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
    p.style.left = `${Math.random() * 100}%`;
    if (Math.random() > 0.7) {
      p.style.background = 'var(--pink)';
      p.style.opacity = '0.4';
    }
    container.appendChild(p);
  }
}

// ---- DRAG AND DROP ----
function initDropZone() {
  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    } else {
      log("Invalid file type. Please upload an image.", "error");
    }
  });
}

function initFileInput() {
  document.getElementById('fileInput').addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
}

// ---- FILE HANDLING ----
function handleFile(file) {
  selectedFile = file;
  log(`File selected: ${file.name} (${formatBytes(file.size)})`, "info");

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataURL = e.target.result;

    // Show canvas preview
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      canvas.classList.remove('hidden');
      document.getElementById('uploadInner').style.display = 'none';

      // Image info
      document.getElementById('imageInfo').classList.remove('hidden');
      document.getElementById('infoName').textContent = file.name;
      document.getElementById('infoSize').textContent = formatBytes(file.size);
      document.getElementById('infoDims').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;

      // Hash
      computeHash(file).then(hash => {
        document.getElementById('infoHash').textContent = hash;
      });

      // Enable analyze button
      document.getElementById('analyzeBtn').disabled = false;
    };
    img.src = dataURL;
  };
  reader.readAsDataURL(file);
}

async function computeHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16) + '…';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ---- ANALYZE ----
async function analyzeImage() {
  if (!selectedFile) return;

  // Switch to loading state
  setResultsState('loading');
  document.getElementById('analyzeBtn').disabled = true;

  const loadingMessages = [
    "Uploading image to analysis server...",
    "Running MediaPipe face detection...",
    "Cropping facial region...",
    "Running ViT model inference...",
    "Computing deepfake probability...",
    "Preparing blockchain data...",
  ];

  const logDiv = document.getElementById('loadingLog');
  logDiv.innerHTML = '';

  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    if (msgIdx < loadingMessages.length) {
      const d = document.createElement('div');
      d.textContent = '> ' + loadingMessages[msgIdx++];
      logDiv.appendChild(d);
      logDiv.scrollTop = logDiv.scrollHeight;
      log(d.textContent.slice(2));
    }
  }, 600);

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);

    const response = await fetch(`${BACKEND_URL}/detect`, {
      method: 'POST',
      body: formData,
    });

    clearInterval(msgInterval);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Server error ${response.status}`);
    }

    analysisResult = await response.json();
    blockchainData = analysisResult.blockchain_data;

    log(`Analysis complete: ${analysisResult.prediction} (score: ${(analysisResult.deepfake_score * 100).toFixed(1)}%)`, "success");

    // Draw face box on canvas
    drawFaceBox(analysisResult.face);

    // Show results
    displayResults(analysisResult);
    setResultsState('output');

    // Show blockchain record button if wallet connected
    if (walletAddress) {
      document.getElementById('recordBtn').classList.remove('hidden');
    }

    // Update contract address display
    if (blockchainData) {
      document.getElementById('contractAddr').textContent =
        blockchainData.contract_address.slice(0, 10) + '…' + blockchainData.contract_address.slice(-6);
    }

  } catch (err) {
    clearInterval(msgInterval);
    log(`Error: ${err.message}`, "error");
    setResultsState('idle');
    document.getElementById('analyzeBtn').disabled = false;

    // Show a user-friendly error in loading log
    const d = document.createElement('div');
    d.style.color = 'var(--pink)';
    d.textContent = '✗ Error: ' + err.message;
    document.getElementById('loadingLog').appendChild(d);
    setTimeout(() => setResultsState('idle'), 3000);
  }
}

// ---- DRAW FACE BOX ----
function drawFaceBox(face) {
  if (!face) return;
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');

  // Scale factors if canvas display size differs from natural size
  const scaleX = face.imgW ? canvas.width / face.imgW : 1;
  const scaleY = face.imgH ? canvas.height / face.imgH : 1;

  const x = face.x * scaleX;
  const y = face.y * scaleY;
  const w = face.w * scaleX;
  const h = face.h * scaleY;

  ctx.strokeStyle = analysisResult?.prediction === 'Deepfake' ? '#ff007a' : '#00f5ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 12;

  // Corner brackets
  const cs = 20; // corner size
  ctx.beginPath();
  // Top-left
  ctx.moveTo(x + cs, y); ctx.lineTo(x, y); ctx.lineTo(x, y + cs);
  // Top-right
  ctx.moveTo(x + w - cs, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cs);
  // Bottom-left
  ctx.moveTo(x, y + h - cs); ctx.lineTo(x, y + h); ctx.lineTo(x + cs, y + h);
  // Bottom-right
  ctx.moveTo(x + w - cs, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cs);
  ctx.stroke();

  // Label
  ctx.shadowBlur = 0;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = 'bold 13px "Share Tech Mono"';
  ctx.fillText('FACE DETECTED', x + 4, y - 6);

  document.getElementById('faceBoxInfo').textContent =
    `Face region: x=${face.x} y=${face.y} w=${face.w}px h=${face.h}px`;
}

// ---- DISPLAY RESULTS ----
function displayResults(data) {
  const score = data.deepfake_score;
  const isDeepfake = data.prediction === 'Deepfake';
  const pct = Math.round(score * 100);

  // Verdict
  const badge = document.getElementById('verdictBadge');
  badge.className = 'verdict-badge ' + (isDeepfake ? 'fake' : 'real');
  document.getElementById('verdictLabel').textContent = isDeepfake ? 'DEEPFAKE' : 'AUTHENTIC';

  // Score bar
  document.getElementById('scoreNum').textContent = pct + '%';
  document.getElementById('scoreNum').style.color = isDeepfake ? 'var(--pink)' : 'var(--cyan)';

  setTimeout(() => {
    document.getElementById('scoreBarFill').style.width = pct + '%';
    document.getElementById('scoreBarMarker').style.left = pct + '%';
  }, 100);

  // Rings
  const circum = 201;
  const confidence = isDeepfake ? score : 1 - score;
  const confPct = Math.round(confidence * 100);

  const riskScore = isDeepfake ? score : 1 - score;
  const riskPct = Math.round(riskScore * 100);

  const integrityPct = isDeepfake ? Math.round((1 - score) * 100) : Math.round(score * 100);

  animateRing('ring1', circum, confPct);
  animateRing('ring2', circum, riskPct);
  animateRing('ring3', circum, integrityPct);

  document.getElementById('metricConf').textContent = confPct + '%';
  document.getElementById('metricRisk').textContent = riskPct > 70 ? 'HIGH' : riskPct > 40 ? 'MED' : 'LOW';
  document.getElementById('metricInteg').textContent = integrityPct + '%';

  log(`Verdict: ${data.prediction} | Deepfake probability: ${pct}% | Confidence: ${confPct}%`, "success");
}

function animateRing(id, circum, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = circum - (circum * pct / 100);
  setTimeout(() => {
    el.style.strokeDashoffset = offset;
  }, 200);
}

// ---- RESULTS STATE MACHINE ----
function setResultsState(state) {
  document.getElementById('resultsIdle').classList.add('hidden');
  document.getElementById('resultsLoading').classList.add('hidden');
  document.getElementById('resultsOutput').classList.add('hidden');

  if (state === 'idle')    document.getElementById('resultsIdle').classList.remove('hidden');
  if (state === 'loading') document.getElementById('resultsLoading').classList.remove('hidden');
  if (state === 'output')  document.getElementById('resultsOutput').classList.remove('hidden');
}

// ---- METAMASK / WALLET ----
async function connectWallet() {
  if (!window.ethereum) {
    log("MetaMask not detected. Please install MetaMask extension.", "error");
    alert("MetaMask not found. Please install the MetaMask browser extension.");
    return;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    walletAddress = accounts[0];

    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) {
      log("Wrong network! Please switch MetaMask to Ethereum Sepolia testnet.", "warn");
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    }

    document.getElementById('walletAddr').textContent =
      walletAddress.slice(0, 8) + '…' + walletAddress.slice(-6);
    document.getElementById('connectWalletBtn').textContent = 'WALLET CONNECTED ✓';
    document.getElementById('connectWalletBtn').style.borderColor = 'var(--cyan)';
    document.getElementById('connectWalletBtn').style.color = 'var(--cyan)';

    if (analysisResult) {
      document.getElementById('recordBtn').classList.remove('hidden');
    }

    log(`Wallet connected: ${walletAddress.slice(0,10)}…`, "success");
  } catch (err) {
    log("Wallet connection failed: " + err.message, "error");
  }
}

// ---- BLOCKCHAIN RECORD ----
async function recordOnBlockchain() {
  if (!walletAddress || !blockchainData) {
    log("Wallet not connected or no analysis data available.", "error");
    return;
  }

  const CONTRACT_ABI = [
    {
      "inputs": [
        { "internalType": "bytes32", "name": "_imageHash", "type": "bytes32" },
        { "internalType": "uint256", "name": "_score",     "type": "uint256" },
        { "internalType": "string",  "name": "_verdict",   "type": "string"  }
      ],
      "name": "storeVerification",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  try {
    document.getElementById('chainTxStatus').textContent = 'SIGNING…';
    document.getElementById('chainTxStatus').style.color = 'var(--yellow)';
    log("Requesting transaction signature from MetaMask…", "info");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();

    const contract = new ethers.Contract(
      blockchainData.contract_address,
      CONTRACT_ABI,
      signer
    );

    const imageHashBytes = '0x' + blockchainData.image_hash;

    const tx = await contract.storeVerification(
      imageHashBytes,
      blockchainData.scaled_score,
      blockchainData.prediction
    );

    document.getElementById('chainTxStatus').textContent = 'PENDING…';
    log(`Transaction submitted: ${tx.hash}`, "info");
    document.getElementById('txHash').textContent =
      tx.hash.slice(0, 12) + '…' + tx.hash.slice(-8);

    const receipt = await tx.wait();
    document.getElementById('chainTxStatus').textContent = 'CONFIRMED ✓';
    document.getElementById('chainTxStatus').style.color = 'var(--cyan)';

    log(`✅ Transaction confirmed in block ${receipt.blockNumber}`, "success");

    const explorerUrl = `${blockchainData.explorer_base}/tx/${tx.hash}`;
    document.getElementById('explorerLink').href = explorerUrl;
    document.getElementById('chainExplorer').classList.remove('hidden');

    document.getElementById('recordBtn').disabled = true;
    document.getElementById('recordBtn').textContent = 'RECORDED ✓';

  } catch (err) {
    document.getElementById('chainTxStatus').textContent = 'FAILED';
    document.getElementById('chainTxStatus').style.color = 'var(--pink)';
    log("Blockchain record failed: " + err.message, "error");
  }
}

// ---- LOG TERMINAL ----
function log(message, type = '') {
  const terminal = document.getElementById('terminalBody');
  const line = document.createElement('div');
  line.className = 'log-line ' + type;
  const now = new Date();
  const ts = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
  line.innerHTML = `<span class="log-time">[${ts}]</span> ${escapeHtml(message)}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
