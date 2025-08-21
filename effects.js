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
	
	for(let i = 0; i < 10; i++){
		setTimeout(() => {
			spawnEmojiConfetti('👏', `${10+(70*Math.random())}vw`, `${10+(70*Math.random())}vh`);
		}, (1000*Math.random()));
	}
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


const spawnEmojiConfetti = (emoji, x, y, callback) => {
	const emojiElement = document.createElement('div');
    emojiElement.textContent = emoji;
    emojiElement.style.cssText = `
        position: fixed;
        left: ${x};
        top: ${y};
        font-size: ${4*Math.random()+2}vmin;
        pointer-events: none;
        z-index: 9999;
        opacity: .5;
        transition: transform 0.3s ease-out, opacity 0.2s ease-in;
    `;
    document.body.appendChild(emojiElement);
	
    // Animate it to slide up then away
    setTimeout(() => {
        emojiElement.style.transform = `translate(${20*Math.random()-10}vw, ${20*Math.random()-10}vh) scale(${0.7+Math.random()})`;
        emojiElement.style.opacity = '.8';
		setTimeout(() => {
            emojiElement.remove();
			if (callback)
				callback();
        }, 200+50*Math.random());
    }, 50+50*Math.random());
}


const showSparkleEffect = (x = '50%', y = '50%', callback = () => {}) => {
	
	for(let i = 0; i < 5; i++){
		spawnEmojiConfetti('⭐', x, y);
	}
	spawnEmojiConfetti('⭐', x, y, callback);
};




// Expose functions globally
window.showWinEffect = showWinEffect;
window.showGameOverEffect = showGameOverEffect;
window.showSparkleEffect = showSparkleEffect;