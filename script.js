document.addEventListener('DOMContentLoaded', () => {
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            // Remove active class from all tabs
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to current tab
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // File upload handling
    const fileUpload = document.getElementById('file-upload');
    const fileList = document.getElementById('file-list');
    let uploadedFiles = [];

    fileUpload.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files);
        uploadedFiles = [...uploadedFiles, ...newFiles];
        displayFileList();
    });

    function displayFileList() {
        fileList.innerHTML = '';

        uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;

            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = formatFileSize(file.size);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', () => {
                uploadedFiles.splice(index, 1);
                displayFileList();
            });

            fileItem.appendChild(fileName);
            fileItem.appendChild(fileSize);
            fileItem.appendChild(removeBtn);
            fileList.appendChild(fileItem);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Create capsule functionality
    const createCapsuleBtn = document.getElementById('create-capsule');
    const passwordInput = document.getElementById('password');
    const unlockDateInput = document.getElementById('unlock-date');
    const capsuleResult = document.getElementById('capsule-result');
    const capsuleIdSpan = document.getElementById('capsule-id');
    const downloadLink = document.getElementById('download-link');

    createCapsuleBtn.addEventListener('click', async () => {
        // Validate inputs
        if (uploadedFiles.length === 0) {
            alert('Please select at least one file to include in your time capsule.');
            return;
        }

        if (!unlockDateInput.value) {
            alert('Please set an unlock date for your time capsule.');
            return;
        }

        const unlockDate = new Date(unlockDateInput.value);
        if (unlockDate <= new Date()) {
            alert('The unlock date must be in the future.');
            return;
        }

        const password = passwordInput.value;
        if (!/^\d{12}$/.test(password)) {
            alert('Please enter a valid 12-digit password.');
            return;
        }

        try {
            // Create zip file with password protection
            const zip = new JSZip();

            // Encrypt each file before adding to the zip
            for (const file of uploadedFiles) {
                // Read the file content
                const arrayBuffer = await file.arrayBuffer();
                const fileContent = new Uint8Array(arrayBuffer);

                // Encrypt file content using CryptoJS
                const wordArray = CryptoJS.lib.WordArray.create(fileContent);
                const encrypted = CryptoJS.AES.encrypt(wordArray, password).toString();

                // Store the encrypted content
                zip.file(file.name + '.encrypted', encrypted);
            }

            // Add unlock date metadata
            const metadata = {
                unlockDate: unlockDate.toISOString(),
                creationDate: new Date().toISOString(),
                filesCount: uploadedFiles.length,
                filesList: uploadedFiles.map(file => ({
                    name: file.name,
                    size: file.size,
                    type: file.type
                }))
            };

            // Encrypt the metadata as well for additional security
            const encryptedMetadata = CryptoJS.AES.encrypt(
                JSON.stringify(metadata),
                password
            ).toString();

            zip.file('metadata.json.encrypted', encryptedMetadata);

            // Generate the zip content
            const zipContent = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 9
                }
            });

            // Generate a hash from password and unlock date for the capsule ID
            const dateString = unlockDate.toISOString();
            const hashInput = password + dateString;
            const capsuleId = CryptoJS.SHA256(hashInput).toString().substring(0, 16);

            // Create download link
            const downloadUrl = URL.createObjectURL(zipContent);
            downloadLink.href = downloadUrl;
            downloadLink.download = `chronovault-${capsuleId}.zip`;

            // Store metadata in localStorage for the check function
            // In a real app, this would be stored in a database on the server
            const storedCapsules = JSON.parse(localStorage.getItem('chronovault-capsules') || '{}');
            storedCapsules[capsuleId] = {
                unlockDate: unlockDate.toISOString(),
                password: password, // In a real app, never store passwords in clear text
                filesList: uploadedFiles.map(file => file.name)
            };
            localStorage.setItem('chronovault-capsules', JSON.stringify(storedCapsules));

            // Show result
            capsuleIdSpan.textContent = capsuleId;
            capsuleResult.classList.remove('hidden');
        } catch (error) {
            console.error('Error creating capsule:', error);
            alert('An error occurred while creating your time capsule. Please try again.');
        }
    });

    // Check capsule functionality
    const checkCapsuleBtn = document.getElementById('check-capsule');
    const checkIdInput = document.getElementById('check-id');
    const checkResult = document.getElementById('check-result');
    const lockedMessage = document.getElementById('locked-message');
    const unlockedMessage = document.getElementById('unlocked-message');
    const unlockDateDisplay = document.getElementById('unlock-date-display');

    // Countdown elements
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');

    // Unlock functionality
    const unlockPasswordInput = document.getElementById('unlock-password');
    const unlockCapsuleBtn = document.getElementById('unlock-capsule');

    let countdownInterval = null;
    let currentCapsuleId = '';

    checkCapsuleBtn.addEventListener('click', () => {
        const capsuleId = checkIdInput.value.trim();
        if (!capsuleId) {
            alert('Please enter a capsule ID.');
            return;
        }

        // Get capsule data from localStorage
        const storedCapsules = JSON.parse(localStorage.getItem('chronovault-capsules') || '{}');
        const capsuleData = storedCapsules[capsuleId];

        if (!capsuleData) {
            alert('Capsule not found. Please check the ID and try again.');
            return;
        }

        // Store current capsule ID for unlock functionality
        currentCapsuleId = capsuleId;

        // Get unlock date
        const unlockDate = new Date(capsuleData.unlockDate);
        const now = new Date();

        // Format unlock date for display
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        };
        unlockDateDisplay.textContent = unlockDate.toLocaleDateString(undefined, options);

        // Check if the capsule is unlocked
        if (unlockDate <= now) {
            // Capsule is unlocked
            lockedMessage.classList.add('hidden');
            unlockedMessage.classList.remove('hidden');
        } else {
            // Capsule is still locked, show countdown
            lockedMessage.classList.remove('hidden');
            unlockedMessage.classList.add('hidden');

            // Clear previous countdown if exists
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }

            // Start countdown
            updateCountdown(unlockDate);
            countdownInterval = setInterval(() => updateCountdown(unlockDate), 1000);
        }

        checkResult.classList.remove('hidden');
    });

    function updateCountdown(targetDate) {
        const now = new Date();
        const timeDifference = targetDate - now;

        if (timeDifference <= 0) {
            // Countdown finished
            clearInterval(countdownInterval);
            lockedMessage.classList.add('hidden');
            unlockedMessage.classList.remove('hidden');
            return;
        }

        // Calculate time components
        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        // Update DOM
        daysElement.textContent = days.toString().padStart(2, '0');
        hoursElement.textContent = hours.toString().padStart(2, '0');
        minutesElement.textContent = minutes.toString().padStart(2, '0');
        secondsElement.textContent = seconds.toString().padStart(2, '0');
    }

    unlockCapsuleBtn.addEventListener('click', () => {
        const enteredPassword = unlockPasswordInput.value.trim();
        if (!/^\d{12}$/.test(enteredPassword)) {
            alert('Please enter a valid 12-digit password.');
            return;
        }

        // Get capsule data from localStorage
        const storedCapsules = JSON.parse(localStorage.getItem('chronovault-capsules') || '{}');
        const capsuleData = storedCapsules[currentCapsuleId];

        if (enteredPassword === capsuleData.password) {
            // Password is correct - in a real implementation, we would offer to decrypt
            // and download the files here
            alert(`Password correct! Your time capsule with ${capsuleData.filesList.length} files is now ready to be accessed. In a full implementation, the files would be decrypted and available for download.`);
        } else {
            alert('Incorrect password. Please try again.');
        }
    });
});