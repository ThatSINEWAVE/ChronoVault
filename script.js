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

    // Reset button functionality
    function addResetButtons() {
        // Create reset button for Create tab
        const createResetBtn = document.createElement('button');
        createResetBtn.innerHTML = '<i class="fas fa-redo"></i> Reset';
        createResetBtn.className = 'btn secondary reset-btn';
        createResetBtn.addEventListener('click', resetCreateTab);
        document.querySelector('#create-tab .create-container').appendChild(createResetBtn);

        // Create reset button for Access tab
        const accessResetBtn = document.createElement('button');
        accessResetBtn.innerHTML = '<i class="fas fa-redo"></i> Reset';
        accessResetBtn.className = 'btn secondary reset-btn';
        accessResetBtn.addEventListener('click', resetAccessTab);
        document.querySelector('#access-tab .access-container').appendChild(accessResetBtn);
    }

    function resetCreateTab() {
        uploadedFiles = [];
        fileList.innerHTML = '';
        passwordInput.value = '';
        unlockDateInput.value = '';
        capsuleResult.classList.add('hidden');
    }

    function resetAccessTab() {
        document.getElementById('capsule-upload').value = '';
        document.getElementById('capsule-id-input').value = '';
        document.getElementById('access-status').classList.add('hidden');
        currentZip = null;
        currentCapsuleData = null;
        currentCapsuleId = null;

        // Clear any ongoing countdown
        if (currentCountdownInterval) {
            clearInterval(currentCountdownInterval);
            currentCountdownInterval = null;
        }
    }

    // Combined Access Capsule functionality
    const capsuleUpload = document.getElementById('capsule-upload');
    const capsuleIdInput = document.getElementById('capsule-id-input');
    const checkCapsuleBtn = document.getElementById('check-capsule');
    const accessStatus = document.getElementById('access-status');
    let currentZip = null;
    let currentCapsuleData = null;
    let currentCapsuleId = null;
    let currentCountdownInterval = null;

    // Handle both file upload and ID input
    checkCapsuleBtn.addEventListener('click', async () => {
        const file = capsuleUpload.files[0];
        const capsuleId = extractCapsuleId(file?.name) || capsuleIdInput.value.trim();
        currentCapsuleId = capsuleId;

        if (!capsuleId && !file) return alert('Please provide a capsule ID or upload file');

        try {
            if (file) {
                currentZip = await JSZip.loadAsync(file);
                currentCapsuleData = getCapsuleData(capsuleId);

                if (currentCapsuleData) {
                    const unlockDate = new Date(currentCapsuleData.unlockDate);
                    handleAccessStatus(unlockDate, capsuleId, true);
                } else {
                    // Try to extract metadata directly from the file to get unlock date
                    try {
                        const metadata = await extractMetadataFromZip(currentZip);
                        handleAccessStatus(new Date(metadata.unlockDate), capsuleId, true);
                    } catch (e) {
                        throw new Error('Could not access capsule data. Password needed.');
                    }
                }
            } else {
                // Only have ID, no file
                currentCapsuleData = getCapsuleData(capsuleId);
                if (!currentCapsuleData) throw new Error('Capsule not found');

                const unlockDate = new Date(currentCapsuleData.unlockDate);
                handleAccessStatus(unlockDate, capsuleId, false);
            }

            accessStatus.classList.remove('hidden');
        } catch (error) {
            alert(error.message || 'Error accessing capsule');
        }
    });

    async function extractMetadataFromZip(zip) {
        // This is a fallback when we don't have the data in localStorage
        // We'll need to try all possible files and see if we can find the metadata
        const files = Object.keys(zip.files);
        const metadataFile = files.find(f => f === 'metadata.json.encrypted');

        if (!metadataFile) {
            throw new Error('Invalid capsule format: metadata not found');
        }

        // We found metadata but we can't decrypt it without password
        throw new Error('Password required to access capsule data');
    }

    function handleAccessStatus(unlockDate, capsuleId, hasFile) {
        const now = new Date();
        document.getElementById('unlock-date-display').textContent = unlockDate.toLocaleString();

        if (unlockDate <= now) {
            if (hasFile) {
                // If we have the file and time is up, show auto decrypt UI
                showAutoDecryptUI();
            } else {
                // If we only have ID and time is up, ask for file upload
                showUploadPrompt();
            }
        } else {
            showCountdown(unlockDate);
        }
    }

    function showAutoDecryptUI() {
        document.getElementById('locked-message').classList.add('hidden');

        const decryptUI = document.getElementById('unlocked-interface');
        decryptUI.classList.remove('hidden');

        // Modify the UI to show auto-decrypt option instead of password
        decryptUI.innerHTML = `
            <div id="decryption-ui">
                <h3>Capsule Ready to Open!</h3>
                <p>This time capsule's unlock date has passed and it's ready to be opened.</p>
                <button id="auto-decrypt-capsule" class="btn primary">
                    <i class="fas fa-unlock"></i> Open Capsule
                </button>
            </div>
            <div id="decrypted-files" class="hidden"></div>
        `;

        // Add event listener to the new button
        document.getElementById('auto-decrypt-capsule').addEventListener('click', async () => {
            await autoDecryptCapsule();
        });
    }

    function showUploadPrompt() {
        document.getElementById('locked-message').classList.add('hidden');

        const decryptUI = document.getElementById('unlocked-interface');
        decryptUI.classList.remove('hidden');

        // Show message asking user to upload the capsule
        decryptUI.innerHTML = `
            <div id="decryption-ui">
                <h3>Capsule Ready to Open!</h3>
                <p>This time capsule's unlock date has passed and it's ready to be opened.</p>
                <p>Please upload the capsule file to decrypt it:</p>
                <div class="form-group">
                    <label for="ready-capsule-upload">
                        <i class="fas fa-file-archive"></i> Upload Capsule
                    </label>
                    <input type="file" id="ready-capsule-upload" accept=".zip">
                </div>
                <button id="process-uploaded-capsule" class="btn primary">
                    <i class="fas fa-unlock"></i> Process Capsule
                </button>
            </div>
            <div id="decrypted-files" class="hidden"></div>
        `;

        // Add event listener for the new upload button
        document.getElementById('process-uploaded-capsule').addEventListener('click', async () => {
            const fileInput = document.getElementById('ready-capsule-upload');
            const file = fileInput.files[0];

            if (!file) {
                return alert('Please upload the capsule file');
            }

            try {
                currentZip = await JSZip.loadAsync(file);
                await autoDecryptCapsule();
            } catch (error) {
                alert(`Error processing capsule: ${error.message}`);
            }
        });
    }

    function showCountdown(targetDate) {
        document.getElementById('locked-message').classList.remove('hidden');
        document.getElementById('unlocked-interface').classList.add('hidden');
        updateCountdown(targetDate);

        // Clear any existing countdown
        if (currentCountdownInterval) {
            clearInterval(currentCountdownInterval);
        }

        currentCountdownInterval = setInterval(() => {
            if (updateCountdown(targetDate)) {
                clearInterval(currentCountdownInterval);
                currentCountdownInterval = null;
                // Auto refresh the view when countdown completes
                checkCapsuleBtn.click();
            }
        }, 1000);
    }

    function updateCountdown(targetDate) {
        const now = new Date();
        const diff = targetDate - now;
        if (diff <= 0) return true;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        return false;
    }

    // Auto-decryption functionality
    async function autoDecryptCapsule() {
        try {
            if (!currentCapsuleData && !currentZip) {
                throw new Error('No capsule data or file available');
            }

            // Use the stored password if available
            const password = currentCapsuleData ? currentCapsuleData.password : null;

            if (!password) {
                throw new Error('Cannot auto-decrypt without stored password');
            }

            const metadata = await decryptMetadata(password);
            await decryptFiles(metadata.filesList, password);
            document.getElementById('decrypted-files').classList.remove('hidden');
        } catch (error) {
            alert(`Decryption failed: ${error.message}`);
        }
    }

    function getCapsuleData(capsuleId) {
        const storedCapsules = JSON.parse(localStorage.getItem('chronovault-capsules') || '{}');
        return storedCapsules[capsuleId];
    }

    function extractCapsuleId(filename) {
        const match = filename?.match(/chronovault-([a-f0-9]{16})\.zip/i);
        return match ? match[1] : null;
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

            // Convert decrypted content to Uint8Array for proper binary handling
            const wordArray = decrypted.toString(CryptoJS.enc.Base64);
            const binaryString = atob(wordArray);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Add to zip and create blob for individual download
            decryptedZip.file(fileInfo.name, bytes);
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

        // Add individual file download links
        const individualFilesDiv = document.createElement('div');
        individualFilesDiv.className = 'individual-files';

        // Get all files from the decrypted zip
        const files = Object.keys(decryptedZip.files).filter(name => !decryptedZip.files[name].dir);

        for (const fileName of files) {
            const fileBlob = await decryptedZip.file(fileName).async('blob');

            const fileElement = document.createElement('div');
            fileElement.className = 'decrypted-file';

            // Find the matching file info from our list
            const fileInfo = filesList.find(f => f.name === fileName);
            const fileSize = fileInfo ? formatFileSize(fileInfo.size) : '';

            fileElement.innerHTML = `
                ${fileName} ${fileSize ? `(${fileSize})` : ''}
                <a class="btn secondary download-decrypted"
                   href="${URL.createObjectURL(fileBlob)}"
                   download="${fileName}">
                    <i class="fas fa-download"></i> Download
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

    // Add reset buttons to the UI
    addResetButtons();
});