# DeepTrust AI 🔍⛓️

Blockchain-verified deepfake detector. Upload face image → AI flag real/fake → verdict + image hash record on-chain (Ethereum Sepolia), independently checkable via Etherscan.

🏆 Top project, KIET AI + Blockchain Bootcamp.

## What It Do

- Detect deepfake face image via fine-tuned Vision Transformer (ViT)
- Flask REST API serve inference
- Solidity smart contract store verdict + hash on Sepolia testnet — permanent, tamper-proof, verify-anywhere
- MetaMask connect, on-chain record button in UI

## Stack

- **Backend:** Python, Flask, HuggingFace (ViT model), Mediapipe
- **Blockchain:** Solidity, Ethereum (Sepolia testnet), Remix IDE, Ethers.js, MetaMask
- **Frontend:** HTML, CSS, vanilla JS

## Folder Structure

```
deeptrust-ai/
├── index.html            ← open this in browser
├── styles.css
├── app.js
├── backend/
│   ├── app.py            ← Flask server
│   ├── deepfake_model.py
│   └── requirements.txt
└── VerificationStore.sol ← deploy via Remix
```

## Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server run at `http://localhost:5000`. First run download ViT model (~350MB from HuggingFace) — patience need.

### 2. Frontend

Open `index.html` direct in browser, or use VS Code Live Server (avoid CORS headache).

### 3. Blockchain (one-time)

1. Go [remix.ethereum.org](https://remix.ethereum.org)
2. Create `VerificationStore.sol`, paste contract code
3. Compile Solidity 0.8.20+
4. Deploy & Run → Environment: Injected Provider – MetaMask
5. MetaMask set to **Sepolia testnet** (get test ETH: [sepoliafaucet.com](https://sepoliafaucet.com))
6. Deploy → confirm in MetaMask
7. Copy deployed contract address
8. Paste into `backend/app.py` → `CONTRACT_ADDRESS = "0x..."`
9. Restart backend

## Usage Flow

1. Start backend: `python backend/app.py`
2. Open `index.html`
3. Click **CONNECT METAMASK**
4. Upload face image
5. Click **INITIATE ANALYSIS**
6. View verdict
7. Click **RECORD ON-CHAIN** → verdict + hash saved to Sepolia

## Troubleshoot

| Error | Fix |
|---|---|
| `No module named mediapipe` | `pip install mediapipe==0.10.14` |
| `No face detected` | use clear, well-lit front-face photo |
| `500 Internal Server Error` | check terminal, model probably still loading |
| MetaMask wrong network | switch to Sepolia |
| CORS error | use Live Server extension |

## License

MIT
