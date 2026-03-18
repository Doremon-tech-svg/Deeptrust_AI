# DeepTrust AI — Setup Guide

## Folder Structure
```
deeptrust-ai/
├── index.html           ← Open this in browser
├── styles.css
├── app.js
├── backend/
│   ├── app.py           ← Flask server
│   ├── deepfake_model.py
│   └── requirements.txt
└── VerificationStore.sol ← Deploy on Remix
```

---

## 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server starts at **http://localhost:5000**

> First run downloads the ViT model (~350MB from Hugging Face — be patient)

---

## 2. Frontend

Just open `index.html` in your browser (or use VS Code Live Server).

> ⚠️ You may need to allow CORS in your browser or serve via Live Server if you hit CORS errors.

---

## 3. Blockchain (One-Time Setup)

1. Go to **https://remix.ethereum.org**
2. Create `VerificationStore.sol`, paste the contract code
3. Compile with Solidity 0.8.20+
4. In "Deploy & Run" → Environment: **Injected Provider – MetaMask**
5. Make sure MetaMask is on **Sepolia testnet** (get test ETH from https://sepoliafaucet.com)
6. Click **Deploy** → confirm in MetaMask
7. Copy the deployed address
8. Paste it in `backend/app.py` → `CONTRACT_ADDRESS = "0x..."`
9. Restart the backend

---

## Usage

1. Start backend: `python backend/app.py`
2. Open `index.html`
3. Click **CONNECT METAMASK** (Panel 03)
4. Upload a face image (Panel 01)
5. Click **INITIATE ANALYSIS**
6. View results (Panel 02)
7. Click **RECORD ON-CHAIN** to store on Sepolia

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `No module named mediapipe` | `pip install mediapipe==0.10.14` |
| `No face detected` | Use a clear, well-lit front-facing photo |
| `500 Internal Server Error` | Check terminal — usually model not loaded yet |
| MetaMask wrong network | Switch to Sepolia in MetaMask |
| CORS error in browser | Use Live Server extension in VS Code |
