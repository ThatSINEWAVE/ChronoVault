document.addEventListener('DOMContentLoaded', () => {
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // File upload handling (Create Tab)
    const fileUpload = document.getElementById('file-upload');
    const fileList = document.getElementById('file-list');
    let uploadedFiles = [];

    fileUpload.addEventListener('change', (e) => {
        uploadedFiles = [...uploadedFiles, ...Array.from(e.target.files)];
        displayFileList();
    });

    function displayFileList() {
        fileList.innerHTML = '';
        uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
                <button class="remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });

        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
                uploadedFiles.splice(btn.dataset.index, 1);
                displayFileList();
            });
        });
    }

    function formatFileSize(bytes) {
        const units = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const exp = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, exp)).toFixed(2)} ${units[exp]}`;
    }

    // Create Capsule Functionality
    const createCapsuleBtn = document.getElementById('create-capsule');
    const passwordInput = document.getElementById('password');
    const unlockDateInput = document.getElementById('unlock-date');
    const capsuleResult = document.getElementById('capsule-result');
    const capsuleIdSpan = document.getElementById('capsule-id');
    const downloadLink = document.getElementById('download-link');

    createCapsuleBtn.addEventListener('click', async () => {
        if (!validateCreateInputs()) return;

        try {
            const zip = new JSZip();
            const password = passwordInput.value;
            const unlockDate = new Date(unlockDateInput.value);

            // Encrypt files
            for (const file of uploadedFiles) {
                const arrayBuffer = await file.arrayBuffer();
                const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
                const encrypted = CryptoJS.AES.encrypt(wordArray, password).toString();
                zip.file(`${file.name}.encrypted`, encrypted);
            }

            // Add metadata
            const metadata = {
                unlockDate: unlockDate.toISOString(),
                creationDate: new Date().toISOString(),
                filesList: uploadedFiles.map(file => ({
                    name: file.name,
                    size: file.size,
                    type: file.type
                }))
            };
            const encryptedMetadata = CryptoJS.AES.encrypt(JSON.stringify(metadata), password).toString();
            zip.file('metadata.json.encrypted', encryptedMetadata);

            // Generate capsule ID
            const capsuleId = CryptoJS.SHA256(password + unlockDate.toISOString()).toString().substr(0, 16);
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE'
            });

            // Update UI and storage
            updateCreateUI(zipBlob, capsuleId);
            storeCapsuleData(capsuleId, unlockDate, password);
        } catch (error) {
            handleCreateError(error);
        }
    });

    function validateCreateInputs() {
        if (uploadedFiles.length === 0) {
            alert('Please select at least one file.');
            return false;
        }
        if (!unlockDateInput.value || new Date(unlockDateInput.value) <= new Date()) {
            alert('Please select a future unlock date.');
            return false;
        }
        if (!/^\d{12}$/.test(passwordInput.value)) {
            alert('Please enter a valid 12-digit password.');
            return false;
        }
        return true;
    }

    function updateCreateUI(zipBlob, capsuleId) {
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = `chronovault-${capsuleId}.zip`;
        capsuleIdSpan.textContent = capsuleId;
        capsuleResult.classList.remove('hidden');
    }

    function storeCapsuleData(capsuleId, unlockDate, password) {
        const storedCapsules = JSON.parse(localStorage.getItem('chronovault-capsules') || '{}');
        storedCapsules[capsuleId] = {
            unlockDate: unlockDate.toISOString(),
            password: password,
            filesList: uploadedFiles.map(f => f.name)
        };
        localStorage.setItem('chronovault-capsules', JSON.stringify(storedCapsules));
    }

    function handleCreateError(error) {
        console.error('Creation error:', error);
        alert('Error creating capsule. Please try again.');
    }

    // Check Capsule Functionality
    const checkCapsuleBtn = document.getElementById('check-capsule');
    const checkIdInput = document.getElementById('check-id');
    const checkResult = document.getElementById('check-result');
    const lockedMessage = document.getElementById('locked-message');
    const unlockedMessage = document.getElementById('unlocked-message');
    const unlockDateDisplay = document.getElementById('unlock-date-display');
    const countdownElements = {
        days: document.getElementById('days'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds')
    };
    let countdownInterval = null;

    checkCapsuleBtn.addEventListener('click', () => {
        const capsuleId = checkIdInput.value.trim();
        if (!capsuleId) return alert('Please enter a capsule ID.');

        const capsuleData = getCapsuleData(capsuleId);
        if (!capsuleData) return alert('Capsule not found.');

        const unlockDate = new Date(capsuleData.unlockDate);
        updateCheckUI(unlockDate, capsuleId);
    });

    function getCapsuleData(capsuleId) {
        const storedCapsules = JSON.parse(localStorage.getItem('chronovault-capsules') || '{}');
        return storedCapsules[capsuleId];
    }

    function updateCheckUI(unlockDate, capsuleId) {
        const now = new Date();
        unlockDateDisplay.textContent = unlockDate.toLocaleString();

        if (unlockDate <= now) {
            showUnlockedMessage(capsuleId);
        } else {
            showCountdown(unlockDate);
        }
        checkResult.classList.remove('hidden');
    }

    function showUnlockedMessage(capsuleId) {
        lockedMessage.classList.add('hidden');
        unlockedMessage.innerHTML = `
            <h3>Capsule Ready!</h3>
            <p>To open your capsule, please upload it in the Open Capsule tab.</p>
            <button class="btn primary" onclick="switchTab('open')">
                Go to Open Capsule Tab
            </button>
        `;
        unlockedMessage.classList.remove('hidden');
    }

    function showCountdown(targetDate) {
        lockedMessage.classList.remove('hidden');
        unlockedMessage.classList.add('hidden');
        updateCountdown(targetDate);
        countdownInterval = setInterval(() => updateCountdown(targetDate), 1000);
    }

    function updateCountdown(targetDate) {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            clearInterval(countdownInterval);
            showUnlockedMessage();
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdownElements.days.textContent = days.toString().padStart(2, '0');
        countdownElements.hours.textContent = hours.toString().padStart(2, '0');
        countdownElements.minutes.textContent = minutes.toString().padStart(2, '0');
        countdownElements.seconds.textContent = seconds.toString().padStart(2, '0');
    }

    // Open Capsule Functionality
    const capsuleUpload = document.getElementById('capsule-upload');
    const manualCapsuleIdInput = document.getElementById('manual-capsule-id');
    const openStatus = document.getElementById('open-status');
    const openLocked = document.getElementById('open-locked');
    const openUnlocked = document.getElementById('open-unlocked');
    let currentZip = null;
    let currentCapsuleData = null;

    capsuleUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let capsuleId = extractCapsuleId(file.name) || manualCapsuleIdInput.value.trim();
        if (!capsuleId) return alert('Please enter capsule ID.');

        currentCapsuleData = getCapsuleData(capsuleId);
        if (!currentCapsuleData) return alert('Capsule not found.');

        try {
            currentZip = await JSZip.loadAsync(file);
            handleUnlockStatus(new Date(currentCapsuleData.unlockDate), capsuleId);
            switchTab('open');
        } catch (error) {
            alert('Invalid capsule file.');
        }
    });

    function extractCapsuleId(filename) {
        const match = filename.match(/chronovault-([a-f0-9]{16})\.zip/i);
        return match ? match[1] : null;
    }

    function handleUnlockStatus(unlockDate, capsuleId) {
        const now = new Date();
        openStatus.classList.remove('hidden');

        if (unlockDate > now) {
            openLocked.classList.remove('hidden');
            openUnlocked.classList.add('hidden');
            startOpenCountdown(unlockDate);
        } else {
            openLocked.classList.add('hidden');
            openUnlocked.classList.remove('hidden');

            openUnlocked.innerHTML = `
                <h3>Capsule Ready to Open!</h3>
                <p>Your capsule is now ready to be decrypted. Click the button below to access your files.</p>
                <button id="auto-decrypt-capsule" class="btn primary">
                    <i class="fas fa-unlock"></i> Extract Files
                </button>
                <div id="decrypted-files" class="hidden"></div>
            `;

            document.getElementById('auto-decrypt-capsule').addEventListener('click', async () => {
                try {
                    const password = currentCapsuleData.password;
                    const metadata = await decryptMetadata(password);
                    await decryptFiles(metadata.filesList, password);
                } catch (error) {
                    alert("Error decrypting capsule: " + error.message);
                }
            });
        }
    }

    function startOpenCountdown(targetDate) {
        updateOpenCountdown(targetDate);
        const interval = setInterval(() => {
            if (updateOpenCountdown(targetDate)) {
                clearInterval(interval);
            }
        }, 1000);
    }

    function updateOpenCountdown(targetDate) {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            handleUnlockStatus(targetDate);
            return true;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        openLocked.querySelector('#days').textContent = days.toString().padStart(2, '0');
        openLocked.querySelector('#hours').textContent = hours.toString().padStart(2, '0');
        openLocked.querySelector('#minutes').textContent = minutes.toString().padStart(2, '0');
        openLocked.querySelector('#seconds').textContent = seconds.toString().padStart(2, '0');
        return false;
    }

    async function decryptMetadata(password) {
        const encryptedMetadata = await currentZip.file('metadata.json.encrypted').async('string');
        const decrypted = CryptoJS.AES.decrypt(encryptedMetadata, password);
        try {
            return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        } catch {
            throw new Error('Invalid password or corrupted metadata');
        }
    }

    async function decryptFiles(filesList, password) {
        const decryptedFilesDiv = document.getElementById('decrypted-files');
        if (!decryptedFilesDiv) {
            alert('Decryption container not found');
            return;
        }

        decryptedFilesDiv.innerHTML = '';
        const decryptedZip = new JSZip();

        for (const fileInfo of filesList) {
            const encryptedFile = currentZip.file(`${fileInfo.name}.encrypted`);
            if (!encryptedFile) continue;

            const encryptedContent = await encryptedFile.async('string');
            const decrypted = CryptoJS.AES.decrypt(encryptedContent, password);

            // Convert decrypted content to appropriate format for JSZip
            const decryptedContent = decrypted.toString(CryptoJS.enc.Latin1);
            decryptedZip.file(fileInfo.name, decryptedContent, {
                binary: true
            });
        }

        // Generate the decrypted zip and provide download link
        const decryptedBlob = await decryptedZip.generateAsync({
            type: 'blob'
        });

        const fileDiv = document.createElement('div');
        fileDiv.className = 'decrypted-files-container';
        fileDiv.innerHTML = `
            <h3>Your files have been successfully decrypted!</h3>
            <a class="btn primary download-all"
               href="${URL.createObjectURL(decryptedBlob)}"
               download="decrypted_files.zip">
                <i class="fas fa-download"></i> Download All Files
            </a>
            <p class="hint">You can also download individual files below:</p>
        `;
        decryptedFilesDiv.appendChild(fileDiv);

        // Also add individual file download links
        const individualFilesDiv = document.createElement('div');
        individualFilesDiv.className = 'individual-files';

        for (const fileInfo of filesList) {
            const encryptedFile = currentZip.file(`${fileInfo.name}.encrypted`);
            if (!encryptedFile) continue;

            const encryptedContent = await encryptedFile.async('string');
            const decrypted = CryptoJS.AES.decrypt(encryptedContent, password);
            const blob = new Blob([decrypted.toString(CryptoJS.enc.Latin1)], {
                type: fileInfo.type
            });

            const fileElement = document.createElement('div');
            fileElement.className = 'decrypted-file';
            fileElement.innerHTML = `
                ${fileInfo.name} (${formatFileSize(fileInfo.size)})
                <a class="btn secondary download-decrypted"
                   href="${URL.createObjectURL(blob)}"
                   download="${fileInfo.name}">
                    <i class="fas fa-download"></i> Download (Broken)
                </a>
            `;
            individualFilesDiv.appendChild(fileElement);
        }

        decryptedFilesDiv.appendChild(individualFilesDiv);
        decryptedFilesDiv.classList.remove('hidden');
    }

    // Utility function
    window.switchTab = (tabName) => {
        document.querySelector(`.tab-btn[data-tab="${tabName}"]`).click();
    };
});