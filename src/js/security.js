/**
 * Security bootstrap - loaded first.
 * Clickjacking defence: GitHub Pages cannot send X-Frame-Options / frame-ancestors headers,
 * so if the app is loaded inside someone else's <iframe>, break out (or hide it).
 */
(function () {
    try {
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }
    } catch (e) {
        // Cross-origin frame: cannot navigate the parent, so hide the app instead
        document.documentElement.style.display = 'none';
    }
})();
