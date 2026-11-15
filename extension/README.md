# TrabahoCheck browser extension

Reads the job post you are looking at (from your own browser, so Indeed, Upwork,
LinkedIn, etc. are not blocked) and opens TrabahoCheck with the result.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose this `extension` folder.
4. Pin TrabahoCheck from the puzzle-piece menu.

## Use

1. Make sure TrabahoCheck is running (`run-backend.bat` and `run-frontend.bat`).
2. Open a job post.
3. Optional: select just the job text.
4. Click the extension, then **Check this job**.

The page text goes into the link's `#` part, which stays in your browser and is not
sent to any server except your own TrabahoCheck backend.

When you deploy the app, change `APP_URL` at the top of `popup.js`.
