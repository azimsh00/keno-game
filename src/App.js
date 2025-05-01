import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
    // State for selected numbers
    const [selectedNumbers, setSelectedNumbers] = useState([]);

    // State for bet amount
    const [betAmount, setBetAmount] = useState('100.00');

    // State for risk level
    const [riskLevel, setRiskLevel] = useState('Classic');

    // State for manual/auto toggle
    const [betMode, setBetMode] = useState('Manual');

    // State for user balance
    const [balance, setBalance] = useState(10000.00);

    // State for compact result display
    const [showCompactResult, setShowCompactResult] = useState(false);
    const [resultData, setResultData] = useState({
        winAmount: 0,
        matchedNumbers: [],
        drawnNumbers: []
    });

    // State for draw animation
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawnResults, setDrawnResults] = useState([]);
    const [drawCount, setDrawCount] = useState(0);

    // State for audio mute
    const [isMuted, setIsMuted] = useState(false);

    // Audio References
    const audioRefs = useRef({
        draw: [], // Array of Audio objects for concurrent sounds
        match: [],
        win: null
    });

    // Number of concurrent audio instances to create
    const CONCURRENT_AUDIO_COUNT = 10; // For rapid draw/match sounds

    // Initialize audio elements
    useEffect(() => {
        // Create multiple instances for draw and match sounds for concurrent playback
        for (let i = 0; i < CONCURRENT_AUDIO_COUNT; i++) {
            audioRefs.current.draw[i] = new Audio('/sounds/draw.mp3');
            audioRefs.current.match[i] = new Audio('/sounds/match2.mp3');
        }
        
        // Single instance for win sound (doesn't need to stack)
        audioRefs.current.win = new Audio('/sounds/win.mp3');

        // Pre-load all sounds
        // Draw sounds
        audioRefs.current.draw.forEach(audio => {
            audio.load();
            audio.volume = 0.5;
        });
        
        // Match sounds
        audioRefs.current.match.forEach(audio => {
            audio.load();
            audio.volume = 0.5;
        });
        
        // Win sound
        audioRefs.current.win.load();
        audioRefs.current.win.volume = 0.5;

        // Cleanup function
        return () => {
            // Clean up draw sounds
            audioRefs.current.draw.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            
            // Clean up match sounds
            audioRefs.current.match.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            
            // Clean up win sound
            if (audioRefs.current.win) {
                audioRefs.current.win.pause();
                audioRefs.current.win.currentTime = 0;
            }
        };
    }, []);

    // Counter for cycling through audio arrays
    const audioIndexRef = useRef({
        draw: 0,
        match: 0
    });

    // Function to play sound that supports concurrent playback
    const playSound = (soundName) => {
        if (isMuted) return;
        
        if (soundName === 'draw' || soundName === 'match') {
            // Get next available audio instance
            const index = audioIndexRef.current[soundName];
            const audio = audioRefs.current[soundName][index];
            
            if (audio) {
                // Play from start
                audio.currentTime = 0;
                audio.play().catch(error => {
                    console.error(`Error playing ${soundName} sound:`, error);
                });
                
                // Update index for next call, cycling through available instances
                audioIndexRef.current[soundName] = (index + 1) % CONCURRENT_AUDIO_COUNT;
            }
        } else if (soundName === 'win' && audioRefs.current.win) {
            // Regular play for win sound
            audioRefs.current.win.currentTime = 0;
            audioRefs.current.win.play().catch(error => {
                console.error(`Error playing win sound:`, error);
            });
        }
    };

    // Toggle mute function
    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    // Add event listener for spacebar to bet again
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.code === 'Space' && !isDrawing && !showCompactResult) {
                handleBet();
            } else if (event.code === 'Space' && showCompactResult) {
                handleCompactResultClose();
                setTimeout(() => {
                    handleBet();
                }, 100);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDrawing, showCompactResult, selectedNumbers, betAmount, balance]);

    // Generate numbers 1-40 for the Keno board
    const generateNumbers = () => {
        const numbers = [];
        for (let i = 1; i <= 40; i++) {
            numbers.push(i);
        }
        return numbers;
    };

    // Handle number selection
    const handleNumberSelect = (number) => {
        if (selectedNumbers.includes(number)) {
            // Remove number if already selected
            setSelectedNumbers(selectedNumbers.filter(num => num !== number));
        } else if (selectedNumbers.length < 10) {
            // Add number if not already selected and less than 10 numbers are selected
            setSelectedNumbers([...selectedNumbers, number]);
        }
        // If 10 numbers are already selected, do nothing (silent handling)
    };

    // Auto pick random numbers
    const handleAutoPick = () => {
        // Clear current selections
        setSelectedNumbers([]);

        // Generate 10 random unique numbers between 1-40
        const randomNumbers = [];
        while (randomNumbers.length < 10) {
            const randomNum = Math.floor(Math.random() * 40) + 1;
            if (!randomNumbers.includes(randomNum)) {
                randomNumbers.push(randomNum);
                // Add a small delay for animation effect (faster)
                setTimeout(() => {
                    setSelectedNumbers(prev => [...prev, randomNum]);
                }, randomNumbers.length * 50); // Faster animation (50ms between selections)
            }
        }
    };

    // Clear all selected numbers
    const handleClearTable = () => {
        setSelectedNumbers([]);
    };

    // Handle risk level change
    const handleRiskChange = (level) => {
        setRiskLevel(level);
    };

    // Handle bet mode change
    const handleBetModeChange = (mode) => {
        setBetMode(mode);
    };

    // Handle bet amount change
    const handleBetAmountChange = (event) => {
        // Limit to 2 decimal places and validate input
        const value = event.target.value;
        if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
            setBetAmount(value);
        }
    };

    // Handle quick bet amount buttons
    const handleQuickBetAmount = (multiplier) => {
        if (multiplier === '½') {
            setBetAmount((parseFloat(betAmount) / 2).toFixed(2));
        } else if (multiplier === '2x') {
            setBetAmount((parseFloat(betAmount) * 2).toFixed(2));
        }
    };

    // Calculate winnings based on matched numbers and risk level
    const calculateWinnings = (matched) => {
        // Base multipliers by risk level and number of matches
        const multipliers = {
            'Classic': [0, 0, 0, 1.4, 2.25, 4.5, 8.0, 17.0, 50.0, 80.0, 100.0],
            'Low': [0, 0, 1.10, 1.20, 1.30, 1.80, 3.50, 13.00, 50.00, 250.0, 1000.0],
            'Medium': [0, 0, 0, 1.1, 1.3, 1.8, 3.5, 13.0, 50.0, 250.0, 1000.0],
            'High': [0, 0, 0, 0, 3.5, 8.0, 13.0, 83.0, 500.0, 800.0, 1000.0]
        };

        // Get multiplier based on risk level and number of matches
        const multiplier = multipliers[riskLevel][matched.length];

        // Calculate winnings
        return parseFloat(betAmount) * multiplier;
    };

    // Generate random draw numbers
    const generateDrawNumbers = () => {
        // We need to draw 10 numbers
        const numbers = [];
        while (numbers.length < 10) {
            const randomNum = Math.floor(Math.random() * 40) + 1;
            if (!numbers.includes(randomNum)) {
                numbers.push(randomNum);
            }
        }
        return numbers;
    };

    // Handle the drawing animation - Improved for better visualization with faster speed
    const handleDrawAnimation = (drawnNumbers) => {
        setIsDrawing(true);
        setDrawnResults([]);
        setDrawCount(0);

        // Animate drawing one number at a time with faster pace
        drawnNumbers.forEach((number, index) => {
            setTimeout(() => {
                // Increment draw count
                setDrawCount(index + 1);

                // Add to drawn results
                setDrawnResults(prev => [...prev, number]);

                // Play appropriate sound based on whether the number matches a selected number
                if (selectedNumbers.includes(number)) {
                    playSound('match');
                } else {
                    // Play draw sound for numbers that AREN'T matches
                    playSound('draw');
                }

                // Check if this is the last number
                if (index === drawnNumbers.length - 1) {
                    setTimeout(() => {
                        setIsDrawing(false);

                        // Show result popup only if there's a win
                        const matchedNumbers = selectedNumbers.filter(num => drawnNumbers.includes(num));
                        const winAmount = calculateWinnings(matchedNumbers);
                        
                        if (winAmount > 0) {
                            showWinResultPopup(matchedNumbers, drawnNumbers);
                        }
                    }, 200);
                }
            }, 130 * (index + 1)); // 60ms delay between each number - faster
        });
    };

    // Show win result popup
    const showWinResultPopup = (matchedNumbers, drawnNumbers) => {
        const winAmount = calculateWinnings(matchedNumbers);

        // Play win sound if there's a win
        if (winAmount > 0) {
            playSound('win');
        }

        // Add winnings to balance
        setBalance(prevBalance => {
            return parseFloat((prevBalance + winAmount).toFixed(2));
        });
            
        // Set result data for the popup
        setResultData({
            winAmount,
            matchedNumbers,
            drawnNumbers
        });

        // Show result popup
        setShowCompactResult(true);
    };

    // Handle bet button click
    const handleBet = () => {
        // Hide previous result popup if visible
        setShowCompactResult(false);

        // Check if user has enough balance
        if (parseFloat(betAmount) > balance) {
            alert('Insufficient balance');
            return;
        }

        // Only deduct bet amount if user has selected numbers
        if (selectedNumbers.length > 0) {
            // Deduct bet amount from balance
            setBalance(prevBalance => {
                return parseFloat((prevBalance - parseFloat(betAmount)).toFixed(2));
            });
        }

        // Generate drawn numbers
        const drawnNumbers = generateDrawNumbers();

        // Start drawing animation
        handleDrawAnimation(drawnNumbers);
    };

    // Close result popup
    const handleCompactResultClose = () => {
        setShowCompactResult(false);
    };

    // Get multiplier display values based on current risk level
    const getMultiplierValues = () => {
        const multipliers = {
            'Classic': ['0.00x', '0.00x', '0.00x', '1.40x', '2.25x', '4.50x', '8.00x', '17.00x', '50.00x', '80.00x', '100.0x'],
            'Low': ['0.00x', '0.00x', '1.10x', '1.20x', '1.30x', '1.80x', '3.50x', '13.00x', '50.00x', '250.0x', '1000x'],
            'Medium': ['0.00x', '0.00x', '0.00x', '1.10x', '1.30x', '1.80x', '3.50x', '13.00x', '50.00x', '250.0x', '1000x'],
            'High': ['0.00x', '0.00x', '0.00x', '0.00x', '3.50x', '8.00x', '13.00x', '83.00x', '500.0x', '800.0x', '1000x']
        };
        
        return multipliers[riskLevel];
    };

    return (
        <div className="keno-app">
            <div className="keno-container">
                <div className="betting-panel">
                    <div className="top-controls">
                        <div className="balance-display">
                            <span>Balance</span>
                            <span className="balance-amount">${balance.toFixed(2)}</span>
                        </div>
                        <button 
                            className={`sound-toggle ${isMuted ? 'muted' : ''}`}
                            onClick={toggleMute}
                            title={isMuted ? "Unmute sounds" : "Mute sounds"}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                    </div>

                    <div className="bet-amount-section">
                        <div className="bet-amount-label">
                            <span>Bet Amount</span>
                            <span className="amount-display">${betAmount}</span>
                        </div>

                        <div className="bet-amount-input">
                            <div className="crypto-input">
                                <span className="crypto-icon">$</span>
                                <input
                                    type="text"
                                    value={betAmount}
                                    onChange={handleBetAmountChange}
                                />
                            </div>
                            <button
                                className="half-button"
                                onClick={() => handleQuickBetAmount('½')}
                            >
                                ½
                            </button>
                            <button
                                className="double-button"
                                onClick={() => handleQuickBetAmount('2x')}
                            >
                                2×
                            </button>
                        </div>
                    </div>

                    <div className="risk-section">
                        <p>Risk</p>
                        <div className="risk-buttons">
                            <button
                                className={`risk-button ${riskLevel === 'Classic' ? 'active' : ''}`}
                                onClick={() => handleRiskChange('Classic')}
                            >
                                Classic
                            </button>
                            <button
                                className={`risk-button ${riskLevel === 'Low' ? 'active' : ''}`}
                                onClick={() => handleRiskChange('Low')}
                            >
                                Low
                            </button>
                            <button
                                className={`risk-button ${riskLevel === 'Medium' ? 'active' : ''}`}
                                onClick={() => handleRiskChange('Medium')}
                            >
                                Medium
                            </button>
                            <button
                                className={`risk-button ${riskLevel === 'High' ? 'active' : ''}`}
                                onClick={() => handleRiskChange('High')}
                            >
                                High
                            </button>
                        </div>
                    </div>


                    <div className="table-action-buttons">
                        <button
                            className="auto-pick-button"
                            onClick={handleAutoPick}
                            disabled={isDrawing}
                        >
                            Auto pick
                        </button>
                        <button
                            className="clear-table-button"
                            onClick={handleClearTable}
                            disabled={isDrawing}
                        >
                            Clear table
                        </button>
                    </div>

                    <button
                        className="bet-button"
                        onClick={handleBet}
                        disabled={isDrawing}
                    >
                        {isDrawing ? "Drawing..." : "Bet"}
                    </button>
                    
                    <div className="spacebar-tip">
                        Press <kbd>Spacebar</kbd> to bet
                    </div>
                </div>

                <div className="keno-board">
                    <div className="numbers-grid">
                        {generateNumbers().map(number => (
                            <button
                                key={number}
                                className={`number-button 
                                    ${selectedNumbers.includes(number) ? 'selected' : ''} 
                                    ${drawnResults.includes(number) && !selectedNumbers.includes(number) ? 'drawn-result' : ''}
                                    ${drawnResults.includes(number) && selectedNumbers.includes(number) ? 'matched' : ''}
                                `}
                                onClick={() => handleNumberSelect(number)}
                                disabled={isDrawing}
                            >
                                {number}
                            </button>
                        ))}
                    </div>

                    <div className="multipliers-section">
                        <div className="multiplier-rows">
                            <div className="multiplier-row">
                                {getMultiplierValues().map((multiplier, index) => (
                                    <div key={index} className="multiplier-cell">
                                        {multiplier}
                                    </div>
                                ))}
                            </div>

                            <div className="multiplier-row">
                                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((multiplier, index) => (
                                    <div key={index} className="multiplier-cell green">
                                        {multiplier} <span className="green-dot">■</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Win Overlay - Only shows on wins */}
            {showCompactResult && (
                <div className="win-overlay" onClick={handleCompactResultClose}>
                    <div className="win-overlay-content">
                        <div className="win-title">WIN!</div>
                        <div className="win-amount">${resultData.winAmount.toFixed(2)}</div>
                        <div className="win-details">
                            <div className="matched-numbers">
                                <span>{resultData.matchedNumbers.length}</span> Tiles
                            </div>
                            <div className="win-multiplier">
                                {getMultiplierValues()[resultData.matchedNumbers.length]}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;