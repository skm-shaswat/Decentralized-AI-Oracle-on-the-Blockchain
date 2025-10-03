const config = {
    googleAiKey: "PASTE_YOUR_GOOGLE_AI_API_KEY_HERE",
    pinataJwt: "PASTE_YOUR_PINATA_JWT_API_KEY_HERE",
    contractAddress: "PASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE",
    contractAbi: [
        {
            "inputs": [{"internalType": "string", "name": "_ipfsHash", "type": "string"}],
            "name": "store",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "ipfsHash",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]
};

const promptInput = document.getElementById('prompt-input');
const askButton = document.getElementById('ask-button');
const aiResponseDiv = document.getElementById('ai-response');
const blockchainStatusDiv = document.getElementById('blockchain-status');

const getAiResponse = async (prompt) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.googleAiKey}`;
    const headers = { "Content-Type": "application/json" };
    const body = { "contents": [{ "parts": [{ "text": prompt }] }] };

    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Google AI API failed: ${response.statusText}`);
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
};

const uploadToIpfs = async (prompt, response) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    const headers = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.pinataJwt}` 
    };
    const body = {
        pinataContent: { prompt, response, timestamp: new Date().toISOString() },
        pinataMetadata: { name: "Eternal AI Oracle Entry" }
    };

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Pinata API failed: ${res.statusText}`);
    
    const data = await res.json();
    return data.IpfsHash;
};

const storeOnBlockchain = async (ipfsHash) => {
    if (!window.ethereum) throw new Error("MetaMask is not installed. Please install it to continue.");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    
    const contract = new ethers.Contract(config.contractAddress, config.contractAbi, signer);

    blockchainStatusDiv.innerHTML += `<br>Please approve the transaction in MetaMask...`;
    const tx = await contract.store(ipfsHash);
    await tx.wait();
    
    return tx.hash;
};

const handleConsult = async () => {
    const prompt = promptInput.value;
    if (!prompt) {
        alert("Please provide a question for the Oracle.");
        return;
    }

    askButton.disabled = true;
    askButton.innerText = "Consulting...";
    aiResponseDiv.innerText = "Thinking...";
    blockchainStatusDiv.innerText = "Waiting for the insight...";

    try {
        const aiResponse = await getAiResponse(prompt);
        aiResponseDiv.innerText = aiResponse;

        blockchainStatusDiv.innerText = "Uploading insight to decentralized storage...";
        const ipfsHash = await uploadToIpfs(prompt, aiResponse);
        blockchainStatusDiv.innerHTML = `✅ Insight stored on IPFS.<br>Hash: ${ipfsHash}`;

        const txHash = await storeOnBlockchain(ipfsHash);
        blockchainStatusDiv.innerHTML += `<br>✅ Proof recorded on-chain.<br>Tx: <a href="https://amoy.polygonscan.com/tx/${txHash}" target="_blank">${txHash.substring(0, 10)}...</a>`;

    } catch (error) {
        console.error(error);
        blockchainStatusDiv.innerText = `An error occurred: ${error.message}`;
    } finally {
        askButton.disabled = false;
        askButton.innerText = "Consult the Oracle";
    }
};

askButton.addEventListener('click', handleConsult);
