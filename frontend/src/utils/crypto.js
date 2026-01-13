import CryptoJS from "crypto-js";


const ITERATIONS = 500000;
const KEY_SIZE = 256 / 32;

// Create key
export const deriveKeys = (email, masterPassword) => {
    const salt = email;
    const masterKeySrc = CryptoJS.PBKDF2(masterPassword, salt, {
        keySize: KEY_SIZE,
        iterations: ITERATIONS
    });
    const masterKey = masterKeySrc.toString();
    const authKey = CryptoJS.HmacSHA512(masterKey, "Auth-Key-Context").toString();
    const encKey = CryptoJS.HmacSHA256(masterKey, "Enc-Key-Context").toString();
    return { authKey, encKey, masterKey };
}

// Encrypt data --> send to backend
export const encryptVault = (dataJson, encKey) => {
    const jsonString = JSON.stringify(dataJson);
    return CryptoJS.AES.encrypt(jsonString, encKey).toString();
};

// Decrypt vault from backend --> JSON 
export const decryptVault = (encryptedString, encKey) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedString, encKey);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedString);
    } catch (e) {
        console.error("Incorrect Key or Error Vault");
        return [];
    }
};

// Create backup key
export const BackupKey = (password, pin) => {
    const pinKey = CryptoJS.PBKDF2(pin, "backup-salt", { keySize: 256 / 32, iterations: 50000 }).toString();
    const payload = JSON.stringify({
        check: "VALID_BACKUP",
        key: password
    });
    return CryptoJS.AES.encrypt(payload, pinKey).toString();
};

export const RecoveryKey = (backupKey, pin) => {
    try {
        const pinKey = CryptoJS.PBKDF2(pin, "backup-salt", { keySize: 256 / 32, iterations: 50000 }).toString();
        const bytes = CryptoJS.AES.decrypt(backupKey, pinKey);
        const json = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        if (json.check === "VALID_BACKUP") return json.key;
        return null;
    } catch (error) {
        return null;
    }
}

export const generateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    return randomPin;
};