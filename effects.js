// effects.js
// A self-contained, lightweight effects library for the Mahjong game.


const showWinEffect = (callback = () => {}) => {
    const emojiElement = document.createElement('div');
    emojiElement.textContent = '🎉';
    emojiElement.style.cssText = `
        position: fixed;
        bottom: -10vh;
        left: 50%;
        transform: translateX(-50%);
        font-size: 30vw;
        pointer-events: none;
        z-index: 9999;
        opacity: 0;
        transition: transform 0.5s ease-out, opacity 0.2s ease-in;
    `;
    document.body.appendChild(emojiElement);

    // Animate it to slide up
    setTimeout(() => {
        emojiElement.style.transform = 'translate(-50%, -50vh) scale(2)';
        emojiElement.style.opacity = '1';
    }, 100); // Small delay to allow transition to work

    // Animate it to slide back down and remove it
    setTimeout(() => {
        emojiElement.style.transform = 'translate(-50%, -50vh) scale(3)';
        emojiElement.style.opacity = '0';
        setTimeout(() => {
            emojiElement.remove();
            callback(); // Execute callback after the element is removed
        }, 300);
    }, 700);
};

// --- Game Over Effect ---
/**
 * Initiates the game over emoji effect.
 * @param {Function} [callback] A function to call when the effect finishes.
 */
const showGameOverEffect = (callback = () => {}) => {
    const emojiElement = document.createElement('div');
    emojiElement.textContent = '😱';
    emojiElement.style.cssText = `
        position: fixed;
        bottom: -200px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 30vw;
        pointer-events: none;
        z-index: 9999;
        opacity: 0;
        transition: transform 1s ease-out, opacity 0.5s ease-in;
    `;
    document.body.appendChild(emojiElement);
    // Animate it to slide up
    setTimeout(() => {
        emojiElement.style.transform = 'translate(-50%, -300px)';
        emojiElement.style.opacity = '1';
    }, 100); // Small delay to allow transition to work

    // Animate it to slide back down and remove it
    setTimeout(() => {
        emojiElement.style.transform = 'translate(-50%, 200px)';
        emojiElement.style.opacity = '0';
        setTimeout(() => {
            emojiElement.remove();
            callback(); // Execute callback after the element is removed
        }, 1000);
    }, 1500);
};

// Expose functions globally
window.showWinEffect = showWinEffect;
window.showGameOverEffect = showGameOverEffect;
