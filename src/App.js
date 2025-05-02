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

    // State for animation speed (now a numeric value)
    const [animationSpeed, setAnimationSpeed] = useState(100);

    // State for PnL tracking
    const [pnlData, setPnlData] = useState([{ game: 0, balance: 10000, change: 0 }]);
    const [showStats, setShowStats] = useState(true);
    const [gameCount, setGameCount] = useState(0);

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

    // State for volume level (0 to 1)
    const [volume, setVolume] = useState(0.5);

    // Reference for mini chart canvas
    const miniChartRef = useRef(null);

    // State for rakeback feature
    const [rakebackBalance, setRakebackBalance] = useState(0);

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
        // Create copies of the refs we'll use in the cleanup
        const audioRefsCopy = {
            draw: [],
            match: [],
            win: null
        };

        // Create multiple instances for draw and match sounds for concurrent playback
        for (let i = 0; i < CONCURRENT_AUDIO_COUNT; i++) {
            audioRefs.current.draw[i] = new Audio('/sounds/draw.mp3');
            audioRefsCopy.draw[i] = audioRefs.current.draw[i];

            audioRefs.current.match[i] = new Audio('/sounds/match2.mp3');
            audioRefsCopy.match[i] = audioRefs.current.match[i];
        }

        // Single instance for win sound (doesn't need to stack)
        audioRefs.current.win = new Audio('/sounds/win.mp3');
        audioRefsCopy.win = audioRefs.current.win;

        // Pre-load all sounds
        // Draw sounds
        audioRefs.current.draw.forEach(audio => {
            audio.load();
            audio.volume = volume;
        });

        // Match sounds
        audioRefs.current.match.forEach(audio => {
            audio.load();
            audio.volume = volume;
        });

        // Win sound
        audioRefs.current.win.load();
        audioRefs.current.win.volume = volume;

        // Cleanup function
        return () => {
            // Clean up draw sounds
            audioRefsCopy.draw.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });

            // Clean up match sounds
            audioRefsCopy.match.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });

            // Clean up win sound
            if (audioRefsCopy.win) {
                audioRefsCopy.win.pause();
                audioRefsCopy.win.currentTime = 0;
            }
        };
    }, []);

    // Update all audio volumes when volume state changes
    useEffect(() => {
        // Update draw sounds volume
        audioRefs.current.draw.forEach(audio => {
            audio.volume = volume;
        });

        // Update match sounds volume
        audioRefs.current.match.forEach(audio => {
            audio.volume = volume;
        });

        // Update win sound volume
        if (audioRefs.current.win) {
            audioRefs.current.win.volume = volume;
        }
    }, [volume]);

    // Draw mini chart when pnlData changes
    useEffect(() => {
        if (!miniChartRef.current || pnlData.length <= 1 || !showStats) return;

        const canvas = miniChartRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Set canvas dimensions
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Find min and max values
        let maxBalance = Math.max(...pnlData.map(item => item.balance));
        let minBalance = Math.min(...pnlData.map(item => item.balance));

        // Add padding to values
        const padding = (maxBalance - minBalance) * 0.1;
        maxBalance += padding;
        minBalance = Math.max(0, minBalance - padding);

        // Draw baseline
        const baselineY = rect.height - ((pnlData[0].balance - minBalance) / (maxBalance - minBalance)) * rect.height;
        ctx.beginPath();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.moveTo(0, baselineY);
        ctx.lineTo(rect.width, baselineY);
        ctx.stroke();

        // Draw chart line
        ctx.beginPath();
        ctx.strokeStyle = '#0f99ff';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        // Draw points
        for (let i = 0; i < pnlData.length; i++) {
            const x = (i / (pnlData.length - 1)) * rect.width;
            const y = rect.height - ((pnlData[i].balance - minBalance) / (maxBalance - minBalance)) * rect.height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw points
        for (let i = 0; i < pnlData.length; i++) {
            const x = (i / (pnlData.length - 1)) * rect.width;
            const y = rect.height - ((pnlData[i].balance - minBalance) / (maxBalance - minBalance)) * rect.height;

            ctx.beginPath();
            ctx.fillStyle = pnlData[i].change >= 0 ? '#10b981' : '#ef4444';
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [pnlData, showStats]);

    // Counter for cycling through audio arrays
    const audioIndexRef = useRef({
        draw: 0,
        match: 0
    });

    // Function to play sound that supports concurrent playback
    const playSound = (soundName) => {
        if (volume <= 0.02) return; // Consider muted if volume is very low

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

    // Toggle stats visibility
    const toggleStats = () => {
        setShowStats(!showStats);
    };

    // Handle claiming rakeback
    const handleClaimRakeback = () => {
        if (rakebackBalance > 0) {
            // Add rakeback to main balance
            setBalance(prevBalance => parseFloat((prevBalance + rakebackBalance).toFixed(2)));

            // Reset rakeback balance
            setRakebackBalance(0);

            // Show a small notification (could be enhanced)
            alert(`Rakeback of $${rakebackBalance.toFixed(2)} has been added to your balance!`);
        }
    };

    // Handle bet button click - defined early to use in useEffect
    const handleBet = React.useCallback(() => {
        // Hide previous result popup if visible
        setShowCompactResult(false);

        // Check if user has enough balance
        if (parseFloat(betAmount) > balance) {
            alert('Insufficient balance');
            return;
        }

        // Track game number
        const newGameCount = gameCount + 1;
        setGameCount(newGameCount);

        // Only deduct bet amount if user has selected numbers
        if (selectedNumbers.length > 0) {
            // Deduct bet amount from balance
            setBalance(prevBalance => {
                return parseFloat((prevBalance - parseFloat(betAmount)).toFixed(2));
            });

            // Add to rakeback balance (0.02% of bet amount)
            const rakeAmount = parseFloat(betAmount) * 0.0002;
            setRakebackBalance(prevRakeback => {
                return parseFloat((prevRakeback + rakeAmount).toFixed(2));
            });
        }

        // Generate drawn numbers
        const drawnNumbers = generateDrawNumbers();

        // Start drawing animation
        handleDrawAnimation(drawnNumbers);
    }, [gameCount, betAmount, balance, selectedNumbers]);

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
    }, [isDrawing, showCompactResult, selectedNumbers, betAmount, balance, handleBet]);

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

        // Clear previously drawn numbers
        setDrawnResults([]);

        // Reset draw count
        setDrawCount(0);

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

    // Updated handleClearTable function
    const handleClearTable = () => {
        // Clear selected numbers
        setSelectedNumbers([]);

        // Clear previously drawn numbers
        setDrawnResults([]);

        // Reset draw count
        setDrawCount(0);
    };

    // Handle risk level change
    const handleRiskChange = (level) => {
        setRiskLevel(level);
    };

    // Handle volume change
    const handleVolumeChange = (e) => {
        setVolume(parseFloat(e.target.value));
    };

    // Handle animation speed change
    const handleSpeedChange = (e) => {
        setAnimationSpeed(parseInt(e.target.value));
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
            'Medium': [0, 0, 0, 1.6, 2.0, 4.0, 7.0, 26.0, 100.0, 500.0, 1000.0],
            'High': [0, 0, 0, 0, 3.5, 8.0, 13.0, 63.0, 500.0, 800.0, 1000.0]
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

    // Handle the drawing animation with adjustable speed
    const handleDrawAnimation = (drawnNumbers) => {
        setIsDrawing(true);
        setDrawnResults([]);
        setDrawCount(0);

        // Use the numeric animation speed value
        const delay = animationSpeed;

        // Update PnL data with bet deduction if no win occurs
        const matchedNumbers = selectedNumbers.filter(num => drawnNumbers.includes(num));
        const winAmount = calculateWinnings(matchedNumbers);

        // If this will be a loss (no win popup will be shown), update PnL data
        if (winAmount === 0 && selectedNumbers.length > 0) {
            setPnlData(prevData => [
                ...prevData,
                {
                    game: gameCount,
                    balance: balance - parseFloat(betAmount),
                    change: -parseFloat(betAmount)
                }
            ]);
        }

        // Animate drawing one number at a time
        drawnNumbers.forEach((number, index) => {
            setTimeout(() => {
                // Increment draw count
                setDrawCount(index + 1);

                // Add to drawn results
                setDrawnResults(prev => [...prev, number]);

                // CHANGED SOUND MECHANIC: Always play draw sound
                playSound('draw');

                // If the drawn number matches a selected number, also play match sound
                if (selectedNumbers.includes(number)) {
                    playSound('match');
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
            }, delay * (index + 1)); // Use the dynamic delay for adjustable speed
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
            const newBalance = parseFloat((prevBalance + winAmount).toFixed(2));

            // Update PnL data with the new game result
            setPnlData(prevData => [
                ...prevData,
                {
                    game: gameCount,
                    balance: newBalance,
                    change: winAmount - parseFloat(betAmount)
                }
            ]);

            return newBalance;
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

    // Close result popup
    const handleCompactResultClose = () => {
        setShowCompactResult(false);
    };

    // Get multiplier display values based on current risk level
    const getMultiplierValues = () => {
        const multipliers = {
            'Classic': ['0.00x', '0.00x', '0.00x', '1.40x', '2.25x', '4.50x', '8.00x', '17.00x', '50.00x', '80.00x', '100.0x'],
            'Low': ['0.00x', '0.00x', '1.10x', '1.20x', '1.30x', '1.80x', '3.50x', '13.00x', '50.00x', '250.0x', '1000x'],
            'Medium': ['0.00x', '0.00x', '0.00x', '1.60x', '2.00x', '4.00x', '7.00x', '26.00x', '100.00x', '500.0x', '1000x'],
            'High': ['0.00x', '0.00x', '0.00x', '0.00x', '3.50x', '8.00x', '13.00x', '63.00x', '500.0x', '800.0x', '1000x']
        };

        return multipliers[riskLevel];
    };

    // Calculate PnL stats
    const getPnlSummary = () => {
        const startingBalance = pnlData[0].balance;
        const netPnl = balance - startingBalance;
        const isPositive = netPnl >= 0;

        return {
            gamesPlayed: gameCount,
            startingBalance: startingBalance,
            currentBalance: balance,
            netPnl: netPnl,
            isPositive: isPositive
        };
    };

    const pnlSummary = getPnlSummary();

    return (
        <div className="keno-app">
            <div className="keno-container">
                <div className="betting-panel">
                    <div className="top-controls">
                        <div className="balance-display">
                            <span className="balance-label">Balance</span>
                            <span className="balance-amount">${balance.toFixed(2)}</span>
                        </div>
                        <div className="control-buttons">
                            <button
                                className={`stats-toggle ${showStats ? 'active' : ''}`}
                                onClick={toggleStats}
                                title="Show/Hide PnL Stats"
                            >
                                📊
                            </button>
                        </div>
                    </div>

                    {/* Rakeback Display */}
                    <div className="rakeback-display">
                        <div className="rakeback-info">
                            <span className="rakeback-label">Rakeback</span>
                            <span className="rakeback-amount">${rakebackBalance.toFixed(2)}</span>
                        </div>
                        <button
                            className="claim-rakeback-button"
                            onClick={handleClaimRakeback}
                            disabled={rakebackBalance <= 0}
                        >
                            Claim
                        </button>
                    </div>

                    {/* Volume Slider */}
                    <div className="volume-control-section">
                        <div className="volume-label">
                            <span>Volume</span>
                            <span className="volume-value">{Math.round(volume * 100)}%</span>
                        </div>
                        <div className="volume-slider-container">
                            <span className="volume-icon">🔈</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                            />
                            <span className="volume-icon">🔊</span>
                        </div>
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

                    {/* Draw Speed Slider - reversed so right is faster */}
                    <div className="speed-section">
                        <div className="speed-label">
                            <span>Draw Speed</span>
                            <span className="speed-value">{animationSpeed} ms</span>
                        </div>
                        <div className="speed-slider-container">
                            <span className="speed-icon">🐢</span>
                            <input
                                type="range"
                                min="70"
                                max="200"
                                value={270 - animationSpeed} // Reverse the value - 270-(70 to 200) gives 200 to 70
                                onChange={(e) => setAnimationSpeed(270 - parseInt(e.target.value))} // Reverse the input
                                className="speed-slider"
                            />
                            <span className="speed-icon">🐇</span>
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

                    {showStats && (
                        <div className="stats-section">
                            <div className="stats-header">
                                <span>Statistics</span>
                            </div>
                            <div className="stats-content">
                                <div className="stats-summary">
                                    <div className="stat-row">
                                        <div className="stat-item">
                                            <span className="stat-label">Games</span>
                                            <span className="stat-value">{pnlSummary.gamesPlayed}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">P/L</span>
                                            <span className={`stat-value ${pnlSummary.isPositive ? 'positive' : 'negative'}`}>
                                                ${Math.abs(pnlSummary.netPnl).toFixed(2)}
                                                {pnlSummary.isPositive ? '↑' : '↓'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mini-chart-container">
                                    <canvas ref={miniChartRef} className="mini-chart" />
                                </div>
                            </div>
                        </div>
                    )}
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