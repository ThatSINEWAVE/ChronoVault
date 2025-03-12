<div align="center">

[# ChronoVault](https://thatsinewave.github.io/ChronoVault) 

ChronoVault is a **digital time capsule** web application that allows users to securely store files that can only be accessed at a predetermined future date. The files are sealed with encryption and require a **12-digit password** to unlock when the time comes.

![Banner](https://raw.githubusercontent.com/ThatSINEWAVE/ChronoVault/refs/heads/main/.github/SCREENSHOTS/ChronoVault.png)

[**Live Demo**](https://thatsinewave.github.io/ChronoVault)

</div>

## Features

- **Upload & Encrypt Files** – Users can select multiple files to be included in the time capsule.
- **Set Unlock Date** – The capsule remains locked until the selected date.
- **Generate a Unique Capsule ID** – A unique identifier is created based on the unlock date and password.
- **Secure Encryption** – Files and metadata are encrypted using **AES encryption** with CryptoJS.
- **Download Capsule** – The sealed capsule is stored as a `.zip` file with encrypted contents.
- **Check Unlock Status** – Users can enter their Capsule ID to see when it will unlock.
- **Countdown Timer** – Displays a real-time countdown until the capsule can be opened.
- **Unlocking Mechanism** – After the unlock date, users must enter the correct **12-digit password** to decrypt their capsule.

<div align="center">

## ☕ [Support my work on Ko-Fi](https://ko-fi.com/thatsinewave)

</div>

## How It Works

1. **Create a Capsule**
   - Select files to include.
   - Set an unlock date.
   - Enter a **12-digit password** (used for encryption & unlocking).
   - Download the sealed capsule `.zip` file.  

2. **Check a Capsule's Status**
   - Enter the Capsule ID.
   - View the remaining time until unlock.

3. **Unlock a Capsule**
   - Once the unlock date is reached, enter the **12-digit password**.
   - If the password is correct, the encrypted files can be decrypted.

## Notes

- **Security Warning**: This project stores encryption passwords in localStorage for demonstration purposes. A production-ready version should **never** store plaintext passwords client-side.
- **No Server-Side Storage**: Capsules are not stored on a server; users must **keep their downloaded capsule safe**.

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/ThatSINEWAVE/ChronoVault.git
   cd ChronoVault
   ```
2. Open `index.html` in your browser.

## Tech Stack

- **HTML/CSS/JavaScript** – Core frontend technologies.
- **JSZip** – Used to create and manage the encrypted `.zip` capsules.
- **CryptoJS** – Provides AES encryption for file security.
- **Font Awesome** – Icons for the UI.
- **GitHub Pages** – Hosting the live demo.


<div align="center">

## [Join my Discord server](https://discord.gg/2nHHHBWNDw)

</div>

## Contributing

Feel free to submit issues or contribute improvements via pull requests.

## License

This project is open-source and available under the [MIT License](LICENSE).